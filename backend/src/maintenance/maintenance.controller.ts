import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los registros de mantenimiento' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('status') status?: string) {
    return this.maintenanceService.findAll(status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de mantenimiento' })
  getStats() {
    return this.maintenanceService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro por ID' })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo registro de mantenimiento' })
  create(@Body() data: any) {
    return this.maintenanceService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un registro de mantenimiento' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.maintenanceService.update(id, data);
  }
}
