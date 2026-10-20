import { describe, it, expect } from "vitest";
import { PaginacionDto, crearRespuestaPaginada } from "./paginacion.dto.js";

describe("PaginacionDto y utilidades", () => {
  it("debe calcular el skip correctamente", () => {
    const dto = new PaginacionDto();
    dto.page = 1;
    dto.limit = 10;
    expect(dto.skip).toBe(0);

    dto.page = 3;
    dto.limit = 10;
    expect(dto.skip).toBe(20);

    dto.page = 2;
    dto.limit = 25;
    expect(dto.skip).toBe(25);
  });

  it("debe crear la estructura de respuesta paginada correctamente", () => {
    const datos = [{ id: 1 }, { id: 2 }];
    const respuesta = crearRespuestaPaginada(datos, 45, 1, 10);

    expect(respuesta.data).toEqual(datos);
    expect(respuesta.meta).toEqual({
      page: 1,
      limit: 10,
      total: 45,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it("debe calcular hasNextPage y hasPreviousPage en la última página", () => {
    const datos = [{ id: 41 }];
    const respuesta = crearRespuestaPaginada(datos, 45, 5, 10);

    expect(respuesta.meta.page).toBe(5);
    expect(respuesta.meta.totalPages).toBe(5);
    expect(respuesta.meta.hasNextPage).toBe(false);
    expect(respuesta.meta.hasPreviousPage).toBe(true);
  });

  it("debe manejar una colección vacía (total = 0)", () => {
    const respuesta = crearRespuestaPaginada([], 0, 1, 10);

    expect(respuesta.data).toEqual([]);
    expect(respuesta.meta).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});
