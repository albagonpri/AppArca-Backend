import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class ActualizarUsuarioDto {
  @ApiPropertyOptional({ description: "Nombre completo del usuario", example: "Ana García" })
  @IsOptional()
  @IsString({ message: "El nombre debe ser una cadena de texto" })
  @MaxLength(100, { message: "El nombre no puede superar los 100 caracteres" })
  nombre?: string;

  @ApiPropertyOptional({ description: "Correo electrónico del usuario", example: "ana@example.com" })
  @IsOptional()
  @IsEmail({}, { message: "El correo electrónico debe tener un formato válido" })
  correo?: string;
}
