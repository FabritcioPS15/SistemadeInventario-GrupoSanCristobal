import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vehicle.findMany({
      include: {
        location: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        placa: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        location: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.vehicle.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.vehicle.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.vehicle.delete({
      where: { id },
    });
  }

  // Obtener vehículos con documentos por vencer (próximos 30 días)
  async getAlerts() {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    return this.prisma.vehicle.findMany({
      where: {
        OR: [
          { soat_vencimiento: { lte: nextMonth } },
          { citv_vencimiento: { lte: nextMonth } },
          { poliza_vencimiento: { lte: nextMonth } },
          { contrato_vencimiento: { lte: nextMonth } },
        ],
        estado: 'activa',
      },
      select: {
        placa: true,
        soat_vencimiento: true,
        citv_vencimiento: true,
        poliza_vencimiento: true,
        contrato_vencimiento: true,
      }
    });
  }
}
