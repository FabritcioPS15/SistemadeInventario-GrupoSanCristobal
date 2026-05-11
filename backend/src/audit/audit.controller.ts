import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener logs de auditoría con filtros' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'action', required: false })
  findAll(@Query() query: any) {
    return this.auditService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de actividad' })
  getStats() {
    return this.auditService.getStats();
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo registro de auditoría (Manual)' })
  create(@Body() data: any) {
    return this.auditService.create(data);
  }
}
