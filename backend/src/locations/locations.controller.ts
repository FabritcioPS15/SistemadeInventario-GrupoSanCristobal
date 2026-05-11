import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las sedes' })
  findAll() {
    return this.locationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una sede' })
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva sede' })
  create(@Body() data: any) {
    return this.locationsService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una sede' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.locationsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una sede' })
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }
}
