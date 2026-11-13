import { EstadoReserva, Reserva as PrismaReserva } from '@prisma/client';

/**
 * Tipo de dominio para la entidad Reserva y su enumeración de estados.
 */
export type ReservaModel = PrismaReserva;
export { EstadoReserva };

/** La relación actual se usa para permisos. La respuesta muestra las condiciones pactadas. */
export function conCondicionesGuardadas<T extends { condicionesPlaza?: unknown; plaza: unknown }>(reserva: T): T {
  return reserva.condicionesPlaza ? { ...reserva, plaza: reserva.condicionesPlaza } : reserva;
}
