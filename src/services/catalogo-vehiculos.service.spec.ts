import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CatalogoVehiculosService } from './catalogo-vehiculos.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import { TipoPropulsion, EtiquetaAmbiental } from '@prisma/client';

describe('CatalogoVehiculosService', () => {
  let service: CatalogoVehiculosService;
  let mockPrisma: any;

  const mockVehiculoCatalogo = {
    id: 1,
    marca: 'SEAT',
    modelo: 'Leon',
    generacion: 'Leon (2020)',
    anyoInicio: 2020,
    anyoFin: null,
    carroceria: 'Hatchback',
    version: '1.5 eTSI DSG (150 HP)',
    tipoPropulsion: TipoPropulsion.HIBRIDO_NO_ENCHUFABLE,
    combustibleDetalle: 'Mild Hybrid',
    potenciaCv: 150,
    esEnchufable: false,
    etiquetaDgtSugerida: EtiquetaAmbiental.ECO,
    etiquetaDgtFiable: true,
    longitud: 4.37,
    anchura: 1.80,
    altura: 1.46,
    origen: 'gor3a/vehicle-makes-models',
  };

  beforeEach(() => {
    mockPrisma = {
      catalogoVehiculo: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    service = new CatalogoVehiculosService(mockPrisma as unknown as PrismaService);
  });

  describe('buscar', () => {
    it('debe devolver array vacío si la consulta tiene menos de 2 caracteres', async () => {
      const resultado = await service.buscar('a');
      expect(resultado).toEqual([]);
      expect(mockPrisma.catalogoVehiculo.findMany).not.toHaveBeenCalled();
    });

    it('debe buscar con condiciones AND por cada palabra', async () => {
      mockPrisma.catalogoVehiculo.findMany.mockResolvedValue([mockVehiculoCatalogo]);

      const resultado = await service.buscar('seat leon');
      expect(resultado).toHaveLength(1);
      expect(mockPrisma.catalogoVehiculo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 15,
        }),
      );
    });
  });

  describe('obtenerMarcas', () => {
    it('debe devolver array de nombres de marcas', async () => {
      mockPrisma.catalogoVehiculo.findMany.mockResolvedValue([
        { marca: 'Peugeot' },
        { marca: 'Renault' },
        { marca: 'SEAT' },
      ]);

      const marcas = await service.obtenerMarcas();
      expect(marcas).toEqual(['Peugeot', 'Renault', 'SEAT']);
    });
  });

  describe('obtenerModelos', () => {
    it('debe devolver modelos para la marca dada', async () => {
      mockPrisma.catalogoVehiculo.findMany.mockResolvedValue([
        { modelo: 'Arona' },
        { modelo: 'Ateca' },
        { modelo: 'Ibiza' },
        { modelo: 'Leon' },
      ]);

      const modelos = await service.obtenerModelos('SEAT');
      expect(modelos).toEqual(['Arona', 'Ateca', 'Ibiza', 'Leon']);
    });

    it('debe devolver array vacío si marca está vacía', async () => {
      const modelos = await service.obtenerModelos('   ');
      expect(modelos).toEqual([]);
      expect(mockPrisma.catalogoVehiculo.findMany).not.toHaveBeenCalled();
    });
  });

  describe('obtenerVersiones', () => {
    it('debe buscar versiones filtrando por marca y modelo', async () => {
      mockPrisma.catalogoVehiculo.findMany.mockResolvedValue([mockVehiculoCatalogo]);

      const versiones = await service.obtenerVersiones('SEAT', 'Leon', 2021);
      expect(versiones).toEqual([mockVehiculoCatalogo]);
      expect(mockPrisma.catalogoVehiculo.findMany).toHaveBeenCalled();
    });
  });

  describe('obtenerPorId', () => {
    it('debe devolver el vehículo si existe', async () => {
      mockPrisma.catalogoVehiculo.findUnique.mockResolvedValue(mockVehiculoCatalogo);

      const resultado = await service.obtenerPorId(1);
      expect(resultado).toEqual(mockVehiculoCatalogo);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockPrisma.catalogoVehiculo.findUnique.mockResolvedValue(null);

      await expect(service.obtenerPorId(999)).rejects.toThrow(NotFoundException);
    });
  });
});
