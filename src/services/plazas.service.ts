import { comprobarConfiguracion, cubrePeriodo } from './horario.js';
import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";
import type { Response } from "express";
import { DificultadEntrada, Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { CrearPlazaDto } from "../dto/plazas/crear-plaza.dto.js";
import { ActualizarPlazaDto } from "../dto/plazas/actualizar-plaza.dto.js";
import { FiltrarPlazasDto } from "../dto/plazas/filtrar-plazas.dto.js";
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
  poblacion?: string;
}): string {
  const calleLimpia = datos.calle.trim();
  const numeroLimpio = datos.numero.trim();
  const cpLimpio = datos.codigoPostal.trim();
  const ciudadLimpia = datos.ciudad.trim();
  const provinciaLimpia = datos.provincia?.trim();
  const poblacionLimpia = datos.poblacion?.trim();

  const via = `${calleLimpia} ${numeroLimpio}`;

  let loc = ciudadLimpia;
  if (poblacionLimpia && poblacionLimpia.toLowerCase() !== ciudadLimpia.toLowerCase()) {
    loc = `${poblacionLimpia} (${ciudadLimpia})`;
  }

  const localidad = `${cpLimpio} ${loc}`;
  return provinciaLimpia
    ? `${via}, ${localidad}, ${provinciaLimpia}`
    : `${via}, ${localidad}`;
}

/**
 * Desplaza las coordenadas entre ~110m y ~250m de forma determinista para vistas públicas,
 * protegiendo la ubicación exacta del garaje o portal privado del propietario.
 */
export function aproximarCoordenadas(
  lat: number,
  lng: number,
  id: number,
): { latitud: number; longitud: number } {
  const seed = (id * 9301 + 49297) % 233280;
  const angle = (seed / 233280) * 2 * Math.PI;
  // Offset entre ~0.001 y ~0.0024 grados (~110-250 metros)
  const distance = 0.0011 + ((seed % 100) / 100) * 0.0013;
  const latOffset = Math.sin(angle) * distance;
  const lngOffset = Math.cos(angle) * distance;

  return {
    latitud: Math.round((lat + latOffset) * 1000) / 1000,
    longitud: Math.round((lng + lngOffset) * 1000) / 1000,
  };
}

/**
 * Sanitiza los datos de una plaza para respuestas públicas:
 * - Aplica coordenadas aproximadas si existen latitud y longitud numéricas.
 * - Suprime el número específico de portal de la dirección pública.
 * - Elimina indicaciones privadas de acceso (descripcionEntrada).
 * - Protege la privacidad del propietario mostrando solo su nombre de pila.
 */
export function sanitizarPlazaPublica<T extends Record<string, any>>(plaza: T): T {
  const tieneCoords = typeof plaza.latitud === "number" && typeof plaza.longitud === "number";
  let latAprox = plaza.latitud;
  let lngAprox = plaza.longitud;

  if (tieneCoords) {
    const aprox = aproximarCoordenadas(plaza.latitud, plaza.longitud, plaza.id || 0);
    latAprox = aprox.latitud;
    lngAprox = aprox.longitud;
  }

  let direccionPublica = plaza.direccion;
  if (typeof direccionPublica === "string") {
    direccionPublica = direccionPublica
      .replace(/\b\d{1,5}(?:\s*º|\s*ª|[a-zA-Z])?\b(?=,)/g, "")
      .replace(/\s+,/g, ",");
  }

  const copia: any = {
    ...plaza,
    ...(tieneCoords && { latitud: latAprox, longitud: lngAprox }),
    ...(typeof direccionPublica === "string" && { direccion: direccionPublica }),
  };

  if ("descripcionEntrada" in copia) {
    copia.descripcionEntrada = null;
  }

  if (copia.propietario && typeof copia.propietario.nombre === "string") {
    copia.propietario = {
      id: copia.propietario.id,
      nombre: copia.propietario.nombre.split(" ")[0],
    };
  }

  return copia;
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
        poblacion: dto.poblacion,
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
      poblacion: dto.poblacion,
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
        ...(dto.horario !== undefined && { horario: comprobarConfiguracion(dto.horario) }),
        propietarioId,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        direccion: direccionLegible,
        poblacion: dto.poblacion?.trim() || null,
        numeroPlaza: dto.numeroPlaza?.trim() || null,
        planta: dto.planta?.trim() || null,
        indicacionesAcceso: dto.indicacionesAcceso?.trim() || null,
        latitud: finalLatitud,
        longitud: finalLongitud,
        precioHora: dto.precioHora,
        largo: dto.largo,
        ancho: dto.ancho,
        entradaDificil,
        descripcionEntrada,
        dificultadesEntrada,
        tieneCamaras: dto.tieneCamaras ?? false,
        estaCubierta: dto.estaCubierta ?? false,
        tieneCargadorElectrico: dto.tieneCargadorElectrico ?? false,
      },
      include: {
        propietario: {
          select: usuarioSelectPublico,
        },
        fotos: {
          orderBy: { orden: "asc" },
        },
      },
    });
  }

  /**
   * Construye dinámicamente la cláusula where de Prisma según los filtros proporcionados.
   */
  private construirWhereFiltros(filtros: FiltrarPlazasDto): Prisma.PlazaWhereInput {
    const where: Prisma.PlazaWhereInput = {
      disponible: true,
    };
    const andConditions: Prisma.PlazaWhereInput[] = [];

    // Búsqueda libre por texto (municipio, provincia, código postal o dirección general)
    if (filtros.q && filtros.q.trim()) {
      const qLimpio = filtros.q.trim();
      andConditions.push({
        OR: [
          { direccion: { contains: qLimpio, mode: "insensitive" } },
          { poblacion: { contains: qLimpio, mode: "insensitive" } },
        ],
      });
    }

    // Filtro específico por provincia
    if (filtros.provincia && filtros.provincia.trim()) {
      andConditions.push({
        direccion: { contains: filtros.provincia.trim(), mode: "insensitive" },
      });
    }

    // Filtro específico por municipio
    if (filtros.municipio && filtros.municipio.trim()) {
      const mun = filtros.municipio.trim();
      andConditions.push({
        OR: [
          { direccion: { contains: mun, mode: "insensitive" } },
          { poblacion: { contains: mun, mode: "insensitive" } },
        ],
      });
    }

    // Filtro específico por código postal
    if (filtros.codigoPostal && filtros.codigoPostal.trim()) {
      andConditions.push({
        direccion: { contains: filtros.codigoPostal.trim(), mode: "insensitive" },
      });
    }

    // Filtros booleanos (solo se aplican si no son undefined)
    if (filtros.estaCubierta !== undefined) {
      where.estaCubierta = filtros.estaCubierta;
    }

    if (filtros.tieneCargadorElectrico !== undefined) {
      where.tieneCargadorElectrico = filtros.tieneCargadorElectrico;
    }

    if (filtros.tieneCamaras !== undefined) {
      where.tieneCamaras = filtros.tieneCamaras;
    }

    if (filtros.entradaDificil !== undefined) {
      where.entradaDificil = filtros.entradaDificil;
    }

    // Filtros de dimensiones
    if (filtros.largoMin !== undefined) {
      where.largo = { gte: filtros.largoMin };
    }

    if (filtros.anchoMin !== undefined) {
      where.ancho = { gte: filtros.anchoMin };
    }

    // Filtros de precio
    if (filtros.precioMin !== undefined || filtros.precioMax !== undefined) {
      where.precioHora = {
        ...(filtros.precioMin !== undefined && { gte: filtros.precioMin }),
        ...(filtros.precioMax !== undefined && { lte: filtros.precioMax }),
      };
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return where;
  }

  /**
   * Obtiene la lista paginada de plazas aplicando filtros dinámicos (adaptación del patrón de organization.service.ts a Prisma).
   */
  async obtenerTodas(
    filtros: FiltrarPlazasDto = new FiltrarPlazasDto(),
  ): Promise<RespuestaPaginada<any>> {
    const skip = filtros.skip;
    const take = filtros.limit;

    const where = this.construirWhereFiltros(filtros);

    const [data, total] = await Promise.all([
      this.prisma.plaza.findMany({
        where,
        skip,
        take,
        include: {
          propietario: {
            select: propietarioSelectPublico,
          },
          fotos: {
            orderBy: { orden: "asc" },
          },
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.plaza.count({ where }),
    ]);

    const sanitizedData = data.map((p) => sanitizarPlazaPublica(p));
    return crearRespuestaPaginada(sanitizedData, total, filtros.page, filtros.limit);
  }

  /**
   * Obtiene los marcadores de plazas disponibles para el mapa interactivo según los filtros aplicados.
   * Utiliza coordenadas aproximadas y un límite de seguridad para optimizar la carga del mapa.
   */
  async obtenerMarcadoresMapa(
    filtros: FiltrarPlazasDto = new FiltrarPlazasDto(),
  ): Promise<any[]> {
    const where = this.construirWhereFiltros(filtros);

    const plazas = await this.prisma.plaza.findMany({
      where,
      select: {
        id: true,
        titulo: true,
        poblacion: true,
        direccion: true,
        latitud: true,
        longitud: true,
        precioHora: true,
        estaCubierta: true,
        tieneCargadorElectrico: true,
        tieneCamaras: true,
        entradaDificil: true,
      },
      take: 300,
      orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
    });

    return plazas.map((p) => {
      const aprox = aproximarCoordenadas(p.latitud, p.longitud, p.id);
      let zona = p.poblacion || "";
      if (!zona && p.direccion) {
        const partes = p.direccion.split(",");
        zona = partes[partes.length - 1]?.trim() || "";
      }
      return {
        id: p.id,
        titulo: p.titulo,
        zona,
        latitud: aprox.latitud,
        longitud: aprox.longitud,
        precioHora: p.precioHora,
        estaCubierta: p.estaCubierta,
        tieneCargadorElectrico: p.tieneCargadorElectrico,
        tieneCamaras: p.tieneCamaras,
        entradaDificil: p.entradaDificil,
      };
    });
  }

  async buscarPorIdInterno(id: number) {
    const plaza = await this.prisma.plaza.findUnique({
      where: { id },
      include: {
        propietario: {
          select: propietarioSelectPublico,
        },
        fotos: {
          orderBy: { orden: "asc" },
        },
      },
    });

    if (!plaza) {
      throw new NotFoundException(`Plaza con ID ${id} no encontrada`);
    }

    return plaza;
  }

  async obtenerPorId(id: number) {
    const plaza = await this.buscarPorIdInterno(id);
    return sanitizarPlazaPublica(plaza);
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
          fotos: {
            orderBy: { orden: "asc" },
          },
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.plaza.count({ where }),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }

  async actualizar(usuarioId: number, id: number, dto: ActualizarPlazaDto) {
    const plaza = await this.buscarPorIdInterno(id);

    if (plaza.propietarioId !== usuarioId) {
      throw new ForbiddenException(
        "No tienes permiso para modificar esta plaza",
      );
    }

    return this.actualizarComoAdmin(id, dto, plaza);
  }

  async actualizarComoAdmin(id: number, dto: ActualizarPlazaDto, plazaPrevia?: any) {
    const plaza = plazaPrevia || (await this.buscarPorIdInterno(id));

    // Validación conjunta de dirección si se envía cualquier campo de ubicación
    const intentaModificarDireccion =
      dto.calle !== undefined ||
      dto.numero !== undefined ||
      dto.codigoPostal !== undefined ||
      dto.ciudad !== undefined ||
      dto.provincia !== undefined ||
      dto.poblacion !== undefined;

    const intentaModificarCoordenadas =
      dto.latitud !== undefined || dto.longitud !== undefined;

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
          poblacion: dto.poblacion,
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
        poblacion: dto.poblacion,
      });
    } else if (intentaModificarCoordenadas) {
      // Modificación exclusiva de coordenadas (p. ej. ajuste manual del marcador en mapa)
      validarCoordenadas(dto.latitud, dto.longitud);
      nuevaLatitud = dto.latitud!;
      nuevaLongitud = dto.longitud!;
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

    const guardar = (db: Prisma.TransactionClient) => db.plaza.update({
      where: { id },
      data: {
        ...(dto.horario !== undefined && { horario: dto.horario }),
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.precioHora !== undefined && { precioHora: dto.precioHora }),
        ...(dto.largo !== undefined && { largo: dto.largo }),
        ...(dto.ancho !== undefined && { ancho: dto.ancho }),
        ...(dto.numeroPlaza !== undefined && {
          numeroPlaza: dto.numeroPlaza?.trim() || null,
        }),
        ...(dto.planta !== undefined && {
          planta: dto.planta?.trim() || null,
        }),
        ...(dto.indicacionesAcceso !== undefined && {
          indicacionesAcceso: dto.indicacionesAcceso?.trim() || null,
        }),
        ...(dto.disponible !== undefined && { disponible: dto.disponible }),
        ...(dto.tieneCamaras !== undefined && {
          tieneCamaras: dto.tieneCamaras,
        }),
        ...(dto.estaCubierta !== undefined && {
          estaCubierta: dto.estaCubierta,
        }),
        ...(dto.tieneCargadorElectrico !== undefined && {
          tieneCargadorElectrico: dto.tieneCargadorElectrico,
        }),
        entradaDificil: finalEntradaDificil,
        dificultadesEntrada: finalDificultades,
        descripcionEntrada: finalDescripcion,
        ...(intentaModificarDireccion && {
          direccion: nuevaDireccion,
          poblacion:
            dto.poblacion !== undefined
              ? dto.poblacion?.trim() || null
              : plaza.poblacion,
        }),
        ...((intentaModificarDireccion || intentaModificarCoordenadas) && {
          latitud: nuevaLatitud,
          longitud: nuevaLongitud,
        }),
      },
      include: {
        propietario: {
          select: usuarioSelectPublico,
        },
        fotos: {
          orderBy: { orden: "asc" },
        },
      },
    });
    if (dto.horario === undefined && dto.disponible !== false) return guardar(this.prisma);
    if (dto.horario !== undefined) {
      if (!plazaPrevia) throw new ForbiddenException('Solo el propietario puede cambiar el horario.');
      comprobarConfiguracion(dto.horario);
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const activas = await tx.reserva.findMany({
          where: { plazaId: id, estado: { in: ['PENDIENTE', 'CONFIRMADA'] }, fechaFin: { gt: new Date() } },
          select: { fechaInicio: true, fechaFin: true },
        });
        if (activas.some(r => dto.disponible === false || !cubrePeriodo(dto.horario, r.fechaInicio, r.fechaFin)))
          throw new ConflictException('El cambio dejaría fuera de horario una reserva pendiente o confirmada.');
        return guardar(tx);
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')
        throw new ConflictException('Las reservas han cambiado. Revisa el horario e inténtalo de nuevo.');
      throw error;
    }
  }

  async eliminar(usuarioId: number, id: number) {
    const plaza = await this.buscarPorIdInterno(id);

    if (plaza.propietarioId !== usuarioId) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar esta plaza",
      );
    }

    return this.eliminarComoAdmin(id);
  }

  async eliminarComoAdmin(id: number) {
    await this.buscarPorIdInterno(id);
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
    const plaza = await this.buscarPorIdInterno(plazaId);

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

  async guardarFotos(
    usuarioId: number,
    esAdmin: boolean,
    plazaId: number,
    archivos: Array<{
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }>,
  ) {
    const plaza = await this.buscarPorIdInterno(plazaId);

    if (plaza.propietarioId !== usuarioId && !esAdmin) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar fotos de esta plaza",
      );
    }

    if (!archivos || archivos.length === 0) {
      throw new BadRequestException("No se ha proporcionado ninguna fotografía");
    }

    const totalExistentes = await this.prisma.fotoPlaza.count({
      where: { plazaId },
    });

    if (totalExistentes + archivos.length > 5) {
      throw new BadRequestException(
        `Una plaza solo puede tener un máximo de 5 fotografías. Actualmente tiene ${totalExistentes} y se intentaron añadir ${archivos.length}.`,
      );
    }

    const formatosPermitidos = ["image/jpeg", "image/png", "image/webp"];
    const extensionesPermitidas = [".jpg", ".jpeg", ".png", ".webp"];

    const directorioUploads = path.resolve(process.cwd(), "uploads", "plazas");
    await fs.promises.mkdir(directorioUploads, { recursive: true });

    const fotosGuardadas = [];

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];

      if (archivo.size > 5 * 1024 * 1024) {
        throw new BadRequestException(
          `La imagen "${archivo.originalname}" supera el tamaño máximo permitido de 5 MB.`,
        );
      }

      if (!formatosPermitidos.includes(archivo.mimetype.toLowerCase())) {
        throw new BadRequestException(
          `El archivo "${archivo.originalname}" no tiene un formato válido. Formatos admitidos: JPEG, PNG y WebP.`,
        );
      }

      const extensionRaw = path.extname(archivo.originalname).toLowerCase();
      const extension = extensionesPermitidas.includes(extensionRaw)
        ? extensionRaw === ".jpeg"
          ? ".jpg"
          : extensionRaw
        : ".jpg";

      const nombreSeguro = `${plazaId}_${Date.now()}_${randomBytes(8).toString("hex")}${extension}`;
      const rutaDestino = path.join(directorioUploads, nombreSeguro);

      await fs.promises.writeFile(rutaDestino, archivo.buffer);

      const urlRelativa = `/plazas/fotos/${nombreSeguro}`;

      const nuevaFoto = await this.prisma.fotoPlaza.create({
        data: {
          plazaId,
          url: urlRelativa,
          orden: totalExistentes + i,
        },
      });

      fotosGuardadas.push(nuevaFoto);
    }

    return fotosGuardadas;
  }

  async eliminarFoto(
    usuarioId: number,
    esAdmin: boolean,
    plazaId: number,
    fotoId: number,
  ) {
    const plaza = await this.buscarPorIdInterno(plazaId);

    if (plaza.propietarioId !== usuarioId && !esAdmin) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar fotos de esta plaza",
      );
    }

    const foto = await this.prisma.fotoPlaza.findUnique({
      where: { id: fotoId },
    });

    if (!foto || foto.plazaId !== plazaId) {
      throw new NotFoundException("Fotografía no encontrada");
    }

    const nombreArchivo = path.basename(foto.url);
    const directorioUploads = path.resolve(process.cwd(), "uploads", "plazas");
    const rutaCompleta = path.join(directorioUploads, nombreArchivo);

    try {
      if (fs.existsSync(rutaCompleta)) {
        await fs.promises.unlink(rutaCompleta);
      }
    } catch {
      // Ignorar error al borrar archivo físico para no bloquear borrado en base de datos
    }

    await this.prisma.fotoPlaza.delete({
      where: { id: fotoId },
    });

    return { mensaje: "Fotografía eliminada exitosamente" };
  }

  servirFoto(nombreArchivo: string, res: Response) {
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(nombreArchivo)) {
      throw new BadRequestException("Nombre de archivo de imagen inválido");
    }

    const directorioUploads = path.resolve(process.cwd(), "uploads", "plazas");
    const rutaCompleta = path.join(directorioUploads, path.basename(nombreArchivo));

    if (!rutaCompleta.startsWith(directorioUploads)) {
      throw new ForbiddenException("Acceso a la ruta solicitado no permitido");
    }

    if (!fs.existsSync(rutaCompleta)) {
      throw new NotFoundException("Fotografía no encontrada");
    }

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(rutaCompleta);
  }
}
