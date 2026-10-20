import { Module } from '@nestjs/common';
import { CatalogoVehiculosController } from './controllers/catalogo-vehiculos.controller.js';
import { CatalogoVehiculosService } from './services/catalogo-vehiculos.service.js';
import { JwtGuard } from './guards/jwt.guard.js';

@Module({
  controllers: [CatalogoVehiculosController],
  providers: [CatalogoVehiculosService, JwtGuard],
  exports: [CatalogoVehiculosService],
})
export class CatalogoVehiculosModule {}
