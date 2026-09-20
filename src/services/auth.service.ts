import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service.js';
import { LoginDto } from '../dto/auth/login.dto.js';
import { RegistroDto } from '../dto/auth/registro.dto.js';
import { usuarioSelectPublico } from '../models/usuario.model.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registro(dto: RegistroDto) {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });

    if (usuarioExistente) {
      throw new ConflictException('Ya existe un usuario registrado con este correo electrónico');
    }

    const saltRounds = 10;
    const contrasenaHash = await bcrypt.hash(dto.contrasena, saltRounds);

    return this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        correo: dto.correo,
        contrasenaHash,
      },
      select: usuarioSelectPublico,
    });
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });

    if (!usuario || !usuario.contrasenaHash) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const esValida = await bcrypt.compare(dto.contrasena, usuario.contrasenaHash);

    if (!esValida) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const payload = {
      sub: usuario.id,
      correo: usuario.correo,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
      },
    };
  }

  async obtenerPerfil(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: usuarioSelectPublico,
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return usuario;
  }
}
