import { Module } from '@nestjs/common';
import { VehiculosController } from './controllers/vehiculos.controller.js';
import { VehiculosService } from './services/vehiculos.service.js';
import { JwtGuard } from './guards/jwt.guard.js';

@Module({
  controllers: [VehiculosController],
  providers: [VehiculosService, JwtGuard],
  exports: [VehiculosService],
})
export class VehiculosModule {}
