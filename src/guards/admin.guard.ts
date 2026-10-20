import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { PrismaService } from "../database/prisma.service.js";
import type { JwtPayload } from "./jwt.guard.js";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException("Token de autenticación no proporcionado");
    }

    const [tipo, token] = authorization.split(" ");

    if (tipo !== "Bearer" || !token) {
      throw new UnauthorizedException("Formato de autorización no válido. Debe ser Bearer <token>");
    }

    let payload: JwtPayload;
    try {
      const secret = this.configService.get<string>("JWT_SECRET");
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException("Token inválido o expirado");
    }

    // Comprobación en base de datos para garantizar que el usuario sigue siendo administrador en tiempo real
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!usuario || !usuario.esAdmin) {
      throw new ForbiddenException("Acceso restringido a administradores");
    }

    // Normalize to JwtPayload shape for compatibility with @UsuarioActual() decorator
    (request as unknown as Record<string, unknown>)["usuario"] = {
      sub: usuario.id,
      correo: usuario.correo,
      esAdmin: usuario.esAdmin,
    };
    return true;
  }
}
