import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtGuard } from "../guards/jwt.guard.js";
import { GeocodingService } from "../services/geocoding.service.js";
import { BuscarDireccionDto } from "../dto/geocodificacion/buscar-direccion.dto.js";

@ApiTags("Geocodificación")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("geocodificacion")
export class GeocodificacionController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get("buscar")
  @ApiOperation({
    summary: "Buscar candidatos de ubicación para una dirección postal en España",
    description: "Consulta el servicio oficial CartoCiudad (IGN) y devuelve las posibles coincidencias con sus coordenadas WGS84.",
  })
  @ApiResponse({
    status: 200,
    description: "Lista normalizada de candidatos encontrados",
  })
  async buscar(@Query() dto: BuscarDireccionDto) {
    return this.geocodingService.buscarCandidatos({
      calle: dto.calle,
      numero: dto.numero || "",
      codigoPostal: dto.codigoPostal || "",
      ciudad: dto.ciudad || "",
      provincia: dto.provincia,
      poblacion: dto.poblacion,
    });
  }

  @Get("codigo-postal/:cp")
  @ApiOperation({
    summary: "Consultar datos geográficos a partir del código postal",
    description: "Devuelve provincia, municipio y poblaciones asociadas a un código postal español de 5 cifras.",
  })
  @ApiParam({
    name: "cp",
    description: "Código postal español de 5 cifras",
    example: "28013",
  })
  @ApiResponse({
    status: 200,
    description: "Información geográfica resuelta a partir del código postal",
  })
  @ApiResponse({
    status: 400,
    description: "Código postal inválido (debe tener 5 dígitos)",
  })
  @ApiResponse({
    status: 404,
    description: "Código postal no encontrado en territorio español",
  })
  async consultarCodigoPostal(@Param("cp") cp: string) {
    return this.geocodingService.consultarCodigoPostal(cp);
  }
}
