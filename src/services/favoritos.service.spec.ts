import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FavoritosService } from './favoritos.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import { PaginacionDto } from '../dto/comun/paginacion.dto.js';

describe('FavoritosService', () => {
  let service: FavoritosService;
  let mockPrisma: any;

  const mockPlaza = {
    id: 1,
    propietarioId: 2,
    titulo: 'Plaza Centro',
    direccion: 'Calle Mayor 10, 28001 Madrid',
    latitud: 40.4168,
    longitud: -3.7038,
    precioHora: 2.5,
    largo: 4.8,
    ancho: 2.3,
    disponible: true,
    propietario: { id: 2, nombre: 'Carlos Ruiz' },
    fotos: [{ id: 1, plazaId: 1, url: '/plazas/fotos/1_1.jpg', orden: 0 }],
  };

  beforeEach(() => {
    mockPrisma = {
      plaza: {
        findUnique: vi.fn(),
      },
      favorito: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new FavoritosService(mockPrisma as unknown as PrismaService);
  });

  describe('marcarFavorito', () => {
    it('debe añadir una plaza a favoritos de forma idempotente', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue(mockPlaza);
      mockPrisma.favorito.upsert.mockResolvedValue({
        id: 10,
        usuarioId: 1,
        plazaId: 1,
      });

      const resultado = await service.marcarFavorito(1, 1);

      expect(resultado.esFavorito).toBe(true);
      expect(mockPrisma.favorito.upsert).toHaveBeenCalledWith({
        where: { usuarioId_plazaId: { usuarioId: 1, plazaId: 1 } },
        update: {},
        create: { usuarioId: 1, plazaId: 1 },
      });
    });

    it('debe lanzar NotFoundException si la plaza no existe', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue(null);

      await expect(service.marcarFavorito(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('desmarcarFavorito', () => {
    it('debe eliminar la plaza de favoritos', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue(mockPlaza);
      mockPrisma.favorito.deleteMany.mockResolvedValue({ count: 1 });

      const resultado = await service.desmarcarFavorito(1, 1);

      expect(resultado.esFavorito).toBe(false);
      expect(mockPrisma.favorito.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId: 1, plazaId: 1 },
      });
    });

    it('debe lanzar NotFoundException si la plaza no existe', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue(null);

      await expect(service.desmarcarFavorito(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('alternarFavorito', () => {
    it('debe crear el favorito si no existía previamente', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue(mockPlaza);
      mockPrisma.favorito.findUnique.mockResolvedValue(null);
      mockPrisma.favorito.create.mockResolvedValue({ id: 10, usuarioId: 1, plazaId: 1 });

      const resultado = await service.alternarFavorito(1, 1);

      expect(resultado.esFavorito).toBe(true);
      expect(mockPrisma.favorito.create).toHaveBeenCalled();
    });

    it('debe eliminar el favorito si ya existía previamente', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue(mockPlaza);
      mockPrisma.favorito.findUnique.mockResolvedValue({ id: 10, usuarioId: 1, plazaId: 1 });
      mockPrisma.favorito.delete.mockResolvedValue({ id: 10 });

      const resultado = await service.alternarFavorito(1, 1);

      expect(resultado.esFavorito).toBe(false);
      expect(mockPrisma.favorito.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    });
  });

  describe('obtenerIdsFavoritos', () => {
    it('debe devolver un array con los IDs de las plazas favoritas', async () => {
      mockPrisma.favorito.findMany.mockResolvedValue([
        { plazaId: 1 },
        { plazaId: 5 },
      ]);

      const resultado = await service.obtenerIdsFavoritos(1);

      expect(resultado).toEqual([1, 5]);
    });
  });

  describe('obtenerMisFavoritos', () => {
    it('debe devolver las plazas favoritas paginadas y sanitizadas', async () => {
      mockPrisma.favorito.findMany.mockResolvedValue([
        {
          id: 10,
          usuarioId: 1,
          plazaId: 1,
          plaza: mockPlaza,
        },
      ]);
      mockPrisma.favorito.count.mockResolvedValue(1);

      const paginacion = new PaginacionDto();
      const resultado = await service.obtenerMisFavoritos(1, paginacion);

      expect(resultado.meta.total).toBe(1);
      expect(resultado.data).toHaveLength(1);
      expect(resultado.data[0].id).toBe(1);
    });
  });
});

