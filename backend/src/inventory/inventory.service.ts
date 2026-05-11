import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: any) {
    const { category, subcategory, location } = query || {};
    
    return this.prisma.asset.findMany({
      where: {
        AND: [
          category ? { category_id: category } : {},
          subcategory ? { subcategory_id: subcategory } : {},
          location ? { location_id: location } : {},
        ],
      },
      include: {
        location: { select: { name: true } },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        area: { select: { name: true } },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.asset.findUnique({
      where: { id },
      include: {
        location: true,
        category: true,
        subcategory: true,
        area: true,
        maintenance: true,
        shipments: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.asset.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.asset.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.asset.delete({
      where: { id },
    });
  }

  async getStats() {
    const [total, active] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'active' } }),
    ]);
    
    return { total, active };
  }
}
