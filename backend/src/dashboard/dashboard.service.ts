import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalAssets,
      activeAssets,
      totalTickets,
      openTickets,
      totalVehicles,
      alertsCount,
      recentTickets,
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'active' } }),
      this.prisma.ticket.count(),
      this.prisma.ticket.count({ where: { status: 'open' } }),
      this.prisma.vehicle.count(),
      this.prisma.vehicle.count({
        where: {
          OR: [
            { soat_vencimiento: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
            { citv_vencimiento: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
          ],
        },
      }),
      this.prisma.ticket.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          requester: { select: { full_name: true, avatar_url: true } },
          attendant: { select: { full_name: true, avatar_url: true } },
        },
      }),
    ]);

    return {
      totalAssets,
      activeAssets,
      totalTickets,
      openTickets,
      totalVehicles,
      alertsCount,
      recentTicketsData: recentTickets,
      // Mapeamos el resto de campos que el frontend espera
      schoolsData: await this.prisma.location.findMany({ select: { id: true, name: true } }),
    };
  }
}
