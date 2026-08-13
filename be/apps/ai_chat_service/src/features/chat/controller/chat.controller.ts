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
    const reqId = String((body as any)?.reqId ?? (body as any)?.requestId ?? '').trim() || '-'
    this.logger.debug(`[chatSiteAssitant] [0단계:요청수신] [reqId=${reqId}] message=${JSON.stringify(body.message)}`)

    const reply = await this.chatService.handleChat(body);
    return ok(reply);
  }
}