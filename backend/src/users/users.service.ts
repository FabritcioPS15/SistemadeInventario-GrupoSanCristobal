import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        location_id: true,
        phone: true,
        status: true,
        notes: true,
        dni: true,
        permissions: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
        location: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        location_id: true,
        phone: true,
        status: true,
        notes: true,
        dni: true,
        permissions: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
        location: true,
      },
    });
  }

  async findByDni(dni: string) {
    return this.prisma.user.findFirst({
      where: { dni },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        location_id: true,
        phone: true,
        status: true,
        notes: true,
        dni: true,
        permissions: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
