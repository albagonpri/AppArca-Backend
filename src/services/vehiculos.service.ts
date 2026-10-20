import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { CrearVehiculoDto } from "../dto/vehiculos/crear-vehiculo.dto.js";
import { ActualizarVehiculoDto } from "../dto/vehiculos/actualizar-vehiculo.dto.js";
import { PaginacionDto, RespuestaPaginada, crearRespuestaPaginada } from "../dto/comun/paginacion.dto.js";

@Injectable()
export class VehiculosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(usuarioId: number, dto: CrearVehiculoDto) {
    return this.prisma.vehiculo.create({
      data: {
        ...dto,
        usuarioId,
      },
    });
  }

  async obtenerTodos(
    usuarioId: number,
    paginacion: PaginacionDto = new PaginacionDto(),
  ): Promise<RespuestaPaginada<any>> {
    const where = { usuarioId };
    const skip = paginacion.skip;
    const take = paginacion.limit;

    const [data, total] = await Promise.all([
      this.prisma.vehiculo.findMany({
        where,
        skip,
        take,
        include: {
          catalogoVehiculo: true,
        },
        orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      }),
      this.prisma.vehiculo.count({ where }),
    ]);

    return crearRespuestaPaginada(data, total, paginacion.page, paginacion.limit);
  }

  async obtenerPorId(usuarioId: number, id: number) {
    const vehiculo = await this.prisma.vehiculo.findUnique({
      where: { id },
      include: {
        catalogoVehiculo: true,
      },
    });

    if (!vehiculo || vehiculo.usuarioId !== usuarioId) {
      throw new NotFoundException(`Vehículo con ID ${id} no encontrado`);
    }

    return vehiculo;
  }

  async actualizar(usuarioId: number, id: number, dto: ActualizarVehiculoDto) {
    await this.obtenerPorId(usuarioId, id);

    return this.prisma.vehiculo.update({
      where: { id },
      data: dto,
    });
  }

  async eliminar(usuarioId: number, id: number) {
    await this.obtenerPorId(usuarioId, id);

    return this.prisma.vehiculo.delete({
      where: { id },
    });
  }
}
