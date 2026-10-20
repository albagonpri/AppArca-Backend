import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BuscarCatalogoDto {
  @ApiProperty({
    example: 'Seat Leon',
    description: 'Texto de búsqueda para marca o modelo',
  })
  @IsString({ message: 'El término de búsqueda debe ser un texto' })
  q: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Número máximo de sugerencias a devolver',
    default: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(50, { message: 'El límite máximo es 50' })
  limite?: number = 15;
}

export class FiltroModelosDto {
  @ApiProperty({
    example: 'SEAT',
    description: 'Nombre de la marca de vehículos',
  })
  @IsString({ message: 'La marca debe ser un texto' })
  marca: string;
}

export class FiltroVersionesDto {
  @ApiProperty({
    example: 'SEAT',
    description: 'Nombre de la marca',
  })
  @IsString({ message: 'La marca debe ser un texto' })
  marca: string;

  @ApiProperty({
    example: 'Leon',
    description: 'Nombre del modelo',
  })
  @IsString({ message: 'El modelo debe ser un texto' })
  modelo: string;

  @ApiPropertyOptional({
    example: 2020,
    description: 'Año de fabricación o generación del vehículo',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El año debe ser un número entero' })
  anyo?: number;
}
