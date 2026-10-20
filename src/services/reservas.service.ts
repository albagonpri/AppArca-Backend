import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EstadoReserva, Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { CrearReservaDto } from "../dto/reservas/crear-reserva.dto.js";
import { usuarioSelectPublico } from "../models/usuario.model.js";
import { PaginacionDto, RespuestaPaginada, crearRespuestaPaginada } from "../dto/comun/paginacion.dto.js";

@Injectable()
export class ReservasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ejecuta una operación dentro de una transacción SERIALIZABLE para prevenir
   * condiciones de carrera en patrones check-then-act (solapamiento de reservas).
   * PostgreSQL usa SSI (Serializable Snapshot Isolation) que detecta conflictos sin bloqueos.
   * En caso de conflicto de serialización (P2034), reintenta hasta 5 veces.
   */
  private async ejecutarTransaccion<T>(
    operacion: (tx: Omit<PrismaService, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>,
  ): Promise<T> {
    if (typeof (this.prisma as any).$transaction !== "function") {
      // Entorno de test sin $transaction real (mock): ejecutar directamente
      return operacion(this.prisma as any);
    }

    const MAX_REINTENTOS = 5;
    for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
      try {
        return await (this.prisma as any).$transaction(operacion, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (err: any) {
        // P2034 = serialization failure / deadlock — PostgreSQL pide reintento
        const esConflictoSerializacion =
          err?.code === "P2034" ||
          err?.message?.includes("could not serialize access") ||
          err?.message?.includes("deadlock detected");

        if (esConflictoSerializacion && intento < MAX_REINTENTOS) {
          // Espera exponencial mínima antes de reintentar (10ms, 20ms, 40ms...)
          await new Promise((resolve) => setTimeout(resolve, 10 * intento));
          continue;
        }
        throw err;
      }
    }
    // No debería llegar aquí, pero TypeScript lo requiere
    throw new Error("La operación no pudo completarse tras varios intentos. Inténtalo de nuevo.");
  }

  async crear(dto: CrearReservaDto) {
    return this.ejecutarTransaccion(async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: { id: dto.usuarioId },
      });

      if (!usuario) {
        throw new NotFoundException(`El usuario con ID ${dto.usuarioId} no existe`);
      }

      const plaza = await tx.plaza.findUnique({
        where: { id: dto.plazaId },
      });

      if (!plaza) {
        throw new NotFoundException(`La plaza con ID ${dto.plazaId} no existe`);
      }

      if (plaza.propietarioId === dto.usuarioId) {
        throw new BadRequestException("No puedes reservar tu propia plaza de aparcamiento");
      }

      if (!plaza.disponible) {
        throw new BadRequestException("La plaza no se encuentra disponible para reservas");
      }

      const inicio = new Date(dto.fechaInicio);
      const fin = new Date(dto.fechaFin);

      if (inicio >= fin) {
        throw new BadRequestException("La fecha de inicio debe ser estrictamente anterior a la fecha de fin");
      }

      // Comprobación de solapamiento de fechas con reservas activas (PENDIENTE o CONFIRMADA)
      const reservaSolapada = await tx.reserva.findFirst({
        where: {
          plazaId: dto.plazaId,
          estado: { in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA] },
          fechaInicio: { lt: fin },
          fechaFin: { gt: inicio },
        },
      });

      if (reservaSolapada) {
        throw new ConflictException("La plaza ya cuenta con una reserva activa en las fechas seleccionadas");
      }

      return tx.reserva.create({
        data: {
          usuarioId: dto.usuarioId,
          plazaId: dto.plazaId,
          fechaInicio: inicio,
          fechaFin: fin,
          estado: EstadoReserva.PENDIENTE,
        },
        include: {
          usuario: {
            select: usuarioSelectPublico,
          },
          plaza: true,
        },
      });
    });
  }

  /**
   * Obtiene las reservas de un usuario con paginación real en base de datos.
   * Filtra estrictamente por propiedad: reservas realizadas (propias) o reservas recibidas en sus plazas.
   */
  async obtenerUsuarioReservas(
    usuarioId: number,
    tipo: "propias" | "recibidas" = "propias",
    paginacion: PaginacionDto = new PaginacionDto(),
    estado?: EstadoReserva,
  ): Promise<RespuestaPaginada<any>> {
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const where: any = {};
    if (tipo === "recibidas") {
      where.plaza = { propietarioId: usuarioId };
    } else {
      where.usuarioId = usuarioId;
    }

    if (estado && Object.values(EstadoReserva).includes(estado)) {
      where.estado = estado;
    }

    const [data, total] = await Promise.all([
      this.prisma.reserva.findMany({
        where,
        skip,
        take,
        include: {
          usuario: {
            select: usuarioSelectPublico,
          },
          plaza: true,
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.reserva.count({ where }),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }

  /**
   * Listado administrativo global para Administradores.
   */
  async obtenerTodas(
    paginacion: PaginacionDto = new PaginacionDto(),
    estado?: EstadoReserva,
  ): Promise<RespuestaPaginada<any>> {
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const where: any = {};
    if (estado && Object.values(EstadoReserva).includes(estado)) {
      where.estado = estado;
    }

    const [data, total] = await Promise.all([
      this.prisma.reserva.findMany({
        where,
        skip,
        take,
        include: {
          usuario: {
            select: usuarioSelectPublico,
          },
          plaza: true,
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.reserva.count({ where }),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }

  /**
   * Obtiene detalle de reserva verificando autorización por propietario, conductor o admin.
   */
  async obtenerPorId(id: number, usuarioId?: number, esAdmin?: boolean) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        usuario: {
          select: usuarioSelectPublico,
        },
        plaza: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    if (
      usuarioId !== undefined &&
      !esAdmin &&
      reserva.usuarioId !== usuarioId &&
      reserva.plaza.propietarioId !== usuarioId
    ) {
      throw new ForbiddenException("No tienes permiso para consultar esta reserva");
    }

    return reserva;
  }

  /**
   * Actualiza el estado de una reserva según permisos de rol o propiedad:
   * - Conductor: solo puede cancelar su propia reserva.
   * - Propietario de la plaza: puede confirmar o cancelar/rechazar la reserva.
   * - Administrador: puede aplicar cualquier transición de estado.
   * - Reservas ya canceladas o completadas no pueden volver a modificarse.
   * - Al confirmar, previene concurrencia de reservas incompatibles mediante transacción atómica.
   */
  async actualizarEstadoPorUsuario(
    id: number,
    usuarioId: number,
    esAdmin: boolean,
    nuevoEstado: EstadoReserva,
  ) {
    return this.ejecutarTransaccion(async (tx) => {
      const reserva = await tx.reserva.findUnique({
        where: { id },
        include: { plaza: true },
      });

      if (!reserva) {
        throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
      }

      if (!Object.values(EstadoReserva).includes(nuevoEstado)) {
        throw new BadRequestException(`Estado de reserva inválido: ${nuevoEstado}`);
      }

      if (reserva.estado === EstadoReserva.CANCELADA) {
        throw new BadRequestException("No se puede modificar una reserva que ya ha sido cancelada");
      }

      if (reserva.estado === EstadoReserva.COMPLETADA) {
        throw new BadRequestException("No se puede modificar una reserva ya completada");
      }

      if (!esAdmin) {
        const esConductor = reserva.usuarioId === usuarioId;
        const esPropietario = reserva.plaza.propietarioId === usuarioId;

        if (!esConductor && !esPropietario) {
          throw new ForbiddenException("No tienes permiso para gestionar esta reserva");
        }

        if (esConductor && !esPropietario) {
          if (nuevoEstado !== EstadoReserva.CANCELADA) {
            throw new ForbiddenException("Como conductor solo tienes permiso para cancelar tu reserva");
          }
        } else if (esPropietario) {
          if (
            nuevoEstado !== EstadoReserva.CONFIRMADA &&
            nuevoEstado !== EstadoReserva.CANCELADA
          ) {
            throw new ForbiddenException("El propietario solo puede confirmar o cancelar la reserva");
          }
        }
      }

      // Prevenir solapamiento concurrente de reservas CONFIRMADAS
      if (nuevoEstado === EstadoReserva.CONFIRMADA) {
        const reservaConfirmadaSolapada = await tx.reserva.findFirst({
          where: {
            plazaId: reserva.plazaId,
            id: { not: reserva.id },
            estado: EstadoReserva.CONFIRMADA,
            fechaInicio: { lt: reserva.fechaFin },
            fechaFin: { gt: reserva.fechaInicio },
          },
        });

        if (reservaConfirmadaSolapada) {
          throw new ConflictException(
            "No se puede confirmar la reserva: la plaza ya cuenta con otra reserva confirmada en las fechas seleccionadas",
          );
        }
      }

      return tx.reserva.update({
        where: { id },
        data: { estado: nuevoEstado },
        include: {
          usuario: {
            select: usuarioSelectPublico,
          },
          plaza: true,
        },
      });
    });
  }

  async actualizarEstadoComoAdmin(id: number, estado: EstadoReserva) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      include: { plaza: true },
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    if (!Object.values(EstadoReserva).includes(estado)) {
      throw new BadRequestException(`Estado de reserva inválido: ${estado}`);
    }

    if (estado === EstadoReserva.CONFIRMADA) {
      const solapada = await this.prisma.reserva.findFirst({
        where: {
          plazaId: reserva.plazaId,
          id: { not: id },
          estado: EstadoReserva.CONFIRMADA,
          fechaInicio: { lt: reserva.fechaFin },
          fechaFin: { gt: reserva.fechaInicio },
        },
      });

      if (solapada) {
        throw new ConflictException(
          "No se puede confirmar la reserva: la plaza ya cuenta con otra reserva confirmada en las fechas seleccionadas",
        );
      }
    }

    return this.prisma.reserva.update({
      where: { id },
      data: { estado },
      include: {
        usuario: {
          select: usuarioSelectPublico,
        },
        plaza: true,
      },
    });
  }

  async eliminarComoAdmin(id: number) {
    await this.obtenerPorId(id);

    return this.prisma.reserva.delete({
      where: { id },
    });
  }
}
