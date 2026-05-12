import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  async findAll(locationId?: string) {
    return this.prisma.area.findMany({
      where: locationId ? { location_id: locationId } : {},
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.area.findUnique({
      where: { id },
    });
  }

  async create(data: any) {
    return this.prisma.area.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.area.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.area.delete({
      where: { id },
    });
  }
}
