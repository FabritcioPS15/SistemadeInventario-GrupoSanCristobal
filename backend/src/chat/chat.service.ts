import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    return this.prisma.conversationParticipant.findMany({
      where: { user_id: userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    avatar_url: true,
                    role: true,
                  },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { created_at: 'desc' },
            },
          },
        },
      },
    });
  }

  async getMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversation_id: conversationId },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async saveMessage(conversationId: string, senderId: string, content: string) {
    return this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });
  }

  async createConversation(participantIds: string[]) {
    return this.prisma.conversation.create({
      data: {
        participants: {
          create: participantIds.map((id) => ({ user_id: id })),
        },
      },
      include: {
        participants: true,
      },
    });
  }
}
