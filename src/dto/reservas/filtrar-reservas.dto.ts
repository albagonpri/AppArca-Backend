import { ApiPropertyOptional } from "@nestjs/swagger";
import { EstadoReserva } from "@prisma/client";
import { IsEnum, IsIn, IsOptional } from "class-validator";
import { PaginacionDto } from "../comun/paginacion.dto.js";

export class FiltrarReservasDto extends PaginacionDto {
  @ApiPropertyOptional({
    description: "Tipo de reservas: propias (conductor) o recibidas (propietario de plaza)",
    enum: ["propias", "recibidas"],
    default: "propias",
  })
  @IsOptional()
  @IsIn(["propias", "recibidas"], {
    message: "El parámetro tipo debe ser 'propias' o 'recibidas'",
  })
  tipo?: "propias" | "recibidas" = "propias";

  @ApiPropertyOptional({
    description: "Filtrar por estado de la reserva",
    enum: EstadoReserva,
  })
  @IsOptional()
  @IsEnum(EstadoReserva, {
    message: "El parámetro estado debe ser un valor válido de EstadoReserva",
  })
  estado?: EstadoReserva;
}
