import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UsuariosService } from '../services/usuarios.service.js';
import { CrearUsuarioDto } from '../dto/usuarios/crear-usuario.dto.js';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  async crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  @Get()
  async obtenerTodos() {
    return this.usuariosService.obtenerTodos();
  }

  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtenerPorId(id);
  }

  @Get(':id/plazas')
  async obtenerPlazas(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtenerPlazas(id);
  }

  @Get(':id/reservas')
  async obtenerReservas(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtenerReservas(id);
  }
}
