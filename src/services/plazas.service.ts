import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DificultadEntrada } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { CrearPlazaDto } from "../dto/plazas/crear-plaza.dto.js";
import { ActualizarPlazaDto } from "../dto/plazas/actualizar-plaza.dto.js";
import { usuarioSelectPublico, propietarioSelectPublico } from "../models/usuario.model.js";
import { GeocodingService } from "./geocoding.service.js";
import { PaginacionDto, RespuestaPaginada, crearRespuestaPaginada } from "../dto/comun/paginacion.dto.js";

/**
 * Valida que, si se proporciona una de las coordenadas, se proporcione también la otra,
 * y que ambas estén dentro de los límites de España (incluyendo Canarias).
 */
function validarCoordenadas(latitud?: number, longitud?: number): void {
  const tieneLatitud = latitud !== undefined && latitud !== null;
  const tieneLongitud = longitud !== undefined && longitud !== null;

  if (tieneLatitud !== tieneLongitud) {
    throw new BadRequestException(
      "Latitud y longitud deben proporcionarse conjuntamente.",
    );
  }

  if (tieneLatitud && tieneLongitud) {
    const lat = latitud as number;
    const lng = longitud as number;
    const enEspana =
      lat >= 27.0 && lat <= 44.5 && lng >= -18.5 && lng <= 5.0;
    if (!enEspana) {
      throw new BadRequestException(
        "Las coordenadas indicadas están fuera del territorio español. Verifica la ubicación en el mapa.",
      );
    }
  }
}

function construirDireccionLegible(datos: {
  calle: string;
  numero: string;
  codigoPostal: string;
  ciudad: string;
  provincia?: string;
}): string {
  const calleLimpia = datos.calle.trim();
  const numeroLimpio = datos.numero.trim();
  const cpLimpio = datos.codigoPostal.trim();
  const ciudadLimpia = datos.ciudad.trim();
  const provinciaLimpia = datos.provincia?.trim();

  const via = `${calleLimpia} ${numeroLimpio}`;
  const localidad = `${cpLimpio} ${ciudadLimpia}`;
  return provinciaLimpia
    ? `${via}, ${localidad}, ${provinciaLimpia}`
    : `${via}, ${localidad}`;
}

@Injectable()
export class PlazasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async crear(usuarioIdOProp: number | CrearPlazaDto, dtoParam?: CrearPlazaDto) {
    let propietarioId: number;
    let dto: CrearPlazaDto;

    if (typeof usuarioIdOProp === "number") {
      propietarioId = usuarioIdOProp;
      dto = dtoParam!;
    } else {
      dto = usuarioIdOProp;
      propietarioId = dto.propietarioId!;
    }

    if (!propietarioId) {
      throw new BadRequestException("El ID del propietario es requerido");
    }

    const propietario = await this.prisma.usuario.findUnique({
      where: { id: propietarioId },
    });

    if (!propietario) {
      throw new NotFoundException(
        `El usuario propietario con ID ${propietarioId} no existe`,
      );
    }

    // Validar coherencia de coordenadas si se aportan
    validarCoordenadas(dto.latitud, dto.longitud);

    let finalLatitud: number;
    let finalLongitud: number;

    if (dto.latitud !== undefined && dto.longitud !== undefined) {
      // Coordenadas confirmadas por el usuario desde el mapa: se usan directamente
      finalLatitud = dto.latitud;
      finalLongitud = dto.longitud;
    } else {
      // Sin coordenadas: geocodificar automáticamente con CartoCiudad
      const coords = await this.geocodingService.geocodificar({
        calle: dto.calle,
        numero: dto.numero,
        codigoPostal: dto.codigoPostal,
        ciudad: dto.ciudad,
        provincia: dto.provincia,
      });
      finalLatitud = coords.latitud;
      finalLongitud = coords.longitud;
    }

    // Construcción de la dirección legible exclusivamente en backend
    const direccionLegible = construirDireccionLegible({
      calle: dto.calle,
      numero: dto.numero,
      codigoPostal: dto.codigoPostal,
      ciudad: dto.ciudad,
      provincia: dto.provincia,
    });

    const entradaDificil = dto.entradaDificil ?? false;
    let dificultadesEntrada: DificultadEntrada[] = [];
    let descripcionEntrada: string | null = null;

    if (!entradaDificil) {
      dificultadesEntrada = [];
      descripcionEntrada = null;
    } else {
      const dificultadesUnicas = dto.dificultadesEntrada
        ? [...new Set(dto.dificultadesEntrada)]
        : [];

      if (dificultadesUnicas.length === 0) {
        throw new BadRequestException(
          "Debe seleccionar al menos una dificultad de entrada si la casilla de entrada difícil está marcada.",
        );
      }

      dificultadesEntrada = dificultadesUnicas;

      if (dificultadesUnicas.includes(DificultadEntrada.OTRA)) {
        const desc = dto.descripcionEntrada?.trim();
        if (!desc) {
          throw new BadRequestException(
            'Debes describir la dificultad de entrada al seleccionar "Otra dificultad".',
          );
        }
        descripcionEntrada = desc;
      } else {
        descripcionEntrada = null;
      }
    }

    return this.prisma.plaza.create({
      data: {
        propietarioId,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        direccion: direccionLegible,
        latitud: finalLatitud,
        longitud: finalLongitud,
        precioHora: dto.precioHora,
        largo: dto.largo,
        ancho: dto.ancho,
        entradaDificil,
        descripcionEntrada,
        dificultadesEntrada,
        tieneCamaras: dto.tieneCamaras ?? false,
      },
      include: {
        propietario: {
          select: usuarioSelectPublico,
        },
      },
    });
  }

  async obtenerTodas(paginacion: PaginacionDto = new PaginacionDto()): Promise<RespuestaPaginada<any>> {
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const [data, total] = await Promise.all([
      this.prisma.plaza.findMany({
        skip,
        take,
        include: {
          propietario: {
            select: propietarioSelectPublico,
          },
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.plaza.count(),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }

  async obtenerPorId(id: number) {
    const plaza = await this.prisma.plaza.findUnique({
      where: { id },
      include: {
        propietario: {
          select: propietarioSelectPublico,
        },
      },
    });

    if (!plaza) {
      throw new NotFoundException(`Plaza con ID ${id} no encontrada`);
    }

    return plaza;
  }

  async obtenerMisPlazas(
    usuarioId: number,
    paginacion: PaginacionDto = new PaginacionDto(),
  ): Promise<RespuestaPaginada<any>> {
    const where = { propietarioId: usuarioId };
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const [data, total] = await Promise.all([
      this.prisma.plaza.findMany({
        where,
        skip,
        take,
        include: {
          propietario: {
            select: usuarioSelectPublico,
          },
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.plaza.count({ where }),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }

  async actualizar(usuarioId: number, id: number, dto: ActualizarPlazaDto) {
    const plaza = await this.obtenerPorId(id);

    if (plaza.propietarioId !== usuarioId) {
      throw new ForbiddenException(
        "No tienes permiso para modificar esta plaza",
      );
    }

    return this.actualizarComoAdmin(id, dto, plaza);
  }

  async actualizarComoAdmin(id: number, dto: ActualizarPlazaDto, plazaPrevia?: any) {
    const plaza = plazaPrevia || (await this.obtenerPorId(id));

    // Validación conjunta de dirección si se envía cualquier campo de ubicación
    const intentaModificarDireccion =
      dto.calle !== undefined ||
      dto.numero !== undefined ||
      dto.codigoPostal !== undefined ||
      dto.ciudad !== undefined ||
      dto.provincia !== undefined;

    let nuevaDireccion = plaza.direccion;
    let nuevaLatitud = plaza.latitud;
    let nuevaLongitud = plaza.longitud;

    if (intentaModificarDireccion) {
      if (
        !dto.calle?.trim() ||
        !dto.numero?.trim() ||
        !dto.codigoPostal?.trim() ||
        !dto.ciudad?.trim()
      ) {
        throw new BadRequestException(
          "Para modificar la dirección deben proporcionarse todos los datos necesarios: calle, número, código postal y municipio.",
        );
      }

      // Validar coherencia de coordenadas si se aportan
      validarCoordenadas(dto.latitud, dto.longitud);

      if (dto.latitud !== undefined && dto.longitud !== undefined) {
        // Coordenadas confirmadas por el usuario desde el mapa: se usan directamente
        nuevaLatitud = dto.latitud;
        nuevaLongitud = dto.longitud;
      } else {
        // Sin coordenadas confirmadas: geocodificar automáticamente
        const coords = await this.geocodingService.geocodificar({
          calle: dto.calle,
          numero: dto.numero,
          codigoPostal: dto.codigoPostal,
          ciudad: dto.ciudad,
          provincia: dto.provincia,
        });
        nuevaLatitud = coords.latitud;
        nuevaLongitud = coords.longitud;
      }

      nuevaDireccion = construirDireccionLegible({
        calle: dto.calle,
        numero: dto.numero,
        codigoPostal: dto.codigoPostal,
        ciudad: dto.ciudad,
        provincia: dto.provincia,
      });
    }

    // Coherencia de entradaDificil, dificultadesEntrada y descripcionEntrada
    const finalEntradaDificil =
      dto.entradaDificil !== undefined
        ? dto.entradaDificil
        : plaza.entradaDificil;

    let finalDificultades: DificultadEntrada[];
    let finalDescripcion: string | null;

    if (!finalEntradaDificil) {
      finalDificultades = [];
      finalDescripcion = null;
    } else {
      const rawDificultades =
        dto.dificultadesEntrada !== undefined
          ? dto.dificultadesEntrada
          : plaza.dificultadesEntrada;

      const dificultadesUnicas = rawDificultades
        ? [...new Set(rawDificultades)]
        : [];

      if (dificultadesUnicas.length === 0) {
        throw new BadRequestException(
          "Debe seleccionar al menos una dificultad de entrada si la casilla de entrada difícil está marcada.",
        );
      }

      finalDificultades = dificultadesUnicas as DificultadEntrada[];

      if (dificultadesUnicas.includes(DificultadEntrada.OTRA)) {
        const rawDesc =
          dto.descripcionEntrada !== undefined
            ? dto.descripcionEntrada
            : plaza.descripcionEntrada;
        const descLimpia = rawDesc?.trim();

        if (!descLimpia) {
          throw new BadRequestException(
            'Debes describir la dificultad de entrada al seleccionar "Otra dificultad".',
          );
        }
        finalDescripcion = descLimpia;
      } else {
        finalDescripcion = null;
      }
    }

    return this.prisma.plaza.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.precioHora !== undefined && { precioHora: dto.precioHora }),
        ...(dto.largo !== undefined && { largo: dto.largo }),
        ...(dto.ancho !== undefined && { ancho: dto.ancho }),
        ...(dto.disponible !== undefined && { disponible: dto.disponible }),
        ...(dto.tieneCamaras !== undefined && {
          tieneCamaras: dto.tieneCamaras,
        }),
        entradaDificil: finalEntradaDificil,
        dificultadesEntrada: finalDificultades,
        descripcionEntrada: finalDescripcion,
        ...(intentaModificarDireccion && {
          direccion: nuevaDireccion,
          latitud: nuevaLatitud,
          longitud: nuevaLongitud,
        }),
      },
      include: {
        propietario: {
          select: usuarioSelectPublico,
        },
      },
    });
  }

  async eliminar(usuarioId: number, id: number) {
    const plaza = await this.obtenerPorId(id);

    if (plaza.propietarioId !== usuarioId) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar esta plaza",
      );
    }

    return this.eliminarComoAdmin(id);
  }

  async eliminarComoAdmin(id: number) {
    await this.obtenerPorId(id);
    return this.prisma.plaza.delete({
      where: { id },
    });
  }

    async obtenerReservas(
    plazaId: number,
    usuarioId?: number,
    esAdmin?: boolean,
    paginacion: PaginacionDto = new PaginacionDto(),
  ): Promise<RespuestaPaginada<any>> {
    const plaza = await this.obtenerPorId(plazaId);

    if (usuarioId !== undefined && !esAdmin && plaza.propietarioId !== usuarioId) {
      throw new ForbiddenException(
        "No tienes permiso para consultar las reservas de esta plaza",
      );
    }

    const where = { plazaId };
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const [data, total] = await Promise.all([
      this.prisma.reserva.findMany({
        where,
        skip,
        take,
        include: {
          usuario: {
            select: usuarioSelectPublico,
          },
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.reserva.count({ where }),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }
}
