import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener toda la flota vehicular' })
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Obtener alertas de documentos por vencer' })
  getAlerts() {
    return this.vehiclesService.getAlerts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un vehículo' })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo vehículo' })
  create(@Body() data: any) {
    return this.vehiclesService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un vehículo' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.vehiclesService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un vehículo de la flota' })
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
