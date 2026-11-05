import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FavoritosService } from "../services/favoritos.service.js";
import { JwtGuard, type JwtPayload } from "../guards/jwt.guard.js";
import { UsuarioActual } from "../decorators/usuario-actual.decorator.js";
import { PaginacionDto } from "../dto/comun/paginacion.dto.js";

@ApiTags("Favoritos")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("favoritos")
export class FavoritosController {
  constructor(private readonly favoritosService: FavoritosService) {}

  @Get("ids")
  @ApiOperation({
    summary: "Obtener la lista de IDs de plazas favoritas del usuario autenticado",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de IDs de plazas favoritas obtenida exitosamente",
  })
  async obtenerIdsFavoritos(@UsuarioActual() usuario: JwtPayload) {
    return this.favoritosService.obtenerIdsFavoritos(usuario.sub);
  }

  @Get()
  @ApiOperation({
    summary: "Obtener el listado paginado de plazas favoritas del usuario autenticado",
  })
  @ApiResponse({
    status: 200,
    description: "Listado de plazas favoritas obtenido exitosamente",
  })
  async obtenerMisFavoritos(
    @UsuarioActual() usuario: JwtPayload,
    @Query() paginacion: PaginacionDto,
  ) {
    return this.favoritosService.obtenerMisFavoritos(usuario.sub, paginacion);
  }

  @Post(":plazaId")
  @ApiOperation({
    summary: "Añadir una plaza a los favoritos del usuario autenticado",
  })
  @ApiParam({ name: "plazaId", description: "ID de la plaza", type: Number })
  @ApiResponse({ status: 201, description: "Plaza guardada en favoritos" })
  @ApiResponse({ status: 404, description: "Plaza no encontrada" })
  async marcarFavorito(
    @UsuarioActual() usuario: JwtPayload,
    @Param("plazaId", ParseIntPipe) plazaId: number,
  ) {
    return this.favoritosService.marcarFavorito(usuario.sub, plazaId);
  }

  @Post(":plazaId/toggle")
  @ApiOperation({
    summary: "Alternar el estado de favorito de una plaza para el usuario autenticado",
  })
  @ApiParam({ name: "plazaId", description: "ID de la plaza", type: Number })
  @ApiResponse({ status: 200, description: "Estado de favorito alternado" })
  @ApiResponse({ status: 404, description: "Plaza no encontrada" })
  async alternarFavorito(
    @UsuarioActual() usuario: JwtPayload,
    @Param("plazaId", ParseIntPipe) plazaId: number,
  ) {
    return this.favoritosService.alternarFavorito(usuario.sub, plazaId);
  }

  @Delete(":plazaId")
  @ApiOperation({
    summary: "Eliminar una plaza de los favoritos del usuario autenticado",
  })
  @ApiParam({ name: "plazaId", description: "ID de la plaza", type: Number })
  @ApiResponse({ status: 200, description: "Plaza eliminada de favoritos" })
  @ApiResponse({ status: 404, description: "Plaza no encontrada" })
  async desmarcarFavorito(
    @UsuarioActual() usuario: JwtPayload,
    @Param("plazaId", ParseIntPipe) plazaId: number,
  ) {
    return this.favoritosService.desmarcarFavorito(usuario.sub, plazaId);
  }
}

