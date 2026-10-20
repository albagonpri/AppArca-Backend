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
import { CrearVehiculoDto } from "../dto/vehiculos/crear-vehiculo.dto.js";
import { ActualizarVehiculoDto } from "../dto/vehiculos/actualizar-vehiculo.dto.js";
import { JwtGuard } from "../guards/jwt.guard.js";
import { UsuarioActual } from "../decorators/usuario-actual.decorator.js";
import { VehiculosService } from "../services/vehiculos.service.js";
import { PaginacionDto } from "../dto/comun/paginacion.dto.js";

@ApiTags("Vehiculos")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("vehiculos")
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}


  @Post()
  @ApiOperation({ summary: "Crear un nuevo vehículo para el usuario autenticado" })
  @ApiResponse({ status: 201, description: "Vehículo creado exitosamente" })
  @ApiResponse({ status: 400, description: "Datos de entrada inválidos" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  async crear(@UsuarioActual("sub") usuarioId: number, @Body() dto: CrearVehiculoDto) {
    return this.vehiculosService.crear(usuarioId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Obtener todos los vehículos del usuario autenticado de forma paginada" })
  @ApiResponse({ status: 200, description: "Lista paginada de vehículos obtenida exitosamente" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  async obtenerTodos(@UsuarioActual("sub") usuarioId: number, @Query() paginacion: PaginacionDto) {
    return this.vehiculosService.obtenerTodos(usuarioId, paginacion);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener un vehículo del usuario autenticado por su ID" })
  @ApiParam({ name: "id", description: "ID del vehículo", type: Number })
  @ApiResponse({ status: 200, description: "Vehículo encontrado exitosamente" })
  @ApiResponse({ status: 400, description: "ID de vehículo inválido" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 404, description: "Vehículo no encontrado" })
  async obtenerPorId(
    @UsuarioActual("sub") usuarioId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.vehiculosService.obtenerPorId(usuarioId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar un vehículo del usuario autenticado" })
  @ApiParam({ name: "id", description: "ID del vehículo", type: Number })
  @ApiResponse({ status: 200, description: "Vehículo actualizado exitosamente" })
  @ApiResponse({ status: 400, description: "Datos de entrada o ID inválidos" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 404, description: "Vehículo no encontrado" })
  async actualizar(
    @UsuarioActual("sub") usuarioId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarVehiculoDto,
  ) {
    return this.vehiculosService.actualizar(usuarioId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Eliminar un vehículo del usuario autenticado" })
  @ApiParam({ name: "id", description: "ID del vehículo", type: Number })
  @ApiResponse({ status: 200, description: "Vehículo eliminado exitosamente" })
  @ApiResponse({ status: 400, description: "ID de vehículo inválido" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 404, description: "Vehículo no encontrado" })
  async eliminar(
    @UsuarioActual("sub") usuarioId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.vehiculosService.eliminar(usuarioId, id);
  }
}
