import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CrearPlazaDto {
  @IsInt({ message: 'El ID del propietario debe ser un número entero' })
  @IsPositive({ message: 'El ID del propietario debe ser un número positivo' })
  propietarioId: number;

  @IsString({ message: 'El título debe ser un texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsOptional()
  descripcion?: string;

  @IsString({ message: 'La dirección debe ser un texto' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  direccion: string;

  @IsNumber({}, { message: 'La latitud debe ser un valor numérico' })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitud: number;

  @IsNumber({}, { message: 'La longitud debe ser un valor numérico' })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitud: number;

  @IsNumber({}, { message: 'El precio por hora debe ser un valor numérico' })
  @IsPositive({ message: 'El precio por hora debe ser un número positivo' })
  precioHora: number;
}
