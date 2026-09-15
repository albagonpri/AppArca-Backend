import { EstadoReserva, Reserva as PrismaReserva } from '@prisma/client';

/**
 * Tipo de dominio para la entidad Reserva y su enumeración de estados.
 */
export type ReservaModel = PrismaReserva;
export { EstadoReserva };
