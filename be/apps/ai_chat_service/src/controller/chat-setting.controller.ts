import { Body, Controller, Get, Logger, Param, Put, Query } from '@nestjs/common'
import { ok } from '@ai-log/shared-contracts'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ChatLogService } from '../db/chat-log.service'
import {
  CHAT_SETTING_KEYS,
  ChatSettingService,
} from '../db/chat-setting.service'
import { PromptStoreService } from '../db/prompt-store.service'

/**
 * 설정 항목 정의(스키마). 프론트가 이 목록으로 UI를 렌더한다.
 * enabled=false 는 향후 지원 예정(자리표시).
 */
const SETTING_SCHEMA = [
  {
    key: CHAT_SETTING_KEYS.llmProvider,
    label: 'LLM Provider',
    type: 'select',
    options: [
      { value: 'azure', label: 'Azure OpenAI' },
      { value: 'vertex', label: 'Google Vertex (Gemini)' },
    ],
    enabled: true,
  },
] as const

type UpdateBody = {
  llmProvider?: string
  settings?: Array<{ key: string; value: unknown }>
}

type UpdatePromptBody = {
  id?: number
  content?: string
  enabled?: boolean
  label?: string
}

type UpdateGuidanceBody = {
  id?: number
  screenName?: string
  sections?: unknown
  examples?: unknown
  fallbackText?: string
  enabled?: boolean
}

type UpdateScreenToolBody = {
  id?: number
  enabled?: boolean
  displayName?: string | null
  description?: string | null
  apiName?: string | null
  method?: string | null
  endpoint?: string | null
  contextParams?: unknown
  requestParams?: unknown
  staticPayload?: unknown
}

type UpdateRagDocBody = {
  id?: number
  title?: string
  keywords?: string[]
  body?: string
  enabled?: boolean
}

@ApiTags('chat-settings')
@Controller('chat/settings')
export class ChatSettingController {
  private readonly logger = new Logger(ChatSettingController.name)

  constructor(
    private readonly settings: ChatSettingService,
    private readonly promptStore: PromptStoreService,
    private readonly chatLog: ChatLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: '채팅 설정 전체 + 스키마 조회' })
  @ApiOkResponse({ description: '설정/스키마 반환' })
  async getAll() {
    const values = await this.settings.getAll()
    const llmProvider = await this.settings.getLlmProvider()
    const [screens, prompts, guidance, ragDocs, screenTools, history] = await Promise.all([
      this.promptStore.listScreens(),
      this.promptStore.listPrompts(),
      this.promptStore.listGuidance(),
      this.promptStore.listRag(),
      this.promptStore.listScreenTools(),
      this.chatLog.list({ limit: 20 }),
    ])

    return ok({
      schema: SETTING_SCHEMA,
      values: { ...values, llmProvider },
      management: { screens, prompts, guidance, ragDocs, screenTools, history },
    })
  }

  @Put()
  @ApiOperation({ summary: '채팅 설정 부분 갱신' })
  @ApiOkResponse({ description: '갱신된 설정 반환' })
  async update(@Body() body: UpdateBody) {
    this.logger.log(`[chat_settings] update body=${JSON.stringify(body)}`)

    // 편의 필드: llmProvider 단건
    if (body?.llmProvider !== undefined) {
      const provider = this.settings.normalizeProvider(body.llmProvider)
      await this.settings.upsert(CHAT_SETTING_KEYS.llmProvider, provider)
    }

    // 일반 key/value 배열
    for (const item of body?.settings ?? []) {
      if (!item?.key) continue
      const value =
        item.key === CHAT_SETTING_KEYS.llmProvider
          ? this.settings.normalizeProvider(item.value)
          : item.value
      await this.settings.upsert(item.key, value)
    }

    const values = await this.settings.getAll()
    const llmProvider = await this.settings.getLlmProvider()
    return ok({ values: { ...values, llmProvider } })
  }

  @Put('prompts/:id')
  @ApiOperation({ summary: '프롬프트 문구 수정' })
  @ApiOkResponse({ description: '갱신된 프롬프트 반환' })
  async updatePrompt(@Param('id') id: string, @Body() body: UpdatePromptBody) {
    const row = await this.promptStore.updatePrompt(Number(id), {
      content: body?.content,
      enabled: body?.enabled,
      label: body?.label,
    })
    return ok(row)
  }

  @Put('guidance/:id')
  @ApiOperation({ summary: 'guidance 수정' })
  @ApiOkResponse({ description: '갱신된 guidance 반환' })
  async updateGuidance(@Param('id') id: string, @Body() body: UpdateGuidanceBody) {
    const row = await this.promptStore.updateGuidance(Number(id), {
      screenName: body?.screenName,
      sections: body?.sections,
      examples: body?.examples,
      fallbackText: body?.fallbackText,
      enabled: body?.enabled,
    })
    return ok(row)
  }

  @Put('screen-tools/:id')
  @ApiOperation({ summary: '화면 툴 활성화 수정' })
  @ApiOkResponse({ description: '갱신된 툴 반환' })
  async updateScreenTool(@Param('id') id: string, @Body() body: UpdateScreenToolBody) {
    const row = await this.promptStore.updateScreenTool(Number(id), {
      enabled: body?.enabled,
      displayName: body?.displayName,
      description: body?.description,
      apiName: body?.apiName,
      method: body?.method,
      endpoint: body?.endpoint,
      contextParams: body?.contextParams,
      requestParams: body?.requestParams,
      staticPayload: body?.staticPayload,
    })
    return ok(row)
  }

  @Put('rag-docs/:id')
  @ApiOperation({ summary: 'RAG 문서 청크 수정' })
  @ApiOkResponse({ description: '갱신된 RAG 청크 반환' })
  async updateRagDoc(@Param('id') id: string, @Body() body: UpdateRagDocBody) {
    const row = await this.promptStore.updateRagChunk(Number(id), {
      title: body?.title,
      keywords: body?.keywords,
      body: body?.body,
      enabled: body?.enabled,
    })
    return ok(row)
  }

  @Get('history')
  @ApiOperation({ summary: '최근 채팅 기록 조회' })
  @ApiOkResponse({ description: '최근 채팅 기록 반환' })
  async getHistory(
    @Query('limit') limit?: string,
    @Query('currentApp') currentApp?: string,
    @Query('author') author?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const rows = await this.chatLog.list({
      limit: Number(limit),
      currentApp: currentApp || undefined,
      author: author || undefined,
      conversationId: conversationId || undefined,
    })
    return ok({ items: rows })
  }
}
