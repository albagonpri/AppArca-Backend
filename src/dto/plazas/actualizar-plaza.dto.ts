import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CrearPlazaDto } from './crear-plaza.dto.js';

export class ActualizarPlazaDto extends PartialType(CrearPlazaDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Indica si la plaza se encuentra disponible para reservas',
  })
  @IsBoolean({ message: 'disponible debe ser un valor booleano' })
  @IsOptional()
  disponible?: boolean;
}
