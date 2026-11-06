import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import {
  PaginacionDto,
  RespuestaPaginada,
  crearRespuestaPaginada,
} from "../dto/comun/paginacion.dto.js";
import { propietarioSelectPublico } from "../models/usuario.model.js";
import { sanitizarPlazaPublica } from "./plazas.service.js";

@Injectable()
export class FavoritosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Añade una plaza a los favoritos del usuario autenticado de forma idempotente.
   */
  async marcarFavorito(usuarioId: number, plazaId: number) {
    const plaza = await this.prisma.plaza.findUnique({
      where: { id: plazaId },
    });

    if (!plaza) {
      throw new NotFoundException(`Plaza con ID ${plazaId} no encontrada`);
    }

    const favorito = await this.prisma.favorito.upsert({
      where: {
        usuarioId_plazaId: {
          usuarioId,
          plazaId,
        },
      },
      update: {},
      create: {
        usuarioId,
        plazaId,
      },
    });

    return {
      esFavorito: true,
      mensaje: "Plaza guardada en favoritos",
      favorito,
    };
  }

  /**
   * Elimina una plaza de los favoritos del usuario autenticado.
   */
  async desmarcarFavorito(usuarioId: number, plazaId: number) {
    const plaza = await this.prisma.plaza.findUnique({
      where: { id: plazaId },
    });

    if (!plaza) {
      throw new NotFoundException(`Plaza con ID ${plazaId} no encontrada`);
    }

    await this.prisma.favorito.deleteMany({
      where: {
        usuarioId,
        plazaId,
      },
    });

    return {
      esFavorito: false,
      mensaje: "Plaza eliminada de favoritos",
    };
  }

  /**
   * Alterna el estado de favorito de una plaza con una sola llamada.
   */
  async alternarFavorito(usuarioId: number, plazaId: number) {
    const plaza = await this.prisma.plaza.findUnique({
      where: { id: plazaId },
    });

    if (!plaza) {
      throw new NotFoundException(`Plaza con ID ${plazaId} no encontrada`);
    }

    const existente = await this.prisma.favorito.findUnique({
      where: {
        usuarioId_plazaId: {
          usuarioId,
          plazaId,
        },
      },
    });

    if (existente) {
      await this.prisma.favorito.delete({
        where: { id: existente.id },
      });
      return {
        esFavorito: false,
        mensaje: "Plaza eliminada de favoritos",
      };
    } else {
      await this.prisma.favorito.create({
        data: {
          usuarioId,
          plazaId,
        },
      });
      return {
        esFavorito: true,
        mensaje: "Plaza añadida a favoritos",
      };
    }
  }

  /**
   * Obtiene la lista de IDs de plazas favoritas del usuario autenticado.
   */
  async obtenerIdsFavoritos(usuarioId: number): Promise<number[]> {
    const favoritos = await this.prisma.favorito.findMany({
      where: { usuarioId },
      select: { plazaId: true },
    });
    return favoritos.map((f) => f.plazaId);
  }

  /**
   * Obtiene la lista paginada de plazas favoritas del usuario autenticado.
   */
  async obtenerMisFavoritos(
    usuarioId: number,
    paginacion: PaginacionDto = new PaginacionDto(),
  ): Promise<RespuestaPaginada<any>> {
    const where = { usuarioId };
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const [data, total] = await Promise.all([
      this.prisma.favorito.findMany({
        where,
        skip,
        take,
        include: {
          plaza: {
            include: {
              propietario: {
                select: propietarioSelectPublico,
              },
              fotos: {
                orderBy: { orden: "asc" },
              },
            },
          },
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.favorito.count({ where }),
    ]);

    const plazas = data
      .filter((item) => item.plaza !== null)
      .map((item) => sanitizarPlazaPublica(item.plaza));

    return crearRespuestaPaginada(plazas, total, paginacion.page, paginacion.limit);
  }
}

