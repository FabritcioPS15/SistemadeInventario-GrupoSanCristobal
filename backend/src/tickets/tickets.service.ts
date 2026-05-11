import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.ticket.findMany({
      where: {
        status: {
          not: 'archived',
        },
      },
      include: {
        requester: {
          select: {
            full_name: true,
            avatar_url: true,
          },
        },
        attendant: {
          select: {
            full_name: true,
            avatar_url: true,
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
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: true,
        attendant: true,
        location: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.ticket.create({
      data,
    });
  }

  async updateStatus(id: string, status: string) {
    const updateData: any = { status };
    
    if (status === 'closed') updateData.closed_at = new Date();
    if (status === 'resolved') updateData.resolved_at = new Date();
    if (status === 'in_progress') updateData.attended_at = new Date();

    return this.prisma.ticket.update({
      where: { id },
      data: updateData,
    });
  }
}
