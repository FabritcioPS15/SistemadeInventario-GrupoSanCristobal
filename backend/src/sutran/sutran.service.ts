import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SutranService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Devolver array vacío por ahora - se llenará cuando migremos los datos
    return [];
  }

  async findOne(id: string) {
    return null;
  }

  async create(data: any) {
    return data;
  }

  async update(id: string, data: any) {
    return data;
  }
}
