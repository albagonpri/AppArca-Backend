import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { CrearUsuarioDto } from "../dto/usuarios/crear-usuario.dto.js";
import { usuarioSelectPublico } from "../models/usuario.model.js";
import { PaginacionDto, RespuestaPaginada, crearRespuestaPaginada } from "../dto/comun/paginacion.dto.js";

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearUsuarioDto) {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });

    if (usuarioExistente) {
      throw new ConflictException("Ya existe un usuario registrado con este correo electrónico");
    }

    return this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        correo: dto.correo,
      },
      select: usuarioSelectPublico,
    });
  }

  async obtenerTodos(paginacion: PaginacionDto = new PaginacionDto()): Promise<RespuestaPaginada<any>> {
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const [data, total] = await Promise.all([
      this.prisma.usuario.findMany({
        skip,
        take,
        select: usuarioSelectPublico,
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.usuario.count(),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }

  async obtenerPorId(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: usuarioSelectPublico,
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }

  async obtenerPlazas(
    usuarioId: number,
    paginacion: PaginacionDto = new PaginacionDto(),
  ): Promise<RespuestaPaginada<any>> {
    await this.obtenerPorId(usuarioId);
    const where = { propietarioId: usuarioId };
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const [data, total] = await Promise.all([
      this.prisma.plaza.findMany({
        where,
        skip,
        take,
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.plaza.count({ where }),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }

  async obtenerReservas(
    usuarioId: number,
    paginacion: PaginacionDto = new PaginacionDto(),
  ): Promise<RespuestaPaginada<any>> {
    await this.obtenerPorId(usuarioId);
    const where = { usuarioId };
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const [data, total] = await Promise.all([
      this.prisma.reserva.findMany({
        where,
        skip,
        take,
        include: {
          plaza: true,
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.reserva.count({ where }),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }

  async actualizar(id: number, data: { nombre?: string; correo?: string }) {
    await this.obtenerPorId(id);

    if (data.correo) {
      const existente = await this.prisma.usuario.findUnique({
        where: { correo: data.correo },
      });
      if (existente && existente.id !== id) {
        throw new ConflictException("Ya existe otro usuario registrado con este correo electrónico");
      }
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
        ...(data.correo !== undefined && { correo: data.correo.trim() }),
      },
      select: usuarioSelectPublico,
    });
  }

  async eliminar(id: number) {
    await this.obtenerPorId(id);

    // Enfoque conservador: comprobación estricta para evitar borrado accidental en cascada de plazas y reservas de terceros
    const plazasCount = await this.prisma.plaza.count({ where: { propietarioId: id } });
    const reservasCount = await this.prisma.reserva.count({ where: { usuarioId: id } });

    if (plazasCount > 0 || reservasCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el usuario con ID ${id} porque tiene ${plazasCount} plaza(s) y ${reservasCount} reserva(s) asociadas. Para preservar la integridad de datos, elimine o desvincule primero esos registros.`
      );
    }

    return this.prisma.usuario.delete({
      where: { id },
      select: usuarioSelectPublico,
    });
  }
}
