import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { VehiculosService } from './vehiculos.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import { TipoPropulsion, EtiquetaAmbiental } from '@prisma/client';

describe('VehiculosService', () => {
  let service: VehiculosService;
  let mockPrisma: any;

  const mockVehiculo = {
    id: 10,
    usuarioId: 1,
    matricula: '1234ABC',
    etiquetaAmbiental: EtiquetaAmbiental.ECO,
    marca: 'Toyota',
    modelo: 'Corolla',
    anyo: 2021,
    version: '1.8L 122H',
    tipoPropulsion: TipoPropulsion.HIBRIDO_NO_ENCHUFABLE,
    esEnchufable: false,
    longitud: 4.63,
    anchura: 1.78,
    altura: 1.43,
    suspensionBaja: false,
    catalogoVehiculoId: 45,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      vehiculo: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 10, ...data })),
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockVehiculo, ...data })),
        delete: vi.fn().mockResolvedValue(mockVehiculo),
      },
    };

    service = new VehiculosService(mockPrisma as unknown as PrismaService);
  });

  describe('crear vehículo', () => {
    it('debe registrar un vehículo con sus especificaciones técnicas y asociarlo al usuario', async () => {
      const dto = {
        matricula: '1234ABC',
        etiquetaAmbiental: EtiquetaAmbiental.ECO,
        marca: 'Toyota',
        modelo: 'Corolla',
        anyo: 2021,
        version: '1.8L 122H',
        tipoPropulsion: TipoPropulsion.HIBRIDO_NO_ENCHUFABLE,
        esEnchufable: false,
        longitud: 4.63,
        anchura: 1.78,
        altura: 1.43,
        catalogoVehiculoId: 45,
      };

      const creado = await service.crear(1, dto);

      expect(creado).toBeDefined();
      expect(mockPrisma.vehiculo.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          usuarioId: 1,
        },
      });
    });
  });

  describe('seguridad y aislamiento de usuario en obtenerPorId', () => {
    it('debe retornar el vehículo si pertenece al usuario', async () => {
      mockPrisma.vehiculo.findUnique.mockResolvedValue(mockVehiculo);

      const resultado = await service.obtenerPorId(1, 10);
      expect(resultado).toEqual(mockVehiculo);
    });

    it('debe lanzar NotFoundException si el vehículo pertenece a otro usuario', async () => {
      mockPrisma.vehiculo.findUnique.mockResolvedValue(mockVehiculo);

      // El usuario 999 intenta acceder al vehículo del usuario 1
      await expect(service.obtenerPorId(999, 10)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si el vehículo no existe', async () => {
      mockPrisma.vehiculo.findUnique.mockResolvedValue(null);

      await expect(service.obtenerPorId(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
