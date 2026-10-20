import { ApiProperty } from "@nestjs/swagger";
import { EstadoReserva } from "@prisma/client";
import { IsEnum } from "class-validator";

export class ActualizarEstadoReservaDto {
  @ApiProperty({ description: "Nuevo estado de la reserva", enum: EstadoReserva, example: EstadoReserva.CONFIRMADA })
  @IsEnum(EstadoReserva, { message: "El estado debe ser PENDIENTE, CONFIRMADA, CANCELADA o COMPLETADA" })
  estado!: EstadoReserva;
}
