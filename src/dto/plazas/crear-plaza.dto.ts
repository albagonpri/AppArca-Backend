import type { Horario } from '../../models/horario.js';
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DificultadEntrada, TipoDisponibilidad } from "@prisma/client";
import {
  IsArray,
  IsObject,
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
  @ApiPropertyOptional({ enum: TipoDisponibilidad })
  @IsOptional()
  @IsEnum(TipoDisponibilidad)
  tipoDisponibilidad?: TipoDisponibilidad;

  @IsOptional()
  @IsObject()
  horario?: Horario;

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
    example: "42",
    description: "Número o identificador de la plaza dentro del aparcamiento",
  })
  @IsString({ message: "El número de plaza debe ser un texto" })
  @MaxLength(50, {
    message: "El número de plaza no puede superar los 50 caracteres",
  })
  @IsOptional()
  numeroPlaza?: string;

  @ApiPropertyOptional({
    example: "-1",
    description: "Planta o nivel en el que se encuentra la plaza",
  })
  @IsString({ message: "La planta debe ser un texto" })
  @MaxLength(50, {
    message: "La planta no puede superar los 50 caracteres",
  })
  @IsOptional()
  planta?: string;

  @ApiPropertyOptional({
    example: "Entrar por la rampa derecha y girar a la segunda calle a la izquierda",
    description: "Indicaciones de acceso detalladas (entrada al garaje, referencias, etc.)",
  })
  @IsString({ message: "Las indicaciones de acceso deben ser un texto" })
  @MaxLength(1000, {
    message: "Las indicaciones de acceso no pueden superar los 1000 caracteres",
  })
  @IsOptional()
  indicacionesAcceso?: string;

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

  @ApiProperty({
    example: true,
    description: "Indica si la plaza de aparcamiento está cubierta o descubierta",
  })
  @IsBoolean({ message: "estaCubierta debe ser un valor booleano" })
  @IsNotEmpty({ message: "El campo estaCubierta es obligatorio" })
  estaCubierta: boolean;

  @ApiProperty({
    example: false,
    description: "Indica si la plaza dispone de un cargador para vehículos eléctricos",
  })
  @IsBoolean({ message: "tieneCargadorElectrico debe ser un valor booleano" })
  @IsNotEmpty({ message: "El campo tieneCargadorElectrico es obligatorio" })
  tieneCargadorElectrico: boolean;

  @ApiPropertyOptional({
    example: 2.1,
    description: "Altura máxima de acceso en metros (opcional)",
  })
  @IsNumber({}, { message: "La altura máxima debe ser un valor numérico" })
  @IsPositive({ message: "La altura máxima debe ser un número positivo" })
  @IsOptional()
  alturaMaxima?: number;
}
