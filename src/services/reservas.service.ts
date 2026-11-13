import { isISO8601 } from 'class-validator';
import { cubrePeriodo } from './horario.js';
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
        if (esConflictoSerializacion) throw new ConflictException('La disponibilidad ha cambiado. Vuelve a comprobar el horario.');
        throw err;
      }
    }
    // No debería llegar aquí, pero TypeScript lo requiere
    throw new Error("La operación no pudo completarse tras varios intentos. Inténtalo de nuevo.");
  }

  private async comprobarPeriodo(tx: Prisma.TransactionClient, plaza: {id:number; disponible:boolean; horario?:unknown}, fechaInicio:string, fechaFin:string, excluirId?: number) {
      if (!plaza.disponible) {
        throw new BadRequestException("La plaza no se encuentra disponible para reservas");
      }

      if (![fechaInicio, fechaFin].every(valor => typeof valor === 'string' && isISO8601(valor, {strict:true, strictSeparator:true}) && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor))) {
        throw new BadRequestException('Indica fechas y horas con su zona horaria.');
      }
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      if (!Number.isFinite(+inicio) || !Number.isFinite(+fin) || inicio >= fin) {
        throw new BadRequestException("La fecha de inicio debe ser estrictamente anterior a la fecha de fin");
      }

      if (+inicio < Date.now()) throw new BadRequestException("No puedes reservar una fecha pasada.");
      if (!cubrePeriodo(plaza.horario, inicio, fin)) throw new BadRequestException("El propietario no ofrece la plaza durante ese periodo.");

      // Comprobación de solapamiento de fechas con reservas activas (PENDIENTE o CONFIRMADA)
      const reservaSolapada = await tx.reserva.findFirst({
        where: {
          plazaId: plaza.id,
          ...(excluirId !== undefined && { id: { not: excluirId } }),
          estado: { in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA] },
          fechaInicio: { lt: fin },
          fechaFin: { gt: inicio },
        },
      });

      if (reservaSolapada) {
        throw new ConflictException("La plaza ya cuenta con una reserva activa en las fechas seleccionadas");
      }

    return { inicio, fin };
  }

  async consultar(plazaId:number, inicio:string, fin:string) {
    const plaza = await this.prisma.plaza.findUnique({ where: {id:plazaId} });
    if (!plaza) throw new NotFoundException('Plaza no encontrada');
    await this.comprobarPeriodo(this.prisma, plaza, inicio, fin);
    return { disponible: true };
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

      // Validar vehículo si se proporciona
      if (dto.vehiculoId !== undefined) {
        const vehiculo = await tx.vehiculo.findUnique({ where: { id: dto.vehiculoId } });
        if (!vehiculo) {
          throw new NotFoundException(`El vehículo con ID ${dto.vehiculoId} no existe`);
        }
        if (vehiculo.usuarioId !== dto.usuarioId) {
          throw new BadRequestException("El vehículo no pertenece al usuario que realiza la reserva");
        }
      }

      const { inicio, fin } = await this.comprobarPeriodo(tx, plaza, dto.fechaInicio, dto.fechaFin);

      // Calcular precio total con precisión decimal
      const duracionMs = fin.getTime() - inicio.getTime();
      const duracionHoras = duracionMs / (1000 * 60 * 60);
      const precioTotal = Math.round(plaza.precioHora * duracionHoras * 100) / 100;

      // Si el conductor indicó el precio mostrado previamente y este ha variado, avisar para su revisión
      if (dto.precioTotal !== undefined && Math.abs(dto.precioTotal - precioTotal) > 0.009) {
        throw new ConflictException(
          `El precio de la plaza ha cambiado. El nuevo precio total es de ${precioTotal.toFixed(2)} €. Por favor, revísalo antes de solicitar.`,
        );
      }

      return tx.reserva.create({
        data: {
          usuarioId: dto.usuarioId,
          plazaId: dto.plazaId,
          vehiculoId: dto.vehiculoId ?? null,
          fechaInicio: inicio,
          fechaFin: fin,
          estado: EstadoReserva.PENDIENTE,
          precioTotal,
        },
        include: {
          usuario: {
            select: usuarioSelectPublico,
          },
          plaza: true,
          vehiculo: true,
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
          vehiculo: true,
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
          vehiculo: true,
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
        vehiculo: true,
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

      if (reserva.estado === EstadoReserva.RECHAZADA) {
        throw new BadRequestException("No se puede modificar una reserva que ya ha sido rechazada");
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

        // Respuesta a solicitud (Aceptar / Rechazar): Solo el propietario mientras esté PENDIENTE
        if (nuevoEstado === EstadoReserva.CONFIRMADA || nuevoEstado === EstadoReserva.RECHAZADA) {
          if (!esPropietario) {
            throw new ForbiddenException("Solo el propietario de la plaza puede responder a la solicitud");
          }
          if (reserva.estado !== EstadoReserva.PENDIENTE) {
            throw new BadRequestException("Solo se pueden responder solicitudes en estado PENDIENTE");
          }
        } else if (nuevoEstado === EstadoReserva.CANCELADA) {
          if (!esConductor && !esPropietario) {
            throw new ForbiddenException("No tienes permiso para cancelar esta reserva");
          }
        } else {
          throw new ForbiddenException("Transición de estado no permitida para tu rol");
        }
      }

      if (nuevoEstado === EstadoReserva.CONFIRMADA) {
        await this.comprobarPeriodo(tx, reserva.plaza, reserva.fechaInicio.toISOString(), reserva.fechaFin.toISOString(), id);
      }

      return tx.reserva.update({
        where: { id },
        data: { estado: nuevoEstado },
        include: {
          usuario: {
            select: usuarioSelectPublico,
          },
          plaza: true,
          vehiculo: true,
        },
      });
    });
  }

  async actualizarEstadoComoAdmin(id: number, estado: EstadoReserva) {
    return this.ejecutarTransaccion(async tx => {
      const reserva = await tx.reserva.findUnique({where:{id}, include:{plaza:true}});
      if (!reserva) throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
      if (!Object.values(EstadoReserva).includes(estado)) throw new BadRequestException('Estado de reserva inválido');
      const pasaAActiva = estado === EstadoReserva.PENDIENTE || estado === EstadoReserva.CONFIRMADA;
      const estabaActiva = reserva.estado === EstadoReserva.PENDIENTE || reserva.estado === EstadoReserva.CONFIRMADA;
      if (pasaAActiva && (!estabaActiva || estado === EstadoReserva.CONFIRMADA)) {
        await this.comprobarPeriodo(tx, reserva.plaza, reserva.fechaInicio.toISOString(), reserva.fechaFin.toISOString(), id);
      }
      return tx.reserva.update({where:{id},data:{estado},include:{usuario:{select:usuarioSelectPublico},plaza:true,vehiculo:true}});
    });
  }

  async eliminarComoAdmin(id: number) {
    await this.obtenerPorId(id);

    return this.prisma.reserva.delete({
      where: { id },
    });
  }
}
