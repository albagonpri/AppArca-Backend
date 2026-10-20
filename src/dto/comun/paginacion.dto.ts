import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginacionDto {
  @ApiPropertyOptional({
    description: "Número de página (inicia en 1)",
    default: 1,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El parámetro page debe ser un número entero" })
  @Min(1, { message: "El parámetro page debe ser como mínimo 1" })
  page: number = 1;

  @ApiPropertyOptional({
    description: "Cantidad de registros por página (máximo 100)",
    default: 10,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El parámetro limit debe ser un número entero" })
  @Min(1, { message: "El parámetro limit debe ser como mínimo 1" })
  @Max(100, { message: "El parámetro limit no puede exceder 100" })
  limit: number = 10;

  get skip(): number {
    return (Math.max(1, this.page) - 1) * this.limit;
  }
}

export interface PaginacionMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface RespuestaPaginada<T> {
  data: T[];
  meta: PaginacionMeta;
}

export function crearRespuestaPaginada<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): RespuestaPaginada<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
