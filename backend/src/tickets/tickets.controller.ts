import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los tickets activos' })
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un ticket por ID' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo ticket' })
  create(@Body() createTicketDto: any) {
    return this.ticketsService.create(createTicketDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar el estado de un ticket' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.ticketsService.updateStatus(id, status);
  }
}
