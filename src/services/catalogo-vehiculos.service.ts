import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '@prisma/client';

@Injectable()
export class CatalogoVehiculosService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(q: string, limite = 15) {
    const terminoLimpio = (q || '').trim();
    if (terminoLimpio.length < 2) {
      return [];
    }

    const palabras = terminoLimpio.split(/\s+/).filter(Boolean);

    // Condición AND para cada palabra buscada (cada palabra debe aparecer en marca, modelo, generación o versión)
    const andConditions: Prisma.CatalogoVehiculoWhereInput[] = palabras.map((palabra) => ({
      OR: [
        { marca: { contains: palabra, mode: 'insensitive' } },
        { modelo: { contains: palabra, mode: 'insensitive' } },
        { generacion: { contains: palabra, mode: 'insensitive' } },
        { version: { contains: palabra, mode: 'insensitive' } },
      ],
    }));

    const resultados = await this.prisma.catalogoVehiculo.findMany({
      where: {
        AND: andConditions,
      },
      take: Math.min(limite, 50),
      orderBy: [
        { anyoInicio: { sort: 'desc', nulls: 'last' } },
        { marca: 'asc' },
        { modelo: 'asc' },
      ],
    });

    return resultados;
  }

  async obtenerMarcas(): Promise<string[]> {
    const marcasRaw = await this.prisma.catalogoVehiculo.findMany({
      distinct: ['marca'],
      select: {
        marca: true,
      },
      orderBy: {
        marca: 'asc',
      },
    });

    return marcasRaw.map((m) => m.marca);
  }

  async obtenerModelos(marca: string): Promise<string[]> {
    if (!marca?.trim()) return [];

    const modelosRaw = await this.prisma.catalogoVehiculo.findMany({
      where: {
        marca: {
          equals: marca.trim(),
          mode: 'insensitive',
        },
      },
      distinct: ['modelo'],
      select: {
        modelo: true,
      },
      orderBy: {
        modelo: 'asc',
      },
    });

    return modelosRaw.map((m) => m.modelo);
  }

  async obtenerVersiones(marca: string, modelo: string, anyo?: number) {
    if (!marca?.trim() || !modelo?.trim()) return [];

    const where: Prisma.CatalogoVehiculoWhereInput = {
      marca: {
        equals: marca.trim(),
        mode: 'insensitive',
      },
      modelo: {
        equals: modelo.trim(),
        mode: 'insensitive',
      },
    };

    if (anyo && !isNaN(anyo)) {
      where.OR = [
        {
          AND: [
            { anyoInicio: { lte: anyo } },
            {
              OR: [{ anyoFin: { gte: anyo } }, { anyoFin: null }],
            },
          ],
        },
        { anyoInicio: null },
      ];
    }

    return this.prisma.catalogoVehiculo.findMany({
      where,
      orderBy: [
        { anyoInicio: { sort: 'desc', nulls: 'last' } },
        { potenciaCv: { sort: 'desc', nulls: 'last' } },
        { version: 'asc' },
      ],
    });
  }

  async obtenerPorId(id: number) {
    const vehiculo = await this.prisma.catalogoVehiculo.findUnique({
      where: { id },
    });

    if (!vehiculo) {
      throw new NotFoundException(`Vehículo del catálogo con ID ${id} no encontrado`);
    }

    return vehiculo;
  }
}
