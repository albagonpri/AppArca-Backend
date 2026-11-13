import { PickType } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { CrearUsuarioDto } from './crear-usuario.dto.js';

export class NombrePerfilDto extends PickType(CrearUsuarioDto, ['nombre'] as const) {
  @Matches(/\S/, { message: 'El nombre es obligatorio' })
  declare nombre: string;
}
