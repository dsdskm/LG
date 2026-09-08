import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController, ChatService } from './features/chat';
import { HealthController, HealthService } from './features/health';
import { ChatLogEntity } from './features/chat-settings/db/chat-log.entity';
import { ChatLogService } from './features/chat-settings/db/chat-log.service';
import { ChatSettingEntity } from './features/chat-settings/db/chat-setting.entity';
import { ChatSettingService } from './features/chat-settings/service/chat-setting.service';
import { ChatSettingController, ChatGuidanceController, ChatPromptController, ChatRagController, ChatRuleController, ActionToolController, RuntimeController } from './features/chat-settings';
import { ActionToolEntity } from './features/chat-settings/db/action-tool.entity';
import { ActionToolService } from './features/chat-settings/db/action-tool.service';
import { Prompt } from './features/chat/db/chat-prompt.entity';
import { PromptType } from './features/chat/db/chat-prompt-type.entity';
import { Rag } from './features/chat/db/chat-rag-doc.entity';
import { Screen } from './features/chat/db/chat-screen.entity';
import { ScreenGuidanceEntity } from './features/chat/db/chat-guidance.entity';
import { ChatRuleEntity } from './features/chat-settings/db/chat-rule.entity';
import { ChatRuleService } from './features/chat-settings/db/chat-rule.service';
import { PromptStoreService } from './features/chat/service/prompt-store.service';
import { PropertyTmsEntity } from './features/taskflow/db/property-tms.entity';
import { PropertyTmsStoreService } from './features/taskflow/service/property-tms-store.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_URL_AI_CHAT_SERVICE,
      entities: [
        ChatLogEntity,
        ChatSettingEntity,
        Prompt,
        PromptType,
        Rag,
        Screen,
        ScreenGuidanceEntity,
        ChatRuleEntity,
        ActionToolEntity,
        PropertyTmsEntity,
      ],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([
      ChatLogEntity,
      ChatSettingEntity,
      Prompt,
      PromptType,
      Rag,
      Screen,
      ScreenGuidanceEntity,
      ChatRuleEntity,
      ActionToolEntity,
      PropertyTmsEntity,
    ]),
  ],
  controllers: [ChatController, HealthController, ChatSettingController, ChatGuidanceController, ChatPromptController, ChatRagController, ChatRuleController, ActionToolController, RuntimeController],
  providers: [ChatService, HealthService, ChatLogService, ChatSettingService, PromptStoreService, ChatRuleService, ActionToolService, PropertyTmsStoreService],
})
export class AppModule { }
