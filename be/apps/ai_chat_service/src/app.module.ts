import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './controller/chat.controller';
import { ChatService } from './service/chat.service';
import { HealthController } from './controller/health.controller';
import { HealthService } from './service/health.service';
import { ChatLogEntity } from './db/chat-log.entity';
import { ChatLogService } from './db/chat-log.service';
import { ChatGuidanceEntity } from './db/chat-guidance.entity';
import { ChatPromptEntity } from './db/chat-prompt.entity';
import { ChatScreenEntity } from './db/chat-screen.entity';
import { ChatSettingEntity } from './db/chat-setting.entity';
import { ChatSettingService } from './db/chat-setting.service';
import { ChatRagDocEntity } from './db/chat-rag-doc.entity';
import { ChatScreenToolEntity } from './db/chat-screen-tool.entity';
import { ChatActionTypeEntity } from './db/chat-action-type.entity';
import { PromptStoreService } from './db/prompt-store.service';
import { ChatSettingController } from './controller/chat-setting.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_URL_AI_CHAT_SERVICE,
      entities: [
        ChatLogEntity,
        ChatSettingEntity,
        ChatScreenEntity,
        ChatPromptEntity,
        ChatGuidanceEntity,
        ChatRagDocEntity,
        ChatScreenToolEntity,
        ChatActionTypeEntity,
      ],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([
      ChatLogEntity,
      ChatSettingEntity,
      ChatScreenEntity,
      ChatPromptEntity,
      ChatGuidanceEntity,
      ChatRagDocEntity,
      ChatScreenToolEntity,
      ChatActionTypeEntity,
    ]),
  ],
  controllers: [ChatController, HealthController, ChatSettingController],
  providers: [ChatService, HealthService, ChatLogService, ChatSettingService, PromptStoreService],
})
export class AppModule { }
