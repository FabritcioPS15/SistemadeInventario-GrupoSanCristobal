import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.location.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.location.findUnique({
      where: { id },
      include: {
        areas: true,
        users: {
          select: {
            full_name: true,
            role: true,
          }
        },
      },
    });
  }

  async create(data: any) {
    return this.prisma.location.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.location.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.location.delete({
      where: { id },
    });
  }
}
