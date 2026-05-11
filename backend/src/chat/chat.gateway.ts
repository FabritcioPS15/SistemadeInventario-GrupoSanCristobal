import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`🔌 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('join_conversation')
  handleJoinRoom(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
    console.log(`👥 Cliente ${client.id} se unió a la sala: ${conversationId}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: { conversationId: string; senderId: string; content: string },
  ) {
    const newMessage = await this.chatService.saveMessage(
      data.conversationId,
      data.senderId,
      data.content,
    );

    // Emitir el mensaje a todos en la sala de la conversación
    this.server.to(data.conversationId).emit('new_message', newMessage);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; userName: string; isTyping: boolean },
  ) {
    this.server.to(data.conversationId).emit('user_typing', data);
  }
}
