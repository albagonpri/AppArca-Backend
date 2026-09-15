import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ReservasService } from '../services/reservas.service.js';
import { CrearReservaDto } from '../dto/reservas/crear-reserva.dto.js';

@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  async crear(@Body() dto: CrearReservaDto) {
    return this.reservasService.crear(dto);
  }

  @Get()
  async obtenerTodas() {
    return this.reservasService.obtenerTodas();
  }

  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.reservasService.obtenerPorId(id);
  }
}
