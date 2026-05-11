import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { SutranService } from './sutran.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Sutran')
@Controller('sutran')
export class SutranController {
  constructor(private readonly sutranService: SutranService) {}

  @Get('visits')
  @ApiOperation({ summary: 'Obtener visitas de SUTRAN' })
  findAll() {
    return this.sutranService.findAll();
  }

  @Get('visits/:id')
  findOne(@Param('id') id: string) {
    return this.sutranService.findOne(id);
  }

  @Post('visits')
  create(@Body() data: any) {
    return this.sutranService.create(data);
  }

  @Patch('visits/:id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.sutranService.update(id, data);
  }
}
