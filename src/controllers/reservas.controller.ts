import {
  Body,
  Controller,
  ForbiddenException,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { EstadoReserva } from "@prisma/client";
import { ReservasService } from "../services/reservas.service.js";
import { CrearReservaDto } from "../dto/reservas/crear-reserva.dto.js";
import { ActualizarEstadoReservaDto } from "../dto/reservas/actualizar-estado-reserva.dto.js";
import { PaginacionDto } from "../dto/comun/paginacion.dto.js";
import { JwtGuard, type JwtPayload } from "../guards/jwt.guard.js";
import { UsuarioActual } from "../decorators/usuario-actual.decorator.js";

@ApiTags("Reservas")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("reservas")
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}


  @Post()
  @ApiOperation({ summary: "Crear una nueva reserva para el usuario autenticado" })
  @ApiResponse({ status: 201, description: "Reserva creada exitosamente" })
  @ApiResponse({ status: 400, description: "Datos de entrada inválidos o rango de fechas incorrecto" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Prohibido - No puedes crear una reserva a nombre de otro usuario" })
  @ApiResponse({ status: 404, description: "El usuario o la plaza no existen" })
  async crear(@UsuarioActual() usuario: JwtPayload, @Body() dto: CrearReservaDto) {

    if (dto.usuarioId && dto.usuarioId !== usuario.sub && !usuario.esAdmin) {
      throw new ForbiddenException("No puedes crear una reserva a nombre de otro usuario");
    }

    const usuarioId = usuario.esAdmin && dto.usuarioId ? dto.usuarioId : usuario.sub;

    return this.reservasService.crear({
      ...dto,
      usuarioId,
    });
  }

  @Get()
  @ApiOperation({
    summary: "Obtener las reservas del usuario autenticado (propias o recibidas) de forma paginada",
  })
  @ApiQuery({
    name: "tipo",
    required: false,
    enum: ["propias", "recibidas"],
    description: "Tipo de reservas: propias (conductor) o recibidas (propietario de plaza)",
  })
  @ApiQuery({
    name: "estado",
    required: false,
    enum: EstadoReserva,
    description: "Filtrar por estado de la reserva",
  })
  @ApiResponse({ status: 200, description: "Lista paginada de reservas autorizadas" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  async obtenerTodas(
    @UsuarioActual() usuario: JwtPayload,
    @Query() paginacion: PaginacionDto,
    @Query("tipo") tipo?: "propias" | "recibidas",
    @Query("estado") estado?: EstadoReserva,
  ) {
    return this.reservasService.obtenerUsuarioReservas(
      usuario.sub,
      tipo || "propias",
      paginacion,
      estado,
    );
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtener una reserva por su ID (requiere ser conductor, propietario de la plaza o administrador)",
  })
  @ApiParam({ name: "id", description: "ID de la reserva", type: Number })
  @ApiResponse({ status: 200, description: "Reserva encontrada exitosamente" })
  @ApiResponse({ status: 400, description: "ID de reserva inválido" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Prohibido - No tienes permiso para consultar esta reserva" })
  @ApiResponse({ status: 404, description: "Reserva no encontrada" })
  async obtenerPorId(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.reservasService.obtenerPorId(id, usuario.sub, usuario.esAdmin);
  }
  @Patch(":id")
  @ApiOperation({
    summary: "Actualizar estado de una reserva (cancelación por conductor, confirmación/rechazo por propietario o gestión por admin)",
  })
  @ApiParam({ name: "id", description: "ID de la reserva", type: Number })
  @ApiResponse({ status: 200, description: "Estado de la reserva actualizado" })
  @ApiResponse({ status: 400, description: "Transición de estado no permitida o datos inválidos" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Prohibido - No tienes permiso para modificar esta reserva" })
  @ApiResponse({ status: 404, description: "Reserva no encontrada" })
  async actualizarEstado(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarEstadoReservaDto,
  ) {
    return this.reservasService.actualizarEstadoPorUsuario(
      id,
      usuario.sub,
      !!usuario.esAdmin,
      dto.estado,
    );
  }
}
