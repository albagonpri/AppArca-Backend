import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LoginDto } from '../dto/auth/login.dto.js';
import { RegistroDto } from '../dto/auth/registro.dto.js';
import { JwtGuard } from '../guards/jwt.guard.js';
import { AuthService } from '../services/auth.service.js';
import { UsuarioActual } from '../decorators/usuario-actual.decorator.js';
import { ActualizarUsuarioDto } from '../dto/usuarios/actualizar-usuario.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya está registrado' })
  async registro(@Body() dto: RegistroDto) {
    return this.authService.registro(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión de usuario' })
  @ApiResponse({ status: 201, description: 'Sesión iniciada correctamente, devuelve token JWT' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Correo o contraseña incorrectos' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtGuard)
  @Get('perfil')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token ausente o inválido' })
  async perfil(@UsuarioActual("sub") usuarioId: number) {
    return this.authService.obtenerPerfil(usuarioId);
  }
  @UseGuards(JwtGuard)
  @Patch("perfil")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar el perfil del usuario autenticado" })
  @ApiResponse({ status: 200, description: "Perfil del usuario actualizado exitosamente" })
  @ApiResponse({ status: 400, description: "Datos de entrada inválidos" })
  @ApiResponse({ status: 401, description: "No autorizado - Token ausente o inválido" })
  @ApiResponse({ status: 409, description: "El correo electrónico ya está registrado por otro usuario" })
  async actualizarPerfil(
    @UsuarioActual("sub") usuarioId: number,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.authService.actualizarPerfil(usuarioId, dto);
  }
}
