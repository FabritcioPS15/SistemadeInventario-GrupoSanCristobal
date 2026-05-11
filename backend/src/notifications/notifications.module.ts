import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatService } from '../chat/chat.service';

@Global()
@Module({
  providers: [NotificationsService, ChatGateway, ChatService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
