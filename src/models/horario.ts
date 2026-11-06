// Minutos desde medianoche en España peninsular. 1440 representa el final del día.
export type Franja = { inicio: number; fin: number };
export type Excepcion = {
  fecha: string;
  modo: 'ofrecer' | 'bloquear';
  franjas: Franja[];
};
export type TipoDisponibilidad = "HABITUAL" | "PUNTUAL";
export type Horario = { semana: Franja[][]; excepciones: Excepcion[] };

export function validarHorario(h: Horario, tipo: TipoDisponibilidad = "HABITUAL"): string | null {
  if (
    !h ||
    !Array.isArray(h.semana) ||
    h.semana.length !== 7 ||
    !Array.isArray(h.excepciones)
  )
    return 'Configura los siete días de la semana.';
  if (tipo !== "HABITUAL" && tipo !== "PUNTUAL") return "Selecciona el tipo de disponibilidad.";
  if (tipo === "PUNTUAL" && (!h.excepciones.length || h.semana.some(dia => !Array.isArray(dia) || dia.length)))
    return "La disponibilidad puntual requiere fechas concretas y ningún horario semanal.";
  const fechas = new Set<string>();
  for (const e of h.excepciones) {
    if (
      !e ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.fecha) ||
      !Number.isFinite(Date.parse(e.fecha)) ||
      new Date(e.fecha).toISOString().slice(0, 10) !== e.fecha
    )
      return 'Selecciona una fecha válida para cada día.';
    if (fechas.has(e.fecha)) return 'Esa fecha ya está configurada.';
    if (tipo === "PUNTUAL" && (e.modo !== "ofrecer" || !Array.isArray(e.franjas) || !e.franjas.length))
      return "Añade al menos una franja disponible para cada fecha.";
    fechas.add(e.fecha);
    if (!['ofrecer', 'bloquear'].includes(e.modo))
      return 'Selecciona el tipo de excepción.';
  }
  for (const grupo of [...h.semana, ...h.excepciones.map((e) => e.franjas)]) {
    if (!Array.isArray(grupo)) return 'Indica las franjas del día.';
    for (const f of grupo) {
      if (
        !f ||
        !Number.isInteger(f.inicio) ||
        !Number.isInteger(f.fin) ||
        f.inicio < 0 ||
        f.fin > 1440 ||
        f.fin <= f.inicio
      )
        return 'La hora de fin debe ser posterior al inicio. Divide los horarios nocturnos entre los dos días.';
    }
    const ordenadas = [...grupo].sort((a, b) => a.inicio - b.inicio);
    if (ordenadas.some((f, i) => i > 0 && f.inicio < ordenadas[i - 1].fin))
      return 'Hay franjas solapadas en el mismo día.';
  }
  return null;
}

export function franjasDelDia(h: Horario, fecha: string): Franja[] {
  const base = h.semana[(new Date(fecha).getUTCDay() + 6) % 7];
  const excepcion = h.excepciones.find((e) => e.fecha === fecha);
  if (!excepcion) return [...base];
  if (excepcion.modo === 'ofrecer') return [...excepcion.franjas];
  if (!excepcion.franjas.length) return [];
  let disponibles = base;
  for (const bloqueo of excepcion.franjas) {
    disponibles = disponibles.flatMap((f) =>
      [
        { inicio: f.inicio, fin: Math.min(f.fin, bloqueo.inicio) },
        { inicio: Math.max(f.inicio, bloqueo.fin), fin: f.fin },
      ].filter((parte) => parte.inicio < parte.fin),
    );
  }
  return disponibles;
}
