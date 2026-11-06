import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class BuscarDireccionDto {
  @ApiProperty({
    example: "Gran Vía",
    description: "Nombre de la calle o vía pública",
  })
  @IsString({ message: "La calle debe ser un texto" })
  @IsNotEmpty({ message: "La calle es obligatoria para buscar la dirección" })
  calle: string;

  @ApiPropertyOptional({
    example: "28",
    description: "Número de portal o s/n",
  })
  @IsString({ message: "El número debe ser un texto" })
  @IsOptional()
  numero?: string;

  @ApiPropertyOptional({
    example: "28013",
    description: "Código postal de 5 dígitos",
  })
  @IsString({ message: "El código postal debe ser un texto" })
  @IsOptional()
  codigoPostal?: string;

  @ApiPropertyOptional({
    example: "Madrid",
    description: "Municipio o ciudad",
  })
  @IsString({ message: "El municipio debe ser un texto" })
  @IsOptional()
  ciudad?: string;

  @ApiPropertyOptional({
    example: "Cangas de Onís",
    description: "Población o localidad",
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
}
