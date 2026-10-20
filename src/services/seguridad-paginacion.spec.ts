import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { VehiculosService } from "./vehiculos.service.js";
import { PlazasService } from "./plazas.service.js";
import { ReservasService } from "./reservas.service.js";
import { PaginacionDto } from "../dto/comun/paginacion.dto.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { GeocodingService } from "./geocoding.service.js";

describe("Seguridad y Autorización en Paginación Multiusuario", () => {
  let mockPrisma: any;
  let vehiculosService: VehiculosService;
  let plazasService: PlazasService;
  let reservasService: ReservasService;

  const USUARIO_A_ID = 1;
  const USUARIO_B_ID = 2;

  beforeEach(() => {
    mockPrisma = {
      vehiculo: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
      },
      plaza: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
      },
      reserva: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      usuario: {
        findUnique: vi.fn(),
      },
      // Simula $transaction ejecutando la función directamente sobre mockPrisma
      $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    };

    vehiculosService = new VehiculosService(mockPrisma as unknown as PrismaService);
    plazasService = new PlazasService(
      mockPrisma as unknown as PrismaService,
      {} as unknown as GeocodingService,
    );
    reservasService = new ReservasService(mockPrisma as unknown as PrismaService);
  });

  describe("Aislamiento de Vehículos entre dos usuarios", () => {
    it("el Usuario A solo recibe sus vehículos y su propio conteo total", async () => {
      const vehiculosUsuarioA = [
        { id: 101, usuarioId: USUARIO_A_ID, matricula: "1111AAA" },
        { id: 102, usuarioId: USUARIO_A_ID, matricula: "2222BBB" },
      ];

      mockPrisma.vehiculo.findMany.mockImplementation(({ where }) => {
        if (where?.usuarioId === USUARIO_A_ID) return Promise.resolve(vehiculosUsuarioA);
        return Promise.resolve([]);
      });
      mockPrisma.vehiculo.count.mockImplementation(({ where }) => {
        if (where?.usuarioId === USUARIO_A_ID) return Promise.resolve(2);
        if (where?.usuarioId === USUARIO_B_ID) return Promise.resolve(5);
        return Promise.resolve(0);
      });

      const paginacion = new PaginacionDto();
      const resA = await vehiculosService.obtenerTodos(USUARIO_A_ID, paginacion);

      expect(mockPrisma.vehiculo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuarioId: USUARIO_A_ID },
        }),
      );
      expect(mockPrisma.vehiculo.count).toHaveBeenCalledWith({
        where: { usuarioId: USUARIO_A_ID },
      });

      expect(resA.data).toHaveLength(2);
      expect(resA.meta.total).toBe(2);
      expect(resA.data.every((v: any) => v.usuarioId === USUARIO_A_ID)).toBe(true);
      expect(resA.meta.total).not.toBe(7); // No filtra ni revela el total global con Usuario B
    });

    it("el Usuario B recibe únicamente sus vehículos sin filtrar datos de Usuario A", async () => {
      const vehiculosUsuarioB = [
        { id: 201, usuarioId: USUARIO_B_ID, matricula: "3333CCC" },
        { id: 202, usuarioId: USUARIO_B_ID, matricula: "4444DDD" },
        { id: 203, usuarioId: USUARIO_B_ID, matricula: "5555EEE" },
      ];

      mockPrisma.vehiculo.findMany.mockResolvedValue(vehiculosUsuarioB);
      mockPrisma.vehiculo.count.mockResolvedValue(3);

      const paginacion = new PaginacionDto();
      const resB = await vehiculosService.obtenerTodos(USUARIO_B_ID, paginacion);

      expect(mockPrisma.vehiculo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuarioId: USUARIO_B_ID },
        }),
      );
      expect(resB.data).toHaveLength(3);
      expect(resB.meta.total).toBe(3);
      expect(resB.data.every((v: any) => v.usuarioId === USUARIO_B_ID)).toBe(true);
    });
  });

  describe("Aislamiento de Plazas y Reservas de Plazas entre dos usuarios", () => {
    it("el Usuario A solo puede obtener sus propias plazas en mis-plazas", async () => {
      const plazasA = [{ id: 10, propietarioId: USUARIO_A_ID, titulo: "Plaza A" }];
      mockPrisma.plaza.findMany.mockResolvedValue(plazasA);
      mockPrisma.plaza.count.mockResolvedValue(1);

      const res = await plazasService.obtenerMisPlazas(USUARIO_A_ID, new PaginacionDto());

      expect(mockPrisma.plaza.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { propietarioId: USUARIO_A_ID },
        }),
      );
      expect(res.meta.total).toBe(1);
      expect(res.data[0].propietarioId).toBe(USUARIO_A_ID);
    });

    it("el Usuario A no puede consultar las reservas de una plaza perteneciente al Usuario B", async () => {
      // Plaza con ID 20 perteneciente al Usuario B
      mockPrisma.plaza.findUnique.mockResolvedValue({
        id: 20,
        propietarioId: USUARIO_B_ID,
        titulo: "Plaza de Usuario B",
      });

      await expect(
        plazasService.obtenerReservas(20, USUARIO_A_ID, false, new PaginacionDto()),
      ).rejects.toThrow(ForbiddenException);
    });

    it("el propietario de la plaza sí puede consultar sus reservas paginadas", async () => {
      mockPrisma.plaza.findUnique.mockResolvedValue({
        id: 20,
        propietarioId: USUARIO_B_ID,
        titulo: "Plaza de Usuario B",
      });

      const reservasPlazaB = [{ id: 1, plazaId: 20, usuarioId: USUARIO_A_ID }];
      mockPrisma.reserva.findMany.mockResolvedValue(reservasPlazaB);
      mockPrisma.reserva.count.mockResolvedValue(1);

      const res = await plazasService.obtenerReservas(20, USUARIO_B_ID, false, new PaginacionDto());
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });
  });

  describe("Aislamiento y Protección de Reservas", () => {
    it("el Usuario A no ve las reservas del Usuario B en sus reservas propias", async () => {
      const reservasA = [
        { id: 1, usuarioId: USUARIO_A_ID, plazaId: 50 },
        { id: 2, usuarioId: USUARIO_A_ID, plazaId: 51 },
      ];

      mockPrisma.reserva.findMany.mockResolvedValue(reservasA);
      mockPrisma.reserva.count.mockResolvedValue(2);

      const res = await reservasService.obtenerUsuarioReservas(
        USUARIO_A_ID,
        "propias",
        new PaginacionDto(),
      );

      expect(mockPrisma.reserva.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuarioId: USUARIO_A_ID },
        }),
      );
      expect(res.meta.total).toBe(2);
      expect(res.data.every((r: any) => r.usuarioId === USUARIO_A_ID)).toBe(true);
    });

    it("un usuario ajeno no puede acceder al detalle de una reserva", async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id: 99,
        usuarioId: USUARIO_B_ID,
        plazaId: 40,
        plaza: { propietarioId: USUARIO_B_ID },
      });

      // Usuario A no es ni el conductor (usuarioId) ni el dueño de la plaza
      await expect(
        reservasService.obtenerPorId(99, USUARIO_A_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it("un administrador puede consultar cualquier reserva por ID", async () => {
      const reservaB = {
        id: 99,
        usuarioId: USUARIO_B_ID,
        plazaId: 40,
        plaza: { propietarioId: USUARIO_B_ID },
      };
      mockPrisma.reserva.findUnique.mockResolvedValue(reservaB);

      const res = await reservasService.obtenerPorId(99, USUARIO_A_ID, true);
      expect(res).toEqual(reservaB);
    });
  });

  describe("Comprobaciones de Seguridad Avanzadas, Estados y Concurrencia", () => {
    it("el conductor no puede auto-confirmarse una reserva", async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id: 501,
        usuarioId: USUARIO_A_ID,
        plazaId: 10,
        estado: "PENDIENTE",
        plaza: { propietarioId: USUARIO_B_ID },
      });

      // El conductor intenta confirmarse a sí mismo
      await expect(
        reservasService.actualizarEstadoPorUsuario(501, USUARIO_A_ID, false, "CONFIRMADA" as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("el conductor sí puede cancelar su propia reserva", async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id: 501,
        usuarioId: USUARIO_A_ID,
        plazaId: 10,
        estado: "PENDIENTE",
        plaza: { propietarioId: USUARIO_B_ID },
      });
      mockPrisma.reserva.update.mockResolvedValue({
        id: 501,
        estado: "CANCELADA",
      });

      const res = await reservasService.actualizarEstadoPorUsuario(
        501,
        USUARIO_A_ID,
        false,
        "CANCELADA" as any,
      );
      expect(res.estado).toBe("CANCELADA");
    });

    it("el propietario de la plaza puede confirmar o cancelar la reserva", async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id: 502,
        usuarioId: USUARIO_A_ID,
        plazaId: 10,
        estado: "PENDIENTE",
        fechaInicio: new Date("2026-11-01T10:00:00Z"),
        fechaFin: new Date("2026-11-01T12:00:00Z"),
        plaza: { propietarioId: USUARIO_B_ID },
      });
      mockPrisma.reserva.findFirst.mockResolvedValue(null); // Sin solapamientos confirmados
      mockPrisma.reserva.update.mockResolvedValue({
        id: 502,
        estado: "CONFIRMADA",
      });

      const res = await reservasService.actualizarEstadoPorUsuario(
        502,
        USUARIO_B_ID,
        false,
        "CONFIRMADA" as any,
      );
      expect(res.estado).toBe("CONFIRMADA");
    });

    it("impide transiciones sobre reservas ya canceladas o completadas", async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id: 503,
        usuarioId: USUARIO_A_ID,
        plazaId: 10,
        estado: "CANCELADA",
        plaza: { propietarioId: USUARIO_B_ID },
      });

      await expect(
        reservasService.actualizarEstadoPorUsuario(503, USUARIO_B_ID, false, "CONFIRMADA" as any),
      ).rejects.toThrow("No se puede modificar una reserva que ya ha sido cancelada");
    });

    it("impide reservar una plaza propia", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({ id: USUARIO_A_ID });
      mockPrisma.plaza.findUnique.mockResolvedValue({
        id: 10,
        propietarioId: USUARIO_A_ID,
        disponible: true,
      });

      await expect(
        reservasService.crear({
          usuarioId: USUARIO_A_ID,
          plazaId: 10,
          fechaInicio: "2026-11-01T10:00:00Z",
          fechaFin: "2026-11-01T12:00:00Z",
        }),
      ).rejects.toThrow("No puedes reservar tu propia plaza de aparcamiento");
    });

    it("impide reservar si existe solapamiento con otra reserva activa", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({ id: USUARIO_A_ID });
      mockPrisma.plaza.findUnique.mockResolvedValue({
        id: 20,
        propietarioId: USUARIO_B_ID,
        disponible: true,
      });
      mockPrisma.reserva.findFirst.mockResolvedValue({
        id: 999,
        plazaId: 20,
        estado: "CONFIRMADA",
      });

      await expect(
        reservasService.crear({
          usuarioId: USUARIO_A_ID,
          plazaId: 20,
          fechaInicio: "2026-11-01T10:00:00Z",
          fechaFin: "2026-11-01T12:00:00Z",
        }),
      ).rejects.toThrow("La plaza ya cuenta con una reserva activa en las fechas seleccionadas");
    });

    it("impide confirmar una reserva si concurre solapada con otra ya confirmada", async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id: 504,
        usuarioId: USUARIO_A_ID,
        plazaId: 20,
        estado: "PENDIENTE",
        fechaInicio: new Date("2026-11-01T10:00:00Z"),
        fechaFin: new Date("2026-11-01T12:00:00Z"),
        plaza: { propietarioId: USUARIO_B_ID },
      });
      // Existe otra reserva confirmada en ese intervalo
      mockPrisma.reserva.findFirst.mockResolvedValue({
        id: 505,
        plazaId: 20,
        estado: "CONFIRMADA",
      });

      await expect(
        reservasService.actualizarEstadoPorUsuario(504, USUARIO_B_ID, false, "CONFIRMADA" as any),
      ).rejects.toThrow("No se puede confirmar la reserva: la plaza ya cuenta con otra reserva confirmada");
    });
  });
});
