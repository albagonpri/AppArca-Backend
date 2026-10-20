import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CrearReservaDto {
  @ApiProperty({
    example: 1,
    description: 'ID del usuario que realiza la reserva',
  })
  @IsInt({ message: 'El ID del usuario debe ser un número entero' })
  @IsPositive({ message: 'El ID del usuario debe ser un número positivo' })
  usuarioId: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la plaza que se desea reservar',
  })
  @IsInt({ message: 'El ID de la plaza debe ser un número entero' })
  @IsPositive({ message: 'El ID de la plaza debe ser un número positivo' })
  plazaId: number;

  @ApiProperty({
    example: '2026-09-20T18:00:00.000Z',
    description: 'Fecha y hora de inicio de la reserva en formato ISO 8601',
  })
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida en formato ISO 8601' })
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  fechaInicio: string;

  @ApiProperty({
    example: '2026-09-20T20:00:00.000Z',
    description: 'Fecha y hora de fin de la reserva en formato ISO 8601',
  })
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida en formato ISO 8601' })
  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  fechaFin: string;
}

