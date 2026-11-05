import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PlazasService } from "../services/plazas.service.js";
import { CrearPlazaDto } from "../dto/plazas/crear-plaza.dto.js";
import { ActualizarPlazaDto } from "../dto/plazas/actualizar-plaza.dto.js";
import { FiltrarPlazasDto } from "../dto/plazas/filtrar-plazas.dto.js";
import { JwtGuard, type JwtPayload } from "../guards/jwt.guard.js";
import { UsuarioActual } from "../decorators/usuario-actual.decorator.js";
import { PaginacionDto } from "../dto/comun/paginacion.dto.js";

@ApiTags("Plazas")
@Controller("plazas")
export class PlazasController {
  constructor(private readonly plazasService: PlazasService) {}


  @UseGuards(JwtGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crear una nueva plaza (asociada al usuario autenticado)" })
  @ApiResponse({ status: 201, description: "Plaza creada exitosamente" })
  @ApiResponse({ status: 400, description: "Datos de entrada inválidos" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 404, description: "El usuario propietario no existe" })
  async crear(@UsuarioActual() usuario: JwtPayload, @Body() dto: CrearPlazaDto) {
    return this.plazasService.crear(usuario.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: "Obtener la lista paginada de todas las plazas públicas con filtros opcionales" })
  @ApiResponse({ status: 200, description: "Lista paginada de plazas obtenida exitosamente" })
  async obtenerTodas(@Query() filtros: FiltrarPlazasDto) {
    return this.plazasService.obtenerTodas(filtros);
  }

  @UseGuards(JwtGuard)
  @Get("mis-plazas")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener las plazas publicadas por el usuario autenticado de forma paginada" })
  @ApiResponse({ status: 200, description: "Lista paginada de plazas del usuario obtenida exitosamente" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  async obtenerMisPlazas(@UsuarioActual() usuario: JwtPayload, @Query() paginacion: PaginacionDto) {
    return this.plazasService.obtenerMisPlazas(usuario.sub, paginacion);
  }

  @Get("mapa")
  @ApiOperation({ summary: "Obtener los marcadores de plazas disponibles para el mapa interactivo con filtros opcionales" })
  @ApiResponse({ status: 200, description: "Lista de marcadores públicos de plazas para el mapa" })
  async obtenerMarcadoresMapa(@Query() filtros: FiltrarPlazasDto) {
    return this.plazasService.obtenerMarcadoresMapa(filtros);
  }

  @Get("fotos/:nombreArchivo")
  @ApiOperation({ summary: "Obtener y servir una fotografía de una plaza de forma pública" })
  @ApiParam({ name: "nombreArchivo", description: "Nombre del archivo de imagen" })
  @ApiResponse({ status: 200, description: "Archivo de imagen servido correctamente" })
  @ApiResponse({ status: 400, description: "Nombre de archivo inválido" })
  @ApiResponse({ status: 404, description: "Fotografía no encontrada" })
  servirFoto(
    @Param("nombreArchivo") nombreArchivo: string,
    @Res() res: Response,
  ) {
    return this.plazasService.servirFoto(nombreArchivo, res);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener una plaza pública por su ID" })
  @ApiParam({ name: "id", description: "ID de la plaza", type: Number })
  @ApiResponse({ status: 200, description: "Plaza encontrada exitosamente" })
  @ApiResponse({ status: 400, description: "ID de plaza inválido" })
  @ApiResponse({ status: 404, description: "Plaza no encontrada" })
  async obtenerPorId(@Param("id", ParseIntPipe) id: number) {
    return this.plazasService.obtenerPorId(id);
  }

  @UseGuards(JwtGuard)
  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar una plaza publicada por el usuario autenticado" })
  @ApiParam({ name: "id", description: "ID de la plaza a actualizar", type: Number })
  @ApiResponse({ status: 200, description: "Plaza actualizada exitosamente" })
  @ApiResponse({ status: 400, description: "Datos de entrada o ID inválidos" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Prohibido - La plaza no pertenece al usuario autenticado" })
  @ApiResponse({ status: 404, description: "Plaza no encontrada" })
  async actualizar(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarPlazaDto,
  ) {
    return this.plazasService.actualizar(usuario.sub, id, dto);
  }

  @UseGuards(JwtGuard)
  @Delete(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Eliminar una plaza publicada por el usuario autenticado" })
  @ApiParam({ name: "id", description: "ID de la plaza a eliminar", type: Number })
  @ApiResponse({ status: 200, description: "Plaza eliminada exitosamente" })
  @ApiResponse({ status: 400, description: "ID de plaza inválido" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Prohibido - La plaza no pertenece al usuario autenticado" })
  @ApiResponse({ status: 404, description: "Plaza no encontrada" })
  async eliminar(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.plazasService.eliminar(usuario.sub, id);
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @Get(":id/reservas")
  @ApiOperation({
    summary: "Obtener las reservas asociadas a una plaza de forma paginada (solo el propietario o administrador)",
  })
  @ApiParam({ name: "id", description: "ID de la plaza", type: Number })
  @ApiResponse({ status: 200, description: "Lista paginada de reservas de la plaza" })
  @ApiResponse({ status: 400, description: "ID de plaza inválido" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Prohibido - No eres el propietario de esta plaza" })
  @ApiResponse({ status: 404, description: "Plaza no encontrada" })
  async obtenerReservas(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @Query() paginacion: PaginacionDto,
  ) {
    return this.plazasService.obtenerReservas(id, usuario.sub, usuario.esAdmin, paginacion);
  }

  @UseGuards(JwtGuard)
  @Post(":id/fotos")
  @ApiBearerAuth()
  @UseInterceptors(
    FilesInterceptor("fotos", 5, {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: "Subir hasta 5 fotografías para una plaza (solo propietario o administrador)",
  })
  @ApiParam({ name: "id", description: "ID de la plaza", type: Number })
  @ApiResponse({ status: 201, description: "Fotografías subidas exitosamente" })
  @ApiResponse({
    status: 400,
    description: "Archivos inválidos o supera el límite de 5 fotografías",
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({
    status: 403,
    description: "Prohibido - No eres el propietario de esta plaza",
  })
  @ApiResponse({ status: 404, description: "Plaza no encontrada" })
  async subirFotos(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @UploadedFiles()
    fotos: Array<{
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }>,
  ) {
    return this.plazasService.guardarFotos(
      usuario.sub,
      Boolean(usuario.esAdmin),
      id,
      fotos,
    );
  }

  @UseGuards(JwtGuard)
  @Delete(":id/fotos/:fotoId")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Eliminar una fotografía de una plaza (solo propietario o administrador)",
  })
  @ApiParam({ name: "id", description: "ID de la plaza", type: Number })
  @ApiParam({ name: "fotoId", description: "ID de la fotografía", type: Number })
  @ApiResponse({ status: 200, description: "Fotografía eliminada exitosamente" })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({
    status: 403,
    description: "Prohibido - No eres el propietario de esta plaza",
  })
  @ApiResponse({ status: 404, description: "Plaza o fotografía no encontrada" })
  async eliminarFoto(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @Param("fotoId", ParseIntPipe) fotoId: number,
  ) {
    return this.plazasService.eliminarFoto(
      usuario.sub,
      Boolean(usuario.esAdmin),
      id,
      fotoId,
    );
  }
}
