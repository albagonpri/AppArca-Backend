import { describe, it, expect } from 'vitest';
import { validarHorario, type Horario } from '../models/horario.js';
import { cubrePeriodo } from './horario.js';

const horario = (inicio: number, fin: number): Horario => ({
  semana: Array.from({ length: 7 }, () => [{ inicio, fin }]),
  excepciones: [],
});
describe('Horario peninsular', () => {
  it('valida fechas, duración, duplicados y solapamientos', () => {
    for (const f of [
      { inicio: 30, fin: 30 },
      { inicio: 20, fin: 8 },
      { inicio: -1, fin: 30 },
      { inicio: 10, fin: 1441 },
    ]) {
      const h = horario(0, 60);
      h.semana[1] = [f];
      expect(validarHorario(h)).toBeTruthy();
    }
    const h = horario(0, 60);
    h.semana[0].push({ inicio: 50, fin: 70 });
    expect(validarHorario(h)).toBeTruthy();
    h.semana[0] = [];
    h.excepciones = [{ fecha: '2030-02-30', modo: 'bloquear', franjas: [] }];
    expect(validarHorario(h)).toBeTruthy();
    h.excepciones[0].fecha = '2030-02-28';
    h.excepciones.push(h.excepciones[0]);
    expect(validarHorario(h)).toBeTruthy();
  });
  it('cubre las dos ocurrencias de la hora otoñal y salta la hora inexistente en marzo', () => {
    const cubre = (h: Horario, a: string, b: string) =>
      cubrePeriodo(h, new Date(a), new Date(b));
    expect(
      cubre(horario(120, 180), '2030-10-27T00:00Z', '2030-10-27T02:00Z'),
    ).toBe(true);
    expect(
      cubre(horario(120, 150), '2030-10-27T00:15Z', '2030-10-27T01:20Z'),
    ).toBe(false);
    const primavera = horario(60, 120);
    primavera.semana[6].push({ inicio: 180, fin: 240 });
    expect(cubre(primavera, '2030-03-31T00:00Z', '2030-03-31T02:00Z')).toBe(
      true,
    );
  });
  it('comprueba ambos días al cruzar medianoche', () => {
    const h = horario(0, 1440);
    h.excepciones = [{ fecha: '2030-01-02', modo: 'bloquear', franjas: [] }];
    const inicio = new Date('2030-01-01T22:30Z');
    expect(cubrePeriodo(h, inicio, new Date('2030-01-01T23:00Z'))).toBe(true);
    expect(cubrePeriodo(h, inicio, new Date('2030-01-01T23:01Z'))).toBe(false);
  });
});
