import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DificultadEntrada } from '@prisma/client';
import { PlazasService } from './plazas.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import type { GeocodingService } from './geocoding.service.js';
import type { CrearPlazaDto } from '../dto/plazas/crear-plaza.dto.js';
import type { ActualizarPlazaDto } from '../dto/plazas/actualizar-plaza.dto.js';

describe('PlazasService - Dificultades de entrada', () => {
  let service: PlazasService;
  let mockPrisma: any;
  let mockGeocoding: any;

  const baseCrearDto: CrearPlazaDto = {
    titulo: 'Plaza de prueba',
    descripcion: 'Plaza en el centro',
    calle: 'Calle Mayor',
    numero: '10',
    codigoPostal: '28013',
    ciudad: 'Madrid',
    precioHora: 2.5,
    largo: 5.0,
    ancho: 2.5,
  };

  beforeEach(() => {
    mockPrisma = {
      usuario: {
        findUnique: vi.fn().mockResolvedValue({ id: 1, nombre: 'Juan' }),
      },
      plaza: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
        findUnique: vi.fn(),
      },
    };

    mockGeocoding = {
      geocodificar: vi.fn().mockResolvedValue({ latitud: 40.4168, longitud: -3.7038 }),
    };

    service = new PlazasService(
      mockPrisma as unknown as PrismaService,
      mockGeocoding as unknown as GeocodingService,
    );
  });

  describe('crear plaza', () => {
    it('debe asignar dificultadesEntrada = [] y descripcionEntrada = null si entradaDificil es false', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        entradaDificil: false,
        dificultadesEntrada: [DificultadEntrada.RAMPA_PRONUNCIADA],
        descripcionEntrada: 'Texto ignorado',
      };

      await service.crear(1, dto);

      expect(mockPrisma.plaza.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entradaDificil: false,
            dificultadesEntrada: [],
            descripcionEntrada: null,
          }),
        }),
      );
    });

    it('debe lanzar BadRequestException si entradaDificil es true pero dificultadesEntrada está vacío', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        entradaDificil: true,
        dificultadesEntrada: [],
      };

      await expect(service.crear(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('debe guardar múltiples dificultades seleccionadas y descripcionEntrada = null si no incluye OTRA', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        entradaDificil: true,
        dificultadesEntrada: [
          DificultadEntrada.ENTRADA_ESTRECHA,
          DificultadEntrada.GIRO_CERRADO,
          DificultadEntrada.ENTRADA_ESTRECHA, // Duplicado a propósito
        ],
        descripcionEntrada: 'No debería guardarse porque no es OTRA',
      };

      await service.crear(1, dto);

      expect(mockPrisma.plaza.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entradaDificil: true,
            dificultadesEntrada: [
              DificultadEntrada.ENTRADA_ESTRECHA,
              DificultadEntrada.GIRO_CERRADO,
            ],
            descripcionEntrada: null,
          }),
        }),
      );
    });

    it('debe lanzar BadRequestException si se selecciona OTRA pero no se proporciona descripcionEntrada', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        entradaDificil: true,
        dificultadesEntrada: [DificultadEntrada.OTRA],
        descripcionEntrada: '   ',
      };

      await expect(service.crear(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('debe guardar OTRA con la descripcionEntrada debidamente recortada (trim)', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        entradaDificil: true,
        dificultadesEntrada: [
          DificultadEntrada.RESALTO,
          DificultadEntrada.OTRA,
        ],
        descripcionEntrada: '  Bordillo alto antes de entrar  ',
      };

      await service.crear(1, dto);

      expect(mockPrisma.plaza.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entradaDificil: true,
            dificultadesEntrada: [
              DificultadEntrada.RESALTO,
              DificultadEntrada.OTRA,
            ],
            descripcionEntrada: 'Bordillo alto antes de entrar',
          }),
        }),
      );
    });
  });

  describe('actualizar plaza', () => {
    it('debe limpiar dificultades y descripcion cuando entradaDificil pasa a false', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue({
        id: 1,
        propietarioId: 1,
        entradaDificil: true,
        dificultadesEntrada: [DificultadEntrada.ENTRADA_ESTRECHA, DificultadEntrada.OTRA],
        descripcionEntrada: 'Algo previo',
      });

      const dto: ActualizarPlazaDto = {
        entradaDificil: false,
      };

      await service.actualizar(1, 1, dto);

      expect(mockPrisma.plaza.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            entradaDificil: false,
            dificultadesEntrada: [],
            descripcionEntrada: null,
          }),
        }),
      );
    });

    it('debe lanzar error al editar plaza histórica con entradaDificil = true si no se añaden dificultades', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue({
        id: 1,
        propietarioId: 1,
        entradaDificil: true,
        dificultadesEntrada: [],
        descripcionEntrada: null,
      });

      const dto: ActualizarPlazaDto = {
        titulo: 'Nuevo título',
      };

      await expect(service.actualizar(1, 1, dto)).rejects.toThrow(BadRequestException);
    });

    it('debe actualizar dificultades conservando la descripción si OTRA sigue presente', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue({
        id: 1,
        propietarioId: 1,
        entradaDificil: true,
        dificultadesEntrada: [DificultadEntrada.OTRA],
        descripcionEntrada: 'Descripción existente',
      });

      const dto: ActualizarPlazaDto = {
        dificultadesEntrada: [DificultadEntrada.OTRA, DificultadEntrada.RAMPA_PRONUNCIADA],
      };

      await service.actualizar(1, 1, dto);

      expect(mockPrisma.plaza.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entradaDificil: true,
            dificultadesEntrada: [DificultadEntrada.OTRA, DificultadEntrada.RAMPA_PRONUNCIADA],
            descripcionEntrada: 'Descripción existente',
          }),
        }),
      );
    });

    it('debe eliminar la descripcionEntrada si se retira OTRA de las dificultades', async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue({
        id: 1,
        propietarioId: 1,
        entradaDificil: true,
        dificultadesEntrada: [DificultadEntrada.OTRA, DificultadEntrada.RESALTO],
        descripcionEntrada: 'Descripción existente',
      });

      const dto: ActualizarPlazaDto = {
        dificultadesEntrada: [DificultadEntrada.RESALTO],
      };

      await service.actualizar(1, 1, dto);

      expect(mockPrisma.plaza.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entradaDificil: true,
            dificultadesEntrada: [DificultadEntrada.RESALTO],
            descripcionEntrada: null,
          }),
        }),
      );
    });
  });
  describe("paginacion en plazas", () => {
    it("debe aplicar skip, take y count al obtener todas las plazas paginadas", async () => {
      const mockPlazas = [{ id: 2, titulo: "Plaza 2" }, { id: 1, titulo: "Plaza 1" }];
      mockPrisma.plaza.findMany = vi.fn().mockResolvedValue(mockPlazas);
      mockPrisma.plaza.count = vi.fn().mockResolvedValue(25);

      const paginacionDto = { page: 2, limit: 10, skip: 10 };
      const resultado = await service.obtenerTodas(paginacionDto as any);

      expect(mockPrisma.plaza.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
        }),
      );
      expect(mockPrisma.plaza.count).toHaveBeenCalled();
      expect(resultado.data).toEqual(mockPlazas);
      expect(resultado.meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it("debe filtrar por propietarioId y paginar en obtenerMisPlazas", async () => {
      const mockPlazas = [{ id: 10, propietarioId: 7 }];
      mockPrisma.plaza.findMany = vi.fn().mockResolvedValue(mockPlazas);
      mockPrisma.plaza.count = vi.fn().mockResolvedValue(1);

      const paginacionDto = { page: 1, limit: 10, skip: 0 };
      const resultado = await service.obtenerMisPlazas(7, paginacionDto as any);

      expect(mockPrisma.plaza.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { propietarioId: 7 },
          skip: 0,
          take: 10,
          orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
        }),
      );
      expect(mockPrisma.plaza.count).toHaveBeenCalledWith({
        where: { propietarioId: 7 },
      });
      expect(resultado.meta.total).toBe(1);
      expect(resultado.meta.hasNextPage).toBe(false);
      expect(resultado.meta.hasPreviousPage).toBe(false);
    });
  });
  // ──────────────────────────────────────────────────────────
  // Tests del flujo de coordenadas confirmadas por el usuario
  // ──────────────────────────────────────────────────────────
  describe('coordenadas confirmadas por el usuario (latitud/longitud en DTO)', () => {
    it('debe usar coordenadas del DTO si se proporcionan y NO llamar a geocodificar', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        latitud: 43.361914,
        longitud: -5.849396,
      };

      await service.crear(1, dto);

      expect(mockGeocoding.geocodificar).not.toHaveBeenCalled();
      expect(mockPrisma.plaza.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            latitud: 43.361914,
            longitud: -5.849396,
          }),
        }),
      );
    });

    it('debe llamar a geocodificar si NO se envian coordenadas en el DTO', async () => {
      const dto: CrearPlazaDto = { ...baseCrearDto };

      await service.crear(1, dto);

      expect(mockGeocoding.geocodificar).toHaveBeenCalledOnce();
      expect(mockPrisma.plaza.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            latitud: 40.4168,
            longitud: -3.7038,
          }),
        }),
      );
    });

    it('debe lanzar BadRequestException si se envía latitud sin longitud', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        latitud: 40.4168,
      };

      await expect(service.crear(1, dto)).rejects.toThrow(BadRequestException);
      await expect(service.crear(1, dto)).rejects.toThrow(
        'Latitud y longitud deben proporcionarse conjuntamente.',
      );
    });

    it('debe lanzar BadRequestException si se envía longitud sin latitud', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        longitud: -3.7038,
      };

      await expect(service.crear(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si las coordenadas están fuera de España', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        latitud: 48.8566,
        longitud: 2.3522,
      };

      await expect(service.crear(1, dto)).rejects.toThrow(BadRequestException);
      await expect(service.crear(1, dto)).rejects.toThrow(
        'fuera del territorio español',
      );
    });

    it('debe aceptar coordenadas de Canarias (límite sur de España)', async () => {
      const dto: CrearPlazaDto = {
        ...baseCrearDto,
        latitud: 27.9202,
        longitud: -15.5528,
      };

      await service.crear(1, dto);

      expect(mockGeocoding.geocodificar).not.toHaveBeenCalled();
      expect(mockPrisma.plaza.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            latitud: 27.9202,
            longitud: -15.5528,
          }),
        }),
      );
    });

    it('al actualizar solo las coordenadas (mover marcador), debe guardarlas en BD y mantener la direccion', async () => {
      const mockPlazaExistente = {
        id: 5,
        propietarioId: 1,
        direccion: 'Calle Mayor 10, 28013 Madrid',
        latitud: 40.4168,
        longitud: -3.7038,
        entradaDificil: false,
        dificultadesEntrada: [],
        descripcionEntrada: null,
      };
      mockPrisma.plaza.findUnique = vi.fn().mockResolvedValue(mockPlazaExistente);
      mockPrisma.plaza.update = vi.fn().mockResolvedValue({
        ...mockPlazaExistente,
        latitud: 40.4200,
        longitud: -3.7100,
      });

      await service.actualizar(1, 5, {
        latitud: 40.4200,
        longitud: -3.7100,
      });

      expect(mockPrisma.plaza.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({
            latitud: 40.4200,
            longitud: -3.7100,
          }),
        }),
      );
      // La dirección no debe haber sido modificada
      const callData = mockPrisma.plaza.update.mock.calls[0][0].data;
      expect(callData.direccion).toBeUndefined();
    });

    it('al actualizar solo el precio, las coordenadas y la direccion deben conservarse intactas', async () => {
      const mockPlazaExistente = {
        id: 5,
        propietarioId: 1,
        direccion: 'Calle Mayor 10, 28013 Madrid',
        latitud: 40.4168,
        longitud: -3.7038,
        precioHora: 2.0,
        entradaDificil: false,
        dificultadesEntrada: [],
        descripcionEntrada: null,
      };
      mockPrisma.plaza.findUnique = vi.fn().mockResolvedValue(mockPlazaExistente);
      mockPrisma.plaza.update = vi.fn().mockResolvedValue({
        ...mockPlazaExistente,
        precioHora: 3.5,
      });

      await service.actualizar(1, 5, {
        precioHora: 3.5,
      });

      expect(mockPrisma.plaza.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({
            precioHora: 3.5,
          }),
        }),
      );
      const callData = mockPrisma.plaza.update.mock.calls[0][0].data;
      expect(callData.latitud).toBeUndefined();
      expect(callData.longitud).toBeUndefined();
      expect(callData.direccion).toBeUndefined();
    });

    it('al crear una plaza con poblacion distinta a ciudad, guarda poblacion y formatea la direccion como poblacion (ciudad)', async () => {
      const dtoConPoblacion: CrearPlazaDto = {
        ...baseCrearDto,
        codigoPostal: '33550',
        ciudad: 'Cangas de Onís',
        poblacion: 'Biamón',
        provincia: 'Asturias',
        latitud: 43.3500,
        longitud: -5.1200,
      };

      await service.crear(1, dtoConPoblacion);

      expect(mockPrisma.plaza.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            poblacion: 'Biamón',
            direccion: 'Calle Mayor 10, 33550 Biamón (Cangas de Onís), Asturias',
            latitud: 43.3500,
            longitud: -5.1200,
          }),
        }),
      );
    });

    it('al crear una plaza con poblacion igual a ciudad, no duplica el nombre en la direccion legible', async () => {
      const dtoMismaPoblacion: CrearPlazaDto = {
        ...baseCrearDto,
        codigoPostal: '28013',
        ciudad: 'Madrid',
        poblacion: 'Madrid',
        provincia: 'Madrid',
        latitud: 40.4168,
        longitud: -3.7038,
      };

      await service.crear(1, dtoMismaPoblacion);

      expect(mockPrisma.plaza.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            poblacion: 'Madrid',
            direccion: 'Calle Mayor 10, 28013 Madrid, Madrid',
          }),
        }),
      );
    });

    it('al actualizar la direccion incluyendo poblacion, actualiza direccion y el campo poblacion en la BD', async () => {
      const mockPlazaExistente = {
        id: 7,
        propietarioId: 1,
        direccion: 'Calle Vieja 1, 28013 Madrid, Madrid',
        poblacion: 'Madrid',
        latitud: 40.4168,
        longitud: -3.7038,
        entradaDificil: false,
        dificultadesEntrada: [],
        descripcionEntrada: null,
      };
      mockPrisma.plaza.findUnique = vi.fn().mockResolvedValue(mockPlazaExistente);
      mockPrisma.plaza.update = vi.fn().mockResolvedValue({
        ...mockPlazaExistente,
        direccion: 'Calle Mayor 10, 33550 Biamón (Cangas de Onís), Asturias',
        poblacion: 'Biamón',
      });

      await service.actualizar(1, 7, {
        calle: 'Calle Mayor',
        numero: '10',
        codigoPostal: '33550',
        ciudad: 'Cangas de Onís',
        poblacion: 'Biamón',
        provincia: 'Asturias',
        latitud: 43.3500,
        longitud: -5.1200,
      });

      expect(mockPrisma.plaza.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 7 },
          data: expect.objectContaining({
            poblacion: 'Biamón',
            direccion: 'Calle Mayor 10, 33550 Biamón (Cangas de Onís), Asturias',
            latitud: 43.3500,
            longitud: -5.1200,
          }),
        }),
      );
    });
  });
});

