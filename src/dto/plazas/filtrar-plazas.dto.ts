import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { PaginacionDto } from "../comun/paginacion.dto.js";

/** Transformador flexible para convertir strings 'true'/'false' o booleano a boolean */
const transformBoolean = ({ value }: { value: any }) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return value;
};

export class FiltrarPlazasDto extends PaginacionDto {
  @ApiPropertyOptional({
    description: "Búsqueda libre por ubicación (municipio, provincia o código postal en la dirección)",
    example: "Madrid",
  })
  @IsOptional()
  @IsString({ message: "El parámetro q debe ser un texto" })
  q?: string;

  @ApiPropertyOptional({
    description: "Filtrar por provincia",
    example: "Madrid",
  })
  @IsOptional()
  @IsString({ message: "El parámetro provincia debe ser un texto" })
  provincia?: string;

  @ApiPropertyOptional({
    description: "Filtrar por municipio / ciudad",
    example: "Madrid",
  })
  @IsOptional()
  @IsString({ message: "El parámetro municipio debe ser un texto" })
  municipio?: string;

  @ApiPropertyOptional({
    description: "Filtrar por código postal",
    example: "28013",
  })
  @IsOptional()
  @IsString({ message: "El parámetro codigoPostal debe ser un texto" })
  codigoPostal?: string;

  @ApiPropertyOptional({
    description: "Filtrar si la plaza está cubierta (true) o descubierta (false)",
    type: Boolean,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean({ message: "estaCubierta debe ser un valor booleano" })
  estaCubierta?: boolean;

  @ApiPropertyOptional({
    description: "Filtrar si dispone de cargador eléctrico",
    type: Boolean,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean({ message: "tieneCargadorElectrico debe ser un valor booleano" })
  tieneCargadorElectrico?: boolean;

  @ApiPropertyOptional({
    description: "Filtrar si dispone de cámaras de seguridad",
    type: Boolean,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean({ message: "tieneCamaras debe ser un valor booleano" })
  tieneCamaras?: boolean;

  @ApiPropertyOptional({
    description: "Filtrar si tiene entrada difícil",
    type: Boolean,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean({ message: "entradaDificil debe ser un valor booleano" })
  entradaDificil?: boolean;

  @ApiPropertyOptional({
    description: "Largo mínimo de la plaza en metros",
    example: 4.5,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "largoMin debe ser un valor numérico" })
  @Min(0, { message: "largoMin no puede ser negativo" })
  largoMin?: number;

  @ApiPropertyOptional({
    description: "Ancho mínimo de la plaza en metros",
    example: 2.2,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "anchoMin debe ser un valor numérico" })
  @Min(0, { message: "anchoMin no puede ser negativo" })
  anchoMin?: number;

  @ApiPropertyOptional({
    description: "Precio mínimo por hora en euros",
    example: 1.5,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "precioMin debe ser un valor numérico" })
  @Min(0, { message: "precioMin no puede ser negativo" })
  precioMin?: number;

  @ApiPropertyOptional({
    description: "Precio máximo por hora en euros",
    example: 5.0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "precioMax debe ser un valor numérico" })
  @Min(0, { message: "precioMax no puede ser negativo" })
  precioMax?: number;
}
