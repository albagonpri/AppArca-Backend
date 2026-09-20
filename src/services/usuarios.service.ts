import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CrearUsuarioDto } from '../dto/usuarios/crear-usuario.dto.js';
import { usuarioSelectPublico } from '../models/usuario.model.js';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearUsuarioDto) {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });

    if (usuarioExistente) {
      throw new ConflictException('Ya existe un usuario registrado con este correo electrónico');
    }

    return this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        correo: dto.correo,
      },
      select: usuarioSelectPublico,
    });
  }

  async obtenerTodos() {
    return this.prisma.usuario.findMany({
      select: usuarioSelectPublico,
      orderBy: { fechaCreacion: 'desc' },
    });
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

  async obtenerPlazas(usuarioId: number) {
    await this.obtenerPorId(usuarioId);

    return this.prisma.plaza.findMany({
      where: { propietarioId: usuarioId },
      orderBy: { fechaCreacion: 'desc' },
    });
  }

  async obtenerReservas(usuarioId: number) {
    await this.obtenerPorId(usuarioId);

    return this.prisma.reserva.findMany({
      where: { usuarioId },
      include: {
        plaza: true,
      },
      orderBy: { fechaCreacion: 'desc' },
    });
  }
}
