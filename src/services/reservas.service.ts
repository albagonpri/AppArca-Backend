import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoReserva } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CrearReservaDto } from '../dto/reservas/crear-reserva.dto.js';
import { usuarioSelectPublico } from '../models/usuario.model.js';

@Injectable()
export class ReservasService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearReservaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException(`El usuario con ID ${dto.usuarioId} no existe`);
    }

    const plaza = await this.prisma.plaza.findUnique({
      where: { id: dto.plazaId },
    });

    if (!plaza) {
      throw new NotFoundException(`La plaza con ID ${dto.plazaId} no existe`);
    }

    const inicio = new Date(dto.fechaInicio);
    const fin = new Date(dto.fechaFin);

    if (inicio >= fin) {
      throw new BadRequestException('La fecha de inicio debe ser estrictamente anterior a la fecha de fin');
    }

    return this.prisma.reserva.create({
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
  }

  async obtenerTodas() {
    return this.prisma.reserva.findMany({
      include: {
        usuario: {
          select: usuarioSelectPublico,
        },
        plaza: true,
      },
      orderBy: { fechaCreacion: 'desc' },
    });
  }

  async obtenerPorId(id: number) {
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

    return reserva;
  }
}
