import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DificultadEntrada } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  Max,
} from "class-validator";

export class CrearPlazaDto {
  @ApiPropertyOptional({
    example: 1,
    description: "ID del usuario propietario de la plaza (se infiere del token de autenticación)",
  })
  @IsInt({ message: "El ID del propietario debe ser un número entero" })
  @IsPositive({ message: "El ID del propietario debe ser un número positivo" })
  @IsOptional()
  propietarioId?: number;

  @ApiProperty({
    example: "Plaza amplia cerca de la estación",
    description: "Título descriptivo de la plaza",
  })
  @IsString({ message: "El título debe ser un texto" })
  @IsNotEmpty({ message: "El título es obligatorio" })
  titulo: string;

  @ApiPropertyOptional({
    example: "Fácil acceso, puerta automática",
    description: "Descripción detallada de la plaza",
  })
  @IsString({ message: "La descripción debe ser un texto" })
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    example: "Gran Vía",
    description: "Nombre de la calle",
  })
  @IsString({ message: "La calle es obligatoria y debe ser un texto" })
  @IsNotEmpty({ message: "La calle es obligatoria" })
  calle: string;

  @ApiProperty({
    example: "28",
    description: "Portal o s/n",
  })
  @IsString({ message: "El número debe ser un texto" })
  @IsNotEmpty({ message: "El portal es obligatorio" })
  numero: string;

  @ApiProperty({
    example: "28013",
    description: "Código postal del municipio",
  })
  @IsString({ message: "El código postal debe ser un texto" })
  @IsNotEmpty({ message: "El código postal es obligatorio" })
  codigoPostal: string;

  @ApiProperty({
    example: "Madrid",
    description: "Municipio o ciudad",
  })
  @IsString({ message: "El municipio o ciudad debe ser un texto" })
  @IsNotEmpty({ message: "El municipio o ciudad es obligatorio" })
  ciudad: string;

  @ApiPropertyOptional({
    example: "Madrid",
    description: "Población, localidad o pedanía específica",
  })
  @IsString({ message: "La población o localidad debe ser un texto" })
  @IsOptional()
  poblacion?: string;

  @ApiPropertyOptional({
    example: "Madrid",
    description: "Provincia",
  })
  @IsString({ message: "La provincia debe ser un texto" })
  @IsOptional()
  provincia?: string;

  @ApiPropertyOptional({
    example: 40.4168,
    description: "Latitud confirmada de la plaza en el mapa",
  })
  @IsNumber({}, { message: "La latitud debe ser un valor numérico" })
  @Min(-90, { message: "La latitud debe ser mayor o igual a -90" })
  @Max(90, { message: "La latitud debe ser menor o igual a 90" })
  @IsOptional()
  latitud?: number;

  @ApiPropertyOptional({
    example: -3.7038,
    description: "Longitud confirmada de la plaza en el mapa",
  })
  @IsNumber({}, { message: "La longitud debe ser un valor numérico" })
  @Min(-180, { message: "La longitud debe ser mayor o igual a -180" })
  @Max(180, { message: "La longitud debe ser menor o igual a 180" })
  @IsOptional()
  longitud?: number;

  @ApiProperty({
    example: 2.5,
    description: "Precio por hora en euros",
  })
  @IsNumber({}, { message: "El precio por hora debe ser un valor numérico" })
  @IsPositive({ message: "El precio por hora debe ser un número positivo" })
  precioHora: number;

  @ApiProperty({
    example: 5.0,
    description: "Largo de la plaza en metros",
  })
  @IsNumber({}, { message: "El largo debe ser un valor numérico" })
  @IsPositive({ message: "El largo debe ser un número positivo" })
  largo: number;

  @ApiProperty({
    example: 2.4,
    description: "Ancho de la plaza en metros",
  })
  @IsNumber({}, { message: "El ancho debe ser un valor numérico" })
  @IsPositive({ message: "El ancho debe ser un número positivo" })
  ancho: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: "Indica si el acceso o maniobra en la plaza es difícil",
  })
  @IsBoolean({ message: "entradaDificil debe ser un valor booleano" })
  @IsOptional()
  entradaDificil?: boolean;

  @ApiPropertyOptional({
    example: ["ENTRADA_ESTRECHA", "RAMPA_PRONUNCIADA"],
    description: "Lista de dificultades que presenta el acceso a la plaza",
    enum: DificultadEntrada,
    isArray: true,
  })
  @IsArray({ message: "dificultadesEntrada debe ser un array" })
  @IsEnum(DificultadEntrada, {
    each: true,
    message: "Cada dificultad debe ser un valor válido de DificultadEntrada",
  })
  @IsOptional()
  dificultadesEntrada?: DificultadEntrada[];

  @ApiPropertyOptional({
    example: "Rampa pronunciada y curva cerrada a la izquierda",
    description: "Descripción obligatoria cuando se selecciona la dificultad OTRA",
  })
  @IsString({ message: "La descripción de la entrada debe ser un texto" })
  @MaxLength(300, {
    message: "La descripción de la dificultad no puede superar los 300 caracteres",
  })
  @IsOptional()
  descripcionEntrada?: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: "Indica si el parking dispone de cámaras de seguridad",
  })
  @IsBoolean({ message: "tieneCamaras debe ser un valor booleano" })
  @IsOptional()
  tieneCamaras?: boolean;
}
