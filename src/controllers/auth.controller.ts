import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { LoginDto } from '../dto/auth/login.dto.js';
import { RegistroDto } from '../dto/auth/registro.dto.js';
import { JwtGuard, type JwtPayload } from '../guards/jwt.guard.js';
import { AuthService } from '../services/auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  async registro(@Body() dto: RegistroDto) {
    return this.authService.registro(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtGuard)
  @Get('perfil')
  async perfil(@Req() req: Request) {
    const usuarioPayload = (req as unknown as { usuario: JwtPayload }).usuario;
    return this.authService.obtenerPerfil(usuarioPayload.sub);
  }
}
