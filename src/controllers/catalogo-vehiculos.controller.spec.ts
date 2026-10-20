import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogoVehiculosController } from './catalogo-vehiculos.controller.js';
import type { CatalogoVehiculosService } from '../services/catalogo-vehiculos.service.js';
import { TipoPropulsion, EtiquetaAmbiental } from '@prisma/client';

describe('CatalogoVehiculosController', () => {
  let controller: CatalogoVehiculosController;
  let mockService: any;

  const mockItem = {
    id: 1,
    marca: 'Volkswagen',
    modelo: 'Golf',
    version: '1.5 eTSI (150 HP)',
    anyoInicio: 2020,
    tipoPropulsion: TipoPropulsion.HIBRIDO_NO_ENCHUFABLE,
    esEnchufable: false,
    etiquetaDgtSugerida: EtiquetaAmbiental.ECO,
    etiquetaDgtFiable: true,
    longitud: 4.28,
    anchura: 1.79,
    altura: 1.46,
  };

  beforeEach(() => {
    mockService = {
      buscar: vi.fn().mockResolvedValue([mockItem]),
      obtenerMarcas: vi.fn().mockResolvedValue(['SEAT', 'Volkswagen']),
      obtenerModelos: vi.fn().mockResolvedValue(['Golf', 'Polo']),
      obtenerVersiones: vi.fn().mockResolvedValue([mockItem]),
      obtenerPorId: vi.fn().mockResolvedValue(mockItem),
    };

    controller = new CatalogoVehiculosController(
      mockService as unknown as CatalogoVehiculosService,
    );
  });

  it('debe buscar vehículos por query de texto libre', async () => {
    const res = await controller.buscar({ q: 'Golf', limite: 10 });
    expect(res).toEqual([mockItem]);
    expect(mockService.buscar).toHaveBeenCalledWith('Golf', 10);
  });

  it('debe listar las marcas disponibles', async () => {
    const res = await controller.obtenerMarcas();
    expect(res).toEqual(['SEAT', 'Volkswagen']);
  });

  it('debe listar modelos por marca', async () => {
    const res = await controller.obtenerModelos({ marca: 'Volkswagen' });
    expect(res).toEqual(['Golf', 'Polo']);
    expect(mockService.obtenerModelos).toHaveBeenCalledWith('Volkswagen');
  });

  it('debe obtener versiones por marca, modelo y año opcional', async () => {
    const res = await controller.obtenerVersiones({
      marca: 'Volkswagen',
      modelo: 'Golf',
      anyo: 2020,
    });
    expect(res).toEqual([mockItem]);
    expect(mockService.obtenerVersiones).toHaveBeenCalledWith(
      'Volkswagen',
      'Golf',
      2020,
    );
  });

  it('debe obtener el detalle por ID', async () => {
    const res = await controller.obtenerPorId(1);
    expect(res).toEqual(mockItem);
    expect(mockService.obtenerPorId).toHaveBeenCalledWith(1);
  });
});
