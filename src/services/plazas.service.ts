import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CrearPlazaDto } from '../dto/plazas/crear-plaza.dto.js';

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
        propietario: true,
      },
    });
  }

  async obtenerTodas() {
    return this.prisma.plaza.findMany({
      include: {
        propietario: true,
      },
      orderBy: { fechaCreacion: 'desc' },
    });
  }

  async obtenerPorId(id: number) {
    const plaza = await this.prisma.plaza.findUnique({
      where: { id },
      include: {
        propietario: true,
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
        usuario: true,
      },
      orderBy: { fechaCreacion: 'desc' },
    });
  }
}
