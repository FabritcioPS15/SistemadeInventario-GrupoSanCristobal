import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations/:userId')
  @ApiOperation({ summary: 'Obtener conversaciones de un usuario' })
  getConversations(@Param('userId') userId: string) {
    return this.chatService.getConversations(userId);
  }

  @Get('messages/:conversationId')
  @ApiOperation({ summary: 'Obtener historial de mensajes de una conversación' })
  getMessages(@Param('conversationId') conversationId: string) {
    return this.chatService.getMessages(conversationId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Crear una nueva conversación' })
  createConversation(@Body('participantIds') participantIds: string[]) {
    return this.chatService.createConversation(participantIds);
  }
}
