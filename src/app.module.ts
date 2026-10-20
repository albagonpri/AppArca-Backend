import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "./database/database.module.js";
import { VehiculosModule } from "./vehiculos.module.js";
import { CatalogoVehiculosModule } from "./catalogo-vehiculos.module.js";
import { AuthController } from "./controllers/auth.controller.js";
import { UsuariosController } from "./controllers/usuarios.controller.js";
import { PlazasController } from "./controllers/plazas.controller.js";
import { ReservasController } from "./controllers/reservas.controller.js";
import { AdminController } from "./controllers/admin.controller.js";
import { GeocodificacionController } from "./controllers/geocodificacion.controller.js";
import { AuthService } from "./services/auth.service.js";
import { UsuariosService } from "./services/usuarios.service.js";
import { PlazasService } from "./services/plazas.service.js";
import { ReservasService } from "./services/reservas.service.js";
import { GeocodingService } from "./services/geocoding.service.js";
import { JwtGuard } from "./guards/jwt.guard.js";
import { AdminGuard } from "./guards/admin.guard.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.get<string>("JWT_EXPIRES_IN") || "1d";
        return {
          secret: config.get<string>("JWT_SECRET"),
          signOptions: {
            expiresIn: expiresIn as unknown as import("jsonwebtoken").SignOptions["expiresIn"],
          },
        };
      },
    }),
    DatabaseModule,
    VehiculosModule,
    CatalogoVehiculosModule,
  ],
  controllers: [
    AuthController,
    UsuariosController,
    PlazasController,
    ReservasController,
    AdminController,
    GeocodificacionController,
  ],
  providers: [
    AuthService,
    JwtGuard,
    AdminGuard,
    UsuariosService,
    PlazasService,
    ReservasService,
    GeocodingService,
  ],
})
export class AppModule {}
