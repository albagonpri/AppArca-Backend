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
  UseGuards,
} from "@nestjs/common";
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
  @ApiOperation({ summary: "Obtener la lista paginada de todas las plazas públicas" })
  @ApiResponse({ status: 200, description: "Lista paginada de plazas obtenida exitosamente" })
  async obtenerTodas(@Query() paginacion: PaginacionDto) {
    return this.plazasService.obtenerTodas(paginacion);
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

  @Get(":id")
  @ApiOperation({ summary: "Obtener una plaza por su ID" })
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
}
