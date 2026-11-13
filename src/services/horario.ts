import { BadRequestException } from '@nestjs/common';
import {
  franjasDelDia,
  validarHorario,
  type Horario,
  type TipoDisponibilidad,
} from '../models/horario.js';

export function comprobarConfiguracion(horario: Horario, tipo?: TipoDisponibilidad) {
  const error = validarHorario(horario, tipo);
  if (error) throw new BadRequestException(error);
  return horario;
}

const madrid = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

export function cubrePeriodo(
  config: unknown,
  inicio: Date,
  fin: Date,
): boolean {
  if (!config) return true;
  const h = config as Horario;
  const semanaCompleta = h.semana.every(
    (dia) => dia.reduce((suma, f) => suma + f.fin - f.inicio, 0) === 1440,
  );
  if (semanaCompleta) {
    // Solo las fechas excepcionales pueden interrumpir una plaza abierta toda la semana.
    return h.excepciones.every((e) => {
      const medianocheUTC = Date.parse(e.fecha);
      const desde = Math.max(+inicio, medianocheUTC - 2 * 3600000);
      const hasta = Math.min(+fin, medianocheUTC + 24 * 3600000);
      return desde >= hasta || comprobarHoras(h, desde, hasta);
    });
  }
  return comprobarHoras(h, +inicio, +fin);
}

function comprobarHoras(h: Horario, inicio: number, fin: number): boolean {
  const hora = 3600000;
  // Cada segmento UTC conserva tanto el día como la hora civil, incluso al cambiar de huso.
  for (let t = inicio; t < +fin;) {
    const partes = madrid.formatToParts(t);
    const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
    const fecha = [valor('year'), valor('month'), valor('day')].join('-');
    const siguiente = Math.min(+fin, t - (t % hora) + hora);
    let minuto = Number(valor('hour')) * 60 + (t % hora) / 60000;
    const hasta = minuto + (siguiente - t) / 60000;
    for (const f of franjasDelDia(h, fecha).sort(
      (a, b) => a.inicio - b.inicio,
    )) {
      if (f.inicio > minuto) break;
      minuto = Math.max(minuto, f.fin);
    }
    if (minuto < hasta) return false;
    t = siguiente;
  }
  return true;
}
