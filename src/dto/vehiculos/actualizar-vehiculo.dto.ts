import { ApiPropertyOptional } from '@nestjs/swagger';
import { EtiquetaAmbiental, TipoPropulsion } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class ActualizarVehiculoDto {
  @ApiPropertyOptional({
    example: 'Toyota',
    description: 'Marca del vehículo',
  })
  @IsString({ message: 'La marca debe ser un texto' })
  @IsNotEmpty({ message: 'La marca no puede estar vacía si se proporciona' })
  @IsOptional()
  marca?: string;

  @ApiPropertyOptional({
    example: 'Corolla GR-Sport',
    description: 'Modelo del vehículo',
  })
  @IsString({ message: 'El modelo debe ser un texto' })
  @IsNotEmpty({ message: 'El modelo no puede estar vacío si se proporciona' })
  @IsOptional()
  modelo?: string;

  @ApiPropertyOptional({
    example: '5678DEF',
    description: 'Matrícula del vehículo',
  })
  @IsString({ message: 'La matrícula debe ser un texto' })
  @IsOptional()
  matricula?: string;

  @ApiPropertyOptional({
    enum: EtiquetaAmbiental,
    example: EtiquetaAmbiental.C,
    description: 'Etiqueta ambiental del vehículo según la DGT',
  })
  @IsEnum(EtiquetaAmbiental, {
    message: 'La etiqueta ambiental debe ser una de las siguientes: CERO, ECO, C, B, SIN_DISTINTIVO',
  })
  @IsOptional()
  etiquetaAmbiental?: EtiquetaAmbiental;

  @ApiPropertyOptional({
    example: 2021,
    description: 'Año de fabricación o modelo del vehículo',
  })
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(1900, { message: 'El año debe ser válido' })
  @IsOptional()
  anyo?: number;

  @ApiPropertyOptional({
    example: '1.8L 122H Active Tech',
    description: 'Versión o motorización del vehículo',
  })
  @IsString({ message: 'La versión debe ser un texto' })
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({
    enum: TipoPropulsion,
    example: TipoPropulsion.HIBRIDO_NO_ENCHUFABLE,
    description: 'Tipo de combustible o propulsión del vehículo',
  })
  @IsEnum(TipoPropulsion, {
    message: 'El tipo de propulsión debe ser: GASOLINA, DIESEL, HIBRIDO_NO_ENCHUFABLE, HIBRIDO_ENCHUFABLE, ELECTRICO_PURO u OTRO',
  })
  @IsOptional()
  tipoPropulsion?: TipoPropulsion;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica si el vehículo es enchufable (100% eléctrico o híbrido enchufable)',
  })
  @IsBoolean({ message: 'esEnchufable debe ser un valor booleano' })
  @IsOptional()
  esEnchufable?: boolean;

  @ApiPropertyOptional({
    example: 4.65,
    description: 'Longitud del vehículo en metros',
  })
  @IsNumber({}, { message: 'La longitud debe ser un valor numérico' })
  @IsPositive({ message: 'La longitud debe ser un número positivo' })
  @IsOptional()
  longitud?: number;

  @ApiPropertyOptional({
    example: 1.79,
    description: 'Anchura del vehículo en metros',
  })
  @IsNumber({}, { message: 'La anchura debe ser un valor numérico' })
  @IsPositive({ message: 'La anchura debe ser un número positivo' })
  @IsOptional()
  anchura?: number;

  @ApiPropertyOptional({
    example: 1.42,
    description: 'Altura del vehículo en metros',
  })
  @IsNumber({}, { message: 'La altura debe ser un valor numérico' })
  @IsPositive({ message: 'La altura debe ser un número positivo' })
  @IsOptional()
  altura?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el vehículo cuenta con suspensión baja',
  })
  @IsBoolean({ message: 'suspensionBaja debe ser un valor booleano' })
  @IsOptional()
  suspensionBaja?: boolean;

  @ApiPropertyOptional({
    example: 1042,
    description: 'Identificador del vehículo de referencia en el catálogo',
  })
  @IsInt({ message: 'catalogoVehiculoId debe ser un número entero' })
  @IsOptional()
  catalogoVehiculoId?: number;
}
