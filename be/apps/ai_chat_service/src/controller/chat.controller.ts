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
import { resolveTaskflowContextSource } from '../pipeline/taskflow-context-source.util';

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
    const selectedTaskflowContext = resolveTaskflowContextSource(body?.context)
    const contextObj = body?.context && typeof body.context === 'object' && !Array.isArray(body.context)
      ? (body.context as Record<string, unknown>)
      : {}
    const taskflowObj = contextObj.taskflow && typeof contextObj.taskflow === 'object' && !Array.isArray(contextObj.taskflow)
      ? (contextObj.taskflow as Record<string, unknown>)
      : {}
    const flowDef = taskflowObj.flowDefinition && typeof taskflowObj.flowDefinition === 'object' && !Array.isArray(taskflowObj.flowDefinition)
      ? (taskflowObj.flowDefinition as Record<string, unknown>)
      : {}

    this.logger.log(`[chatSiteAssitant] [1단계:요청수신] [reqId=${reqId}] status=received reason=사용자 메시지 기반 assistant 처리 시작`)
    this.logger.log(`[chatSiteAssitant] [1-1단계:엔드포인트검증] [reqId=${reqId}] status=checked reason=외부 연동 URL 존재여부 점검 완료`)
    this.logger.log(
      `[chatSiteAssitant] [2단계:컨텍스트선정] [reqId=${reqId}] status=selected reason=source=${selectedTaskflowContext.source}, taskflow=${Boolean(contextObj.taskflow)}, flowContext=${Boolean(contextObj.flowContext)}, flowDefinition=${Boolean(taskflowObj.flowDefinition)}`,
    )
    this.logger.log(
      `[chatSiteAssitant] [2-1단계:라우트결정] [reqId=${reqId}] status=resolved reason=key/routeKey/screenRouteKey를 현재 화면 기준으로 정규화`,
    )

    this.logger.debug(
      `[chatSiteAssitant] [trace] ########[reqId=${reqId}] message=${body.message} currentPath=${body.currentPath} key=${String((body as any)?.key ?? '') || '-'} routeKey=${String((body as any)?.routeKey ?? '') || '-'} screenRouteKey=${String((body as any)?.screenRouteKey ?? '') || '-'} currentApp=${String((body as any)?.currentApp ?? '') || '-'} flowDefNodes=${Array.isArray(flowDef.nodes) ? flowDef.nodes.length : 0} flowDefEdges=${Array.isArray(flowDef.edges) ? flowDef.edges.length : 0}`,
    )
    // this.logger.log(`[chatSiteAssitant] history=${JSON.stringify(body.history)}`)

    const reply = await this.chatService.handleChat(body);
    const ret = ok(reply);
    const actionParam = reply && typeof (reply as any).chat_action_param === 'object'
      ? ((reply as any).chat_action_param as Record<string, unknown>)
      : undefined
    const hasTaskflowDraft = Boolean(
      actionParam &&
      (
        (actionParam as any).canvasDraft ||
        (actionParam as any).toolResult?.canvasDraft
      ),
    )
    const paramKeys = actionParam ? Object.keys(actionParam) : []
    this.logger.log(
      `[chatSiteAssitant] [3단계:응답생성] [reqId=${reqId}] status=completed reason=assistant 응답 생성 완료(chatAction=${String((reply as any)?.chat_action ?? '-')}, hasParam=${Boolean(actionParam)}, hasTaskflowDraft=${hasTaskflowDraft}, paramKeys=${paramKeys.join('|') || '-'})`,
    )
    return ret
  }
}