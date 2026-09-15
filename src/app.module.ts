import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { UsuariosController } from './controllers/usuarios.controller.js';
import { PlazasController } from './controllers/plazas.controller.js';
import { ReservasController } from './controllers/reservas.controller.js';
import { UsuariosService } from './services/usuarios.service.js';
import { PlazasService } from './services/plazas.service.js';
import { ReservasService } from './services/reservas.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
  ],
  controllers: [
    UsuariosController,
    PlazasController,
    ReservasController,
  ],
  providers: [
    UsuariosService,
    PlazasService,
    ReservasService,
  ],
})
export class AppModule {}
