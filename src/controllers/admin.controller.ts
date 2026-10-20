import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { AdminGuard } from "../guards/admin.guard.js";
import { UsuariosService } from "../services/usuarios.service.js";
import { PlazasService } from "../services/plazas.service.js";
import { ReservasService } from "../services/reservas.service.js";
import { ActualizarUsuarioDto } from "../dto/usuarios/actualizar-usuario.dto.js";
import { ActualizarPlazaDto } from "../dto/plazas/actualizar-plaza.dto.js";
import { ActualizarEstadoReservaDto } from "../dto/reservas/actualizar-estado-reserva.dto.js";
import { PaginacionDto } from "../dto/comun/paginacion.dto.js";

@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly plazasService: PlazasService,
    private readonly reservasService: ReservasService,
  ) {}

  // ==================== USUARIOS ====================

  @Get("usuarios")
  @ApiOperation({ summary: "Listar todos los usuarios para administración de forma paginada" })
  @ApiResponse({ status: 200, description: "Lista paginada de usuarios" })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({ status: 403, description: "Acceso restringido a administradores" })
  async obtenerUsuarios(@Query() paginacion: PaginacionDto) {
    return this.usuariosService.obtenerTodos(paginacion);
  }

  @Get("usuarios/:id")
  @ApiOperation({ summary: "Obtener detalle de un usuario" })
  @ApiParam({ name: "id", type: Number })
  async obtenerUsuarioPorId(@Param("id", ParseIntPipe) id: number) {
    return this.usuariosService.obtenerPorId(id);
  }

  @Patch("usuarios/:id")
  @ApiOperation({ summary: "Modificar datos básicos de un usuario" })
  @ApiParam({ name: "id", type: Number })
  async actualizarUsuario(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.usuariosService.actualizar(id, dto);
  }

  @Delete("usuarios/:id")
  @ApiOperation({ summary: "Eliminar un usuario (conservador: solo si no tiene plazas ni reservas vinculadas)" })
  @ApiParam({ name: "id", type: Number })
  async eliminarUsuario(@Param("id", ParseIntPipe) id: number) {
    return this.usuariosService.eliminar(id);
  }

  // ==================== PLAZAS ====================

  @Get("plazas")
  @ApiOperation({ summary: "Listar todas las plazas para administración de forma paginada" })
  @ApiResponse({ status: 200, description: "Lista paginada de plazas" })
  async obtenerPlazas(@Query() paginacion: PaginacionDto) {
    return this.plazasService.obtenerTodas(paginacion);
  }

  @Get("plazas/:id")
  @ApiOperation({ summary: "Obtener detalle de una plaza" })
  @ApiParam({ name: "id", type: Number })
  async obtenerPlazaPorId(@Param("id", ParseIntPipe) id: number) {
    return this.plazasService.obtenerPorId(id);
  }

  @Patch("plazas/:id")
  @ApiOperation({ summary: "Modificar datos de una plaza como administrador" })
  @ApiParam({ name: "id", type: Number })
  async actualizarPlaza(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarPlazaDto,
  ) {
    return this.plazasService.actualizarComoAdmin(id, dto);
  }

  @Delete("plazas/:id")
  @ApiOperation({ summary: "Eliminar una plaza como administrador" })
  @ApiParam({ name: "id", type: Number })
  async eliminarPlaza(@Param("id", ParseIntPipe) id: number) {
    return this.plazasService.eliminarComoAdmin(id);
  }

  // ==================== RESERVAS ====================

  @Get("reservas")
  @ApiOperation({ summary: "Listar todas las reservas para administración de forma paginada" })
  @ApiResponse({ status: 200, description: "Lista paginada de reservas" })
  async obtenerReservas(@Query() paginacion: PaginacionDto) {
    return this.reservasService.obtenerTodas(paginacion);
  }

  @Get("reservas/:id")
  @ApiOperation({ summary: "Obtener detalle de una reserva" })
  @ApiParam({ name: "id", type: Number })
  async obtenerReservaPorId(@Param("id", ParseIntPipe) id: number) {
    return this.reservasService.obtenerPorId(id);
  }

  @Patch("reservas/:id")
  @ApiOperation({ summary: "Modificar el estado de una reserva" })
  @ApiParam({ name: "id", type: Number })
  async actualizarEstadoReserva(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarEstadoReservaDto,
  ) {
    return this.reservasService.actualizarEstadoComoAdmin(id, dto.estado);
  }

  @Delete("reservas/:id")
  @ApiOperation({ summary: "Cancelar/eliminar una reserva" })
  @ApiParam({ name: "id", type: Number })
  async eliminarReserva(@Param("id", ParseIntPipe) id: number) {
    return this.reservasService.eliminarComoAdmin(id);
  }
}
