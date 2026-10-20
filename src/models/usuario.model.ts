import { Usuario as PrismaUsuario } from "@prisma/client";

/**
 * Tipo de dominio para la entidad Usuario basado en el modelo de Prisma.
 */
export type UsuarioModel = PrismaUsuario;

/**
 * Selector de Prisma para obtener datos del perfil de usuario autenticado o para administración,
 * garantizando que contrasenaHash nunca se exponga en respuestas HTTP.
 */
export const usuarioSelectPublico = {
  id: true,
  nombre: true,
  correo: true,
  esAdmin: true,
  fechaCreacion: true,
  fechaActualizacion: true,
} as const;

/**
 * Selector mínimo y estricto para anuncios y vistas públicas de plazas.
 * No expone correos electrónicos, roles ni fechas de registro de terceros.
 */
export const propietarioSelectPublico = {
  id: true,
  nombre: true,
} as const;

export type UsuarioPublico = Omit<PrismaUsuario, "contrasenaHash">;
export type PropietarioPublico = Pick<PrismaUsuario, "id" | "nombre">;
