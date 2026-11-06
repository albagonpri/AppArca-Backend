import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import { ReservasService } from './reservas.service.js';
import { PlazasService } from './plazas.service.js';
import { GeocodingService } from './geocoding.service.js';
import type { Horario } from '../models/horario.js';

describe('Disponibilidad con PostgreSQL', () => {
  const prisma = new PrismaService({
    datasourceUrl:
      process.env.TEST_DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/app_arca_test',
  });
  const reservas = new ReservasService(prisma);
  const plazas = new PlazasService(prisma, new GeocodingService());
  const usuarios: number[] = [];
  let id: number;
  const horario: Horario = {
    semana: Array.from({ length: 7 }, () => [
      { inicio: 480, fin: 840 },
      { inicio: 960, fin: 1320 },
    ]),
    excepciones: [
      { fecha: '2090-01-11', modo: 'bloquear', franjas: [] },
      {
        fecha: '2090-01-12',
        modo: 'bloquear',
        franjas: [{ inicio: 600, fin: 780 }],
      },
    ],
  };
  const dto = (desde: string, hasta: string, dia = '10') => ({
    usuarioId: usuarios[1],
    plazaId: id,
    fechaInicio: '2090-01-' + dia + 'T' + desde + ':00+01:00',
    fechaFin: '2090-01-' + dia + 'T' + hasta + ':00+01:00',
  });
  beforeAll(async () => {
    for (const nombre of ['Propietario', 'Conductor A', 'Conductor B']) {
      const u = await prisma.usuario.create({
        data: { nombre, correo: randomUUID() + '@example.test' },
      });
      usuarios.push(u.id);
    }
    const plaza = await plazas.crear(usuarios[0], {
      titulo: 'Prueba de disponibilidad',
      calle: 'Calle Prueba',
      numero: '1',
      ciudad: 'Madrid',
      codigoPostal: '28001',
      latitud: 40.4,
      longitud: -3.7,
      largo: 5,
      ancho: 2,
      precioHora: 1,
      horario,
    });
    id = plaza.id;
  });
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
    await prisma.$disconnect();
  });
  it('persiste el horario, aplica excepciones y exige propiedad', async () => {
    expect((await plazas.obtenerPorId(id)).horario).toEqual(horario);
    await expect(
      plazas.actualizar(usuarios[1], id, { horario }),
    ).rejects.toThrow('permiso');
    const extendido = {
      ...horario,
      excepciones: [
        ...horario.excepciones,
        {
          fecha: '2090-01-13',
          modo: 'ofrecer' as const,
          franjas: [{ inicio: 300, fin: 420 }],
        },
      ],
    };
    await plazas.actualizar(usuarios[0], id, { horario: extendido });
    await expect(
      reservas.crear(dto('05:00', '07:00', '13')),
    ).resolves.toHaveProperty('id');
    for (const d of [
      dto('13:00', '15:00'),
      dto('10:00', '11:00', '11'),
      dto('09:30', '10:30', '12'),
    ])
      await expect(reservas.crear(d)).rejects.toThrow('periodo');
  });
  it('serializa solicitudes, permite adyacencia, protege la confirmación y libera al cancelar', async () => {
    const turno = dto('10:00', '12:00');
    const resultados = await Promise.allSettled([
      reservas.crear(turno),
      reservas.crear({ ...turno, usuarioId: usuarios[2] }),
    ]);
    const exitos = resultados.filter((r) => r.status === 'fulfilled');
    expect(exitos).toHaveLength(1);
    const reserva = exitos[0].value;
    for (const d of [dto('09:00', '11:00'), dto('10:30', '11:30'), turno])
      await expect(reservas.crear(d)).rejects.toThrow('reserva activa');
    for (const d of [dto('08:00', '10:00'), dto('12:00', '14:00')])
      await expect(reservas.crear(d)).resolves.toHaveProperty('id');
    await reservas.actualizarEstadoPorUsuario(
      reserva.id,
      usuarios[0],
      false,
      'CONFIRMADA',
    );
    await expect(
      plazas.actualizar(usuarios[0], id, {
        horario: {
          semana: Array.from({ length: 7 }, () => []),
          excepciones: [],
        },
      }),
    ).rejects.toThrow('reserva');
    await reservas.actualizarEstadoPorUsuario(
      reserva.id,
      reserva.usuarioId,
      false,
      'CANCELADA',
    );
    expect(
      await reservas.consultar(id, turno.fechaInicio, turno.fechaFin),
    ).toEqual({ disponible: true });
    await expect(reservas.crear(turno)).resolves.toHaveProperty('id');
  });
  it('rechaza fechas pasadas y horarios inválidos enviados directamente', async () => {
    await expect(
      reservas.crear({
        ...dto('08:00', '09:00'),
        fechaInicio: '2020-01-10T08:00:00Z',
        fechaFin: '2020-01-10T09:00:00Z',
      }),
    ).rejects.toThrow('pasada');
    const semana = horario.semana.map(() => [
      { inicio: 480, fin: 600 },
      { inicio: 570, fin: 720 },
    ]);
    await expect(
      plazas.actualizar(usuarios[0], id, {
        horario: { semana, excepciones: [] },
      }),
    ).rejects.toThrow('solapadas');
  });

  it('serializa el cierre de una fecha frente a una reserva simultánea', async () => {
    const plaza = await plazas.obtenerPorId(id);
    const actual = plaza.horario as Horario;
    const propuesto: Horario = {
      ...actual,
      excepciones: [
        ...actual.excepciones,
        { fecha: '2090-01-20', modo: 'bloquear', franjas: [] },
      ],
    };
    const resultados = await Promise.allSettled([
      plazas.actualizar(usuarios[0], id, { horario: propuesto }),
      reservas.crear(dto('10:00', '12:00', '20')),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
});
