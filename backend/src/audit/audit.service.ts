import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: any) {
    const { userId, entityType, action } = query || {};
    
    return this.prisma.auditLog.findMany({
      where: {
        AND: [
          userId ? { user_id: userId } : {},
          entityType ? { entity_type: entityType } : {},
          action ? { action: action } : {},
        ],
      },
      include: {
        user: {
          select: {
            full_name: true,
            role: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 100, // Limitamos a los últimos 100 por rendimiento
    });
  }

  async create(data: {
    user_id?: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details?: string;
  }) {
    return this.prisma.auditLog.create({
      data,
    });
  }

  async getStats() {
    const totalLogs = await this.prisma.auditLog.count();
    const actionsByType = await this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
    });

    return { totalLogs, actionsByType };
  }
}
