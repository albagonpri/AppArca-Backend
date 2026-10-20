import {
  Body,
  Controller,
  ForbiddenException,
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
import { UsuariosService } from "../services/usuarios.service.js";
import { CrearUsuarioDto } from "../dto/usuarios/crear-usuario.dto.js";
import { PaginacionDto } from "../dto/comun/paginacion.dto.js";
import { JwtGuard, type JwtPayload } from "../guards/jwt.guard.js";
import { UsuarioActual } from "../decorators/usuario-actual.decorator.js";

@ApiTags("Usuarios")
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}


  @Post()
  @ApiOperation({ summary: "Crear un nuevo usuario" })
  @ApiResponse({ status: 201, description: "Usuario creado exitosamente" })
  @ApiResponse({ status: 400, description: "Datos de entrada inválidos" })
  @ApiResponse({ status: 409, description: "El correo electrónico ya está registrado" })
  async crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: "Obtener la lista paginada de todos los usuarios (solo administradores)" })
  @ApiResponse({ status: 200, description: "Lista paginada de usuarios obtenida exitosamente" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Acceso restringido a administradores" })
  async obtenerTodos(@UsuarioActual() usuario: JwtPayload, @Query() paginacion: PaginacionDto) {
    if (!usuario.esAdmin) {
      throw new ForbiddenException("Acceso restringido a administradores");
    }
    return this.usuariosService.obtenerTodos(paginacion);
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @Get(":id")
  @ApiOperation({ summary: "Obtener los datos de un usuario (solo el propio usuario o administradores)" })
  @ApiParam({ name: "id", description: "ID del usuario", type: Number })
  @ApiResponse({ status: 200, description: "Usuario encontrado exitosamente" })
  @ApiResponse({ status: 400, description: "ID de usuario inválido" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Prohibido - No tienes permiso para consultar datos privados de otro usuario" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  async obtenerPorId(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    if (usuario.sub !== id && !usuario.esAdmin) {
      throw new ForbiddenException("No tienes permiso para consultar los datos de otro usuario");
    }
    return this.usuariosService.obtenerPorId(id);
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @Get(":id/plazas")
  @ApiOperation({ summary: "Obtener las plazas pertenecientes a un usuario de forma paginada (solo el propio usuario o admin)" })
  @ApiParam({ name: "id", description: "ID del usuario propietario", type: Number })
  @ApiResponse({ status: 200, description: "Lista paginada de plazas del usuario" })
  @ApiResponse({ status: 400, description: "ID de usuario inválido" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Prohibido - No tienes permiso para consultar las plazas de otro usuario" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  async obtenerPlazas(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @Query() paginacion: PaginacionDto,
  ) {
    if (usuario.sub !== id && !usuario.esAdmin) {
      throw new ForbiddenException("No tienes permiso para consultar las plazas de otro usuario");
    }
    return this.usuariosService.obtenerPlazas(id, paginacion);
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @Get(":id/reservas")
  @ApiOperation({ summary: "Obtener las reservas realizadas por un usuario de forma paginada (solo el propio usuario o admin)" })
  @ApiParam({ name: "id", description: "ID del usuario", type: Number })
  @ApiResponse({ status: 200, description: "Lista paginada de reservas del usuario" })
  @ApiResponse({ status: 400, description: "ID de usuario inválido" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Prohibido - No tienes permiso para consultar las reservas de otro usuario" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  async obtenerReservas(
    @UsuarioActual() usuario: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @Query() paginacion: PaginacionDto,
  ) {
    if (usuario.sub !== id && !usuario.esAdmin) {
      throw new ForbiddenException("No tienes permiso para consultar las reservas de otro usuario");
    }
    return this.usuariosService.obtenerReservas(id, paginacion);
  }
}
