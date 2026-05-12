import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { CamerasService } from './cameras.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Cameras')
@Controller('cameras')
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las cámaras' })
  findAll() {
    return this.camerasService.findAll();
  }

  @Get('stored-disks')
  @ApiOperation({ summary: 'Obtener todos los discos almacenados' })
  findStoredDisks() {
    return this.camerasService.findStoredDisks();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cámara por ID' })
  findOne(@Param('id') id: string) {
    return this.camerasService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva cámara' })
  create(@Body() data: any) {
    return this.camerasService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una cámara' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.camerasService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una cámara' })
  remove(@Param('id') id: string) {
    return this.camerasService.remove(id);
  }

  // Stored Disks endpoints
  @Post('stored-disks')
  @ApiOperation({ summary: 'Registrar un disco almacenado' })
  createStoredDisk(@Body() data: any) {
    return this.camerasService.createStoredDisk(data);
  }

  @Patch('stored-disks/:id')
  @ApiOperation({ summary: 'Actualizar un disco almacenado' })
  updateStoredDisk(@Param('id') id: string, @Body() data: any) {
    return this.camerasService.updateStoredDisk(id, data);
  }

  @Delete('stored-disks/:id')
  @ApiOperation({ summary: 'Eliminar un disco almacenado' })
  removeStoredDisk(@Param('id') id: string) {
    return this.camerasService.removeStoredDisk(id);
  }
}
