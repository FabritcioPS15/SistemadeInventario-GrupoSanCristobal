import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway, // Reutilizamos el gateway para emitir notificaciones
  ) {}

  async findAll(role: string) {
    return this.prisma.notification.findMany({
      where: { target_role: role },
      orderBy: { created_at: 'desc' },
      take: 30,
    });
  }

  async create(data: any) {
    const notification = await this.prisma.notification.create({
      data,
    });

    // Emitir por WebSockets a los usuarios con ese rol
    this.chatGateway.server.emit(`notification_${data.target_role}`, notification);
    
    return notification;
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }
}
