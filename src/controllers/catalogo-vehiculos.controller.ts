import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '../guards/jwt.guard.js';
import { CatalogoVehiculosService } from '../services/catalogo-vehiculos.service.js';
import {
  BuscarCatalogoDto,
  FiltroModelosDto,
  FiltroVersionesDto,
} from '../dto/catalogo-vehiculos/buscar-catalogo.dto.js';

@ApiTags('Catálogo de Vehículos')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('catalogo-vehiculos')
export class CatalogoVehiculosController {
  constructor(private readonly catalogoService: CatalogoVehiculosService) {}

  @Get('buscar')
  @ApiOperation({
    summary: 'Buscar vehículos en el catálogo por texto libre con autocompletado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de resultados encontrados en el catálogo',
  })
  async buscar(@Query() query: BuscarCatalogoDto) {
    return this.catalogoService.buscar(query.q, query.limite);
  }

  @Get('marcas')
  @ApiOperation({ summary: 'Obtener la lista completa de marcas de vehículos' })
  @ApiResponse({
    status: 200,
    description: 'Lista alfabética de marcas disponibles',
  })
  async obtenerMarcas() {
    return this.catalogoService.obtenerMarcas();
  }

  @Get('modelos')
  @ApiOperation({ summary: 'Obtener la lista de modelos para una marca concreta' })
  @ApiQuery({ name: 'marca', required: true, description: 'Nombre de la marca' })
  @ApiResponse({
    status: 200,
    description: 'Lista de modelos disponibles para la marca',
  })
  async obtenerModelos(@Query() query: FiltroModelosDto) {
    return this.catalogoService.obtenerModelos(query.marca);
  }

  @Get('versiones')
  @ApiOperation({
    summary: 'Obtener las versiones o motorizaciones para una marca, modelo y año opcional',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista detallada de versiones con especificaciones técnicas',
  })
  async obtenerVersiones(@Query() query: FiltroVersionesDto) {
    return this.catalogoService.obtenerVersiones(
      query.marca,
      query.modelo,
      query.anyo,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener la ficha técnica completa de un vehículo del catálogo por su ID',
  })
  @ApiParam({ name: 'id', description: 'ID de la ficha del catálogo', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Ficha técnica encontrada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Vehículo del catálogo no encontrado',
  })
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoService.obtenerPorId(id);
  }
}
