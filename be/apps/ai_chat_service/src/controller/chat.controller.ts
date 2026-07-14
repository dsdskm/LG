import {
  Body,
  Controller,
  HttpCode,
  Post,
  Logger
} from '@nestjs/common';
import {
  ok,
  type ApiResponse,
  type ChatPayload,
} from '@ai-log/shared-contracts';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from '../service/chat.service';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }
  private readonly logger = new Logger(ChatController.name);

  /**
   * API: 사이트 어시스턴트 채팅 요청을 처리한다.
   * Method/Path: POST /chat/site-assistant
   * Body: ChatPayload
   * Response: 200 { code: 200, data: { chat_action, ... } }
   * curl: curl -X POST 'http://localhost:3007/chat/site-assistant' -H 'Content-Type: application/json' -d '{"message":"이슈 알려줘","currentPath":"/"}' -i
   */
  @HttpCode(200)
  @Post('site-assistant')
  @ApiOperation({ summary: '사이트 어시스턴트 채팅 요청을 처리' })
  @ApiBody({
    schema: {
      type: 'object',
      description: 'ChatPayload',
      additionalProperties: true,
    },
  })
  @ApiOkResponse({ description: '채팅 응답 반환' })
  async chatSiteAssistant(
    @Body() body: ChatPayload,
  ): Promise<ApiResponse<unknown>> {
    this.logger.log(`[chatSiteAssitant] message=${body.message} currentPath=${body.currentPath}`)
    this.logger.log(`[chatSiteAssitant] apiBaseUrl=${body.apiBaseUrl} eventAnalyzerUrl=${body.eventAnalyzerUrl} configManager=${body.configManagerUrl}`)
    this.logger.log(`[chatSiteAssitant] context=${JSON.stringify(body.context)}`)
    this.logger.log(`[chatSiteAssitant] key=${body.key}`)
    // this.logger.log(`[chatSiteAssitant] history=${JSON.stringify(body.history)}`)

    const reply = await this.chatService.handleChat(body);
    const ret = ok(reply);
    this.logger.log(`[chatSiteAssitant] ret ${JSON.stringify(ret)}`)
    return ret
  }
}