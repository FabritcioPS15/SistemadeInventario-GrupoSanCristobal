import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('assets')
  @ApiOperation({ summary: 'Obtener todos los activos con filtros opcionales' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'subcategory', required: false })
  @ApiQuery({ name: 'location', required: false })
  findAll(@Query() query: any) {
    return this.inventoryService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas del inventario' })
  getStats() {
    return this.inventoryService.getStats();
  }

  @Get('assets/:id')
  @ApiOperation({ summary: 'Obtener un activo por ID' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post('assets')
  @ApiOperation({ summary: 'Crear un nuevo activo' })
  create(@Body() data: any) {
    return this.inventoryService.create(data);
  }

  @Patch('assets/:id')
  @ApiOperation({ summary: 'Actualizar un activo' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.inventoryService.update(id, data);
  }

  @Delete('assets/:id')
  @ApiOperation({ summary: 'Eliminar un activo' })
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
