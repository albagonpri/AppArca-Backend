import { IsDateString, IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CrearReservaDto {
  @IsInt({ message: 'El ID del usuario debe ser un número entero' })
  @IsPositive({ message: 'El ID del usuario debe ser un número positivo' })
  usuarioId: number;

  @IsInt({ message: 'El ID de la plaza debe ser un número entero' })
  @IsPositive({ message: 'El ID de la plaza debe ser un número positivo' })
  plazaId: number;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida en formato ISO 8601' })
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  fechaInicio: string;

  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida en formato ISO 8601' })
  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  fechaFin: string;
}
