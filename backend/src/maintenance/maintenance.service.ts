import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    return this.prisma.maintenanceRecord.findMany({
      where: status ? { status } : {},
      include: {
        asset: {
          select: {
            brand: true,
            model: true,
            serial_number: true,
            codigo_unico: true,
          },
        },
        location: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        asset: true,
        location: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.maintenanceRecord.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.maintenanceRecord.update({
      where: { id },
      data,
    });
  }

  async getStats() {
    const [pending, inProgress, completed] = await Promise.all([
      this.prisma.maintenanceRecord.count({ where: { status: 'pending' } }),
      this.prisma.maintenanceRecord.count({ where: { status: 'in_progress' } }),
      this.prisma.maintenanceRecord.count({ where: { status: 'completed' } }),
    ]);

    return { pending, inProgress, completed };
  }
}
