
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { ReservasService } from "./reservas.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { ConflictException } from "@nestjs/common";
import { crearUsuario, crearPlaza } from "../test/helpers.js";

/**
 * Integración real contra PostgreSQL (app_arca_test).
 * Verifica que la transacción SERIALIZABLE + retry evita solapamientos simultáneos.
 */
describe("ReservasService concurrency integration", () => {
  let moduleRef: TestingModule;
  let reservasService: ReservasService;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Forzar conexión a la BD de test
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/app_arca_test?schema=public";
    moduleRef = await Test.createTestingModule({
      providers: [ReservasService, PrismaService],
    }).compile();
    reservasService = moduleRef.get<ReservasService>(ReservasService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Limpiar tablas entre tests
    await prisma.reserva.deleteMany();
    await prisma.plaza.deleteMany();
    await prisma.usuario.deleteMany();
  });

  it("previene solapamiento de reservas simultáneas (check‑then‑create)", async () => {
    // Crear usuarios y una plaza
    const propietario = await crearUsuario(prisma, { correo: "owner@example.com" });
    const conductor = await crearUsuario(prisma, { correo: "driver@example.com" });
    const plaza = await crearPlaza(prisma, { propietarioId: propietario.id, disponible: true });

    const dto = {
      usuarioId: conductor.id,
      plazaId: plaza.id,
      fechaInicio: new Date("2030-01-01T10:00:00Z"),
      fechaFin: new Date("2030-01-01T12:00:00Z"),
    };

    // Lanzar dos creaciones concurrentes idénticas
    const resultados = await Promise.allSettled([
      reservasService.crear(dto as any),
      reservasService.crear(dto as any),
    ]);

    const exitos = resultados.filter(r => r.status === "fulfilled");
    const rechazos = resultados.filter(r => r.status === "rejected");
    expect(exitos).toHaveLength(1);
    expect(rechazos).toHaveLength(1);
    const error = (rechazos[0] as PromiseRejectedResult).reason;
    expect(error).toBeInstanceOf(ConflictException);
  });

  it("previene confirmación simultánea de reservas conflictivas", async () => {
    const propietario = await crearUsuario(prisma, { correo: "owner2@example.com" });
    const conductorA = await crearUsuario(prisma, { correo: "driverA@example.com" });
    const conductorB = await crearUsuario(prisma, { correo: "driverB@example.com" });
    const plaza = await crearPlaza(prisma, { propietarioId: propietario.id, disponible: true });

    const dtoA = { usuarioId: conductorA.id, plazaId: plaza.id, fechaInicio: new Date("2030-02-01T08:00:00Z"), fechaFin: new Date("2030-02-01T10:00:00Z") };
    const dtoB = { usuarioId: conductorB.id, plazaId: plaza.id, fechaInicio: new Date("2030-02-01T09:00:00Z"), fechaFin: new Date("2030-02-01T11:00:00Z") };

    const reservaA = await reservasService.crear(dtoA as any);
    const reservaB = await reservasService.crear(dtoB as any);

    // Intentar confirmar ambas a la vez (propietario lo hace)
    const confirmar = async (id: number) => {
      return reservasService.actualizarEstadoPorUsuario(id, propietario.id, "CONFIRMADA");
    };

    const resultados = await Promise.allSettled([
      confirmar(reservaA.id),
      confirmar(reservaB.id),
    ]);

    const exitos = resultados.filter(r => r.status === "fulfilled");
    const rechazos = resultados.filter(r => r.status === "rejected");
    expect(exitos).toHaveLength(1);
    expect(rechazos).toHaveLength(1);
    const error = (rechazos[0] as PromiseRejectedResult).reason;
    expect(error).toBeInstanceOf(ConflictException);
  });
});
