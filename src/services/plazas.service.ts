import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CrearPlazaDto } from '../dto/plazas/crear-plaza.dto.js';
import { usuarioSelectPublico } from '../models/usuario.model.js';

@Injectable()
export class PlazasService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearPlazaDto) {
    const propietario = await this.prisma.usuario.findUnique({
      where: { id: dto.propietarioId },
    });

    if (!propietario) {
      throw new NotFoundException(`El usuario propietario con ID ${dto.propietarioId} no existe`);
    }

    return this.prisma.plaza.create({
      data: {
        propietarioId: dto.propietarioId,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        precioHora: dto.precioHora,
      },
      include: {
        propietario: {
          select: usuarioSelectPublico,
        },
      },
    });
  }

  async obtenerTodas() {
    return this.prisma.plaza.findMany({
      include: {
        propietario: {
          select: usuarioSelectPublico,
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
  }

  async obtenerPorId(id: number) {
    const plaza = await this.prisma.plaza.findUnique({
      where: { id },
      include: {
        propietario: {
          select: usuarioSelectPublico,
        },
      },
    });

    if (!plaza) {
      throw new NotFoundException(`Plaza con ID ${id} no encontrada`);
    }

    return plaza;
  }

  async obtenerReservas(plazaId: number) {
    await this.obtenerPorId(plazaId);

    return this.prisma.reserva.findMany({
      where: { plazaId },
      include: {
        usuario: {
          select: usuarioSelectPublico,
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
  }
}
