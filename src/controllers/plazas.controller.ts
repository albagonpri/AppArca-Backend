import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PlazasService } from '../services/plazas.service.js';
import { CrearPlazaDto } from '../dto/plazas/crear-plaza.dto.js';

@Controller('plazas')
export class PlazasController {
  constructor(private readonly plazasService: PlazasService) {}

  @Post()
  async crear(@Body() dto: CrearPlazaDto) {
    return this.plazasService.crear(dto);
  }

  @Get()
  async obtenerTodas() {
    return this.plazasService.obtenerTodas();
  }

  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.plazasService.obtenerPorId(id);
  }

  @Get(':id/reservas')
  async obtenerReservas(@Param('id', ParseIntPipe) id: number) {
    return this.plazasService.obtenerReservas(id);
  }
}
