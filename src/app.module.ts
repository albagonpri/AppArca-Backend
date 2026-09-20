import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from './database/database.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { UsuariosController } from './controllers/usuarios.controller.js';
import { PlazasController } from './controllers/plazas.controller.js';
import { ReservasController } from './controllers/reservas.controller.js';
import { AuthService } from './services/auth.service.js';
import { UsuariosService } from './services/usuarios.service.js';
import { PlazasService } from './services/plazas.service.js';
import { ReservasService } from './services/reservas.service.js';
import { JwtGuard } from './guards/jwt.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.get<string>('JWT_EXPIRES_IN') || '1d';
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as unknown as import('jsonwebtoken').SignOptions['expiresIn'],
          },
        };
      },
    }),
    DatabaseModule,
  ],
  controllers: [
    AuthController,
    UsuariosController,
    PlazasController,
    ReservasController,
  ],
  providers: [
    AuthService,
    JwtGuard,
    UsuariosService,
    PlazasService,
    ReservasService,
  ],
})
export class AppModule {}
