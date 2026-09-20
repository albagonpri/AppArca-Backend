import { Usuario as PrismaUsuario } from '@prisma/client';

/**
 * Tipo de dominio para la entidad Usuario basado en el modelo de Prisma.
 */
export type UsuarioModel = PrismaUsuario;

/**
 * Selector de Prisma para obtener únicamente los campos públicos de un usuario,
 * garantizando que contrasenaHash nunca se exponga en respuestas HTTP.
 */
export const usuarioSelectPublico = {
  id: true,
  nombre: true,
  correo: true,
  fechaCreacion: true,
  fechaActualizacion: true,
} as const;

export type UsuarioPublico = Omit<PrismaUsuario, 'contrasenaHash'>;
