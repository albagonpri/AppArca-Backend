import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservasService } from './reservas.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import { EstadoReserva } from '@prisma/client';

describe('ReservasService - Vehículos y Precio Total', () => {
  let service: ReservasService;
  let mockPrisma: any;

  const mockUsuario = {
    id: 1,
    nombre: 'Conductor Test',
    correo: 'conductor@example.com',
  };

  const mockPlaza = {
    id: 100,
    propietarioId: 2,
    titulo: 'Plaza Centro',
    direccion: 'Calle Mayor 1',
    precioHora: 2.50,
    disponible: true,
    horario: null,
  };

  const mockVehiculo = {
    id: 10,
    usuarioId: 1,
    matricula: '1234ABC',
    marca: 'Seat',
    modelo: 'Ibiza',
  };

  beforeEach(() => {
    mockPrisma = {
      usuario: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 1) return Promise.resolve(mockUsuario);
          if (where.id === 2) return Promise.resolve({ id: 2, nombre: 'Propietario', correo: 'propietario@example.com' });
          return Promise.resolve(null);
        }),
      },
      plaza: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 100) return Promise.resolve(mockPlaza);
          return Promise.resolve(null);
        }),
      },
      vehiculo: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 10) return Promise.resolve(mockVehiculo);
          if (where.id === 99) return Promise.resolve({ ...mockVehiculo, id: 99, usuarioId: 999 }); // pertenece a otro
          return Promise.resolve(null);
        }),
      },
      reserva: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 50,
            ...data,
            usuario: mockUsuario,
            plaza: mockPlaza,
            vehiculo: data.vehiculoId ? mockVehiculo : null,
          }),
        ),
        findFirst: vi.fn().mockResolvedValue(null), // Sin solapamiento
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new ReservasService(mockPrisma as unknown as PrismaService);
  });

  describe('Cálculo de precio total', () => {
    it('debe calcular el precio total exacto según las horas y minutos de duración', async () => {
      // 2 horas y media: 2.5 horas * 2.50 €/h = 6.25 €
      const dto = {
        usuarioId: 1,
        plazaId: 100,
        vehiculoId: 10,
        fechaInicio: '2090-06-15T10:00:00.000Z',
        fechaFin: '2090-06-15T12:30:00.000Z',
      };

      const resultado = await service.crear(dto);

      expect(resultado).toBeDefined();
      expect(resultado.precioTotal).toBe(6.25);
      expect(resultado.vehiculoId).toBe(10);
      expect(mockPrisma.reserva.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            precioTotal: 6.25,
            vehiculoId: 10,
            estado: EstadoReserva.PENDIENTE,
          }),
        }),
      );
    });

    it('debe redondear el precio total a 2 decimales para duraciones fraccionarias complejas', async () => {
      // 1 hora y 17 minutos = 1 + 17/60 = 1.28333... horas * 2.50 € = 3.20833... -> 3.21 €
      const dto = {
        usuarioId: 1,
        plazaId: 100,
        vehiculoId: 10,
        fechaInicio: '2090-06-15T10:00:00.000Z',
        fechaFin: '2090-06-15T11:17:00.000Z',
      };

      const resultado = await service.crear(dto);
      expect(resultado.precioTotal).toBe(3.21);
    });
  });

  describe('Asociación y validación de vehículos', () => {
    it('debe permitir asociar un vehículo perteneciente al usuario autenticado', async () => {
      const dto = {
        usuarioId: 1,
        plazaId: 100,
        vehiculoId: 10,
        fechaInicio: '2090-06-15T10:00:00.000Z',
        fechaFin: '2090-06-15T11:00:00.000Z',
      };

      const resultado = await service.crear(dto);
      expect(resultado.vehiculoId).toBe(10);
    });

    it('debe rechazar la reserva si el vehículo especificado no existe', async () => {
      const dto = {
        usuarioId: 1,
        plazaId: 100,
        vehiculoId: 9999, // Inexistente
        fechaInicio: '2090-06-15T10:00:00.000Z',
        fechaFin: '2090-06-15T11:00:00.000Z',
      };

      await expect(service.crear(dto)).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar la reserva si el vehículo pertenece a otro usuario', async () => {
      const dto = {
        usuarioId: 1,
        plazaId: 100,
        vehiculoId: 99, // Pertenece a usuarioId 999
        fechaInicio: '2090-06-15T10:00:00.000Z',
        fechaFin: '2090-06-15T11:00:00.000Z',
      };

      await expect(service.crear(dto)).rejects.toThrow(BadRequestException);
      await expect(service.crear(dto)).rejects.toThrow('El vehículo no pertenece al usuario');
    });

    it('debe impedir que el usuario reserve su propia plaza', async () => {
      const dto = {
        usuarioId: 2, // Mismo id que mockPlaza.propietarioId
        plazaId: 100,
        fechaInicio: '2090-06-15T10:00:00.000Z',
        fechaFin: '2090-06-15T11:00:00.000Z',
      };

      await expect(service.crear(dto)).rejects.toThrow(BadRequestException);
      await expect(service.crear(dto)).rejects.toThrow('No puedes reservar tu propia plaza');
    });
  });
});
