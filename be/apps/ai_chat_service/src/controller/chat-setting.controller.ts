import { Body, Controller, Delete, Get, Logger, Param, Post, Put, Query } from '@nestjs/common'
import { ok } from '@ai-log/shared-contracts'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ChatLogService } from '../db/chat-log.service'
import {
  CHAT_SETTING_KEYS,
  ChatSettingService,
} from '../db/chat-setting.service'
import {
  buildLegacyEventRuleSettingKey,
  listAllEventRuleRowsByScope,
  parseLegacyEventRuleSettingKey,
  replaceEventRulesByScope,
} from '../db/event-rule-admin.repo'
import {
  buildLegacyEventAliasSettingKey,
  listAllEventFilterAliasesByScope,
  parseLegacyEventAliasSettingKey,
  replaceEventFilterAliases,
} from '../db/event-filter-alias.repo'
import { PromptStoreService } from '../db/prompt-store.service'

/**
 * 채팅 설정 전체 + 스키마 조회.
 * 스키마는 chat_setting.llmProviderSchema row에서 읽어서 프론트 UI를 렌더한다.
 */
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

type CreatePromptBody = {
  appKey?: string
  key?: string
  routeKey?: string
  promptType?: string
  label?: string
  content?: string
  enabled?: boolean
  category?: string
}

type UpsertCommonPromptBody = {
  content?: string
  enabled?: boolean
  label?: string
}

type UpdateGuidanceBody = {
  examples?: unknown
}

type CreateGuidanceBody = {
  appKey?: string
  key?: string
  routeKey?: string
}

type UpdateScreenToolBody = {
  id?: number
  enabled?: boolean
  displayName?: string | null
  description?: string | null
  apiName?: string | null
  method?: string | null
  endpoint?: string | null
  baseUrl?: string | null
  requestHeaders?: unknown
  requestQuery?: unknown
  requestBody?: unknown
  contextParams?: unknown
  requestParams?: unknown
  staticPayload?: unknown
}

type CreateCommonScreenToolBody = {
  actionTypeKey?: string
  displayName?: string
  path?: string
  enabled?: boolean
}

type CreateScreenToolBody = {
  appKey?: string
  key?: string
  routeKey?: string
  actionTypeKey?: string
  toolName?: string
  displayName?: string
  description?: string | null
  endpoint?: string | null
  baseUrl?: string | null
  requestHeaders?: unknown
  requestQuery?: unknown
  requestBody?: unknown
  contextParams?: unknown
  requestParams?: unknown
  staticPayload?: unknown
  enabled?: boolean
}

type UpdateRagDocBody = {
  id?: number
  title?: string
  keywords?: string[]
  body?: string
  imageUrl?: string | null
  imageAttachMode?: 'auto' | 'always' | 'never'
  intentType?: 'info' | 'action' | 'both'
  enabled?: boolean
}

type UpsertCommonRagDocBody = {
  title?: string
  keywords?: string[]
  body?: string
  imageUrl?: string | null
  imageAttachMode?: 'auto' | 'always' | 'never'
  intentType?: 'info' | 'action' | 'both'
  enabled?: boolean
}

type CreateCommonRagDocBody = {
  chunkKey?: string
  title?: string
  keywords?: string[]
  body?: string
  imageUrl?: string | null
  imageAttachMode?: 'auto' | 'always' | 'never'
  intentType?: 'info' | 'action' | 'both'
  enabled?: boolean
  sortOrder?: number
}

type CreateRagDocBody = {
  appKey?: string
  key?: string
  chunkKey?: string
  title?: string
  keywords?: string[]
  body?: string
  imageUrl?: string | null
  imageAttachMode?: 'auto' | 'always' | 'never'
  intentType?: 'info' | 'action' | 'both'
  enabled?: boolean
  sortOrder?: number
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
    const schema = await this.settings.getSchema()
    const llmProvider = await this.settings.getLlmProvider()
    const eventRulesByScope = await listAllEventRuleRowsByScope()
    const eventAliasesByScope = await listAllEventFilterAliasesByScope()
    const [screens, prompts, guidance, ragDocs, screenTools, actionTypes, history] = await Promise.all([
      this.promptStore.listScreens(),
      this.promptStore.listPrompts(),
      this.promptStore.listGuidance(),
      this.promptStore.listRag(),
      this.promptStore.listScreenTools(),
      this.promptStore.listActionTypes(),
      this.chatLog.list({ limit: 20 }),
    ])

    this.logger.log(
      `[chat_settings] getAll screens=${screens.length} prompts=${prompts.length} guidance=${guidance.length} ragDocs=${ragDocs.length} screenTools=${screenTools.length} actionTypes=${actionTypes.length}`,
    )

    const bridgedValues: Record<string, unknown> = { ...values, llmProvider }
    for (const [scopeKey, rows] of Object.entries(eventRulesByScope)) {
      bridgedValues[buildLegacyEventRuleSettingKey(scopeKey)] = rows
    }
    for (const [scopeKey, aliases] of Object.entries(eventAliasesByScope)) {
      bridgedValues[buildLegacyEventAliasSettingKey(scopeKey, 'period')] = aliases.period
      bridgedValues[buildLegacyEventAliasSettingKey(scopeKey, 'severity')] = aliases.severity
      bridgedValues[buildLegacyEventAliasSettingKey(scopeKey, 'status')] = aliases.status
    }

    return ok({
      schema,
      values: bridgedValues,
      management: { screens, prompts, guidance, ragDocs, screenTools, actionTypes, history },
    })
  }

  @Get('history')
  @ApiOperation({ summary: '채팅 내역 페이지 조회' })
  @ApiOkResponse({ description: '페이지네이션된 채팅 내역 반환' })
  async getHistory(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('currentApp') currentApp?: string,
    @Query('author') author?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const page = Number(pageRaw)
    const pageSize = Number(pageSizeRaw)
    this.logger.log(
      `[chat_settings] history request page=${Number.isFinite(page) ? page : 1} pageSize=${Number.isFinite(pageSize) ? pageSize : 20} currentApp=${String(currentApp ?? '').trim() || '-'} author=${String(author ?? '').trim() || '-'} conversationId=${String(conversationId ?? '').trim() || '-'}`,
    )
    const paged = await this.chatLog.listPage({
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      currentApp,
      author,
      conversationId,
    })

    this.logger.log(
      `[chat_settings] history response page=${paged.page}/${paged.totalPages} pageSize=${paged.pageSize} total=${paged.total} returned=${paged.items.length}`,
    )

    return ok({
      items: paged.items,
      pagination: {
        page: paged.page,
        pageSize: paged.pageSize,
        total: paged.total,
        totalPages: paged.totalPages,
        hasNext: paged.hasNext,
        hasPrev: paged.hasPrev,
      },
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

      const eventRuleScope = parseLegacyEventRuleSettingKey(item.key)
      if (eventRuleScope) {
        await replaceEventRulesByScope(eventRuleScope.scopeKey, item.value)
        continue
      }

      const eventAliasScope = parseLegacyEventAliasSettingKey(item.key)
      if (eventAliasScope) {
        await replaceEventFilterAliases(eventAliasScope.scopeKey, eventAliasScope.aliasType, item.value)
        continue
      }

      const value =
        item.key === CHAT_SETTING_KEYS.llmProvider
          ? this.settings.normalizeProvider(item.value)
          : item.value
      await this.settings.upsert(item.key, value)
    }

    const values = await this.settings.getAll()
    const llmProvider = await this.settings.getLlmProvider()
    const eventRulesByScope = await listAllEventRuleRowsByScope()
    const eventAliasesByScope = await listAllEventFilterAliasesByScope()

    const bridgedValues: Record<string, unknown> = { ...values, llmProvider }
    for (const [scopeKey, rows] of Object.entries(eventRulesByScope)) {
      bridgedValues[buildLegacyEventRuleSettingKey(scopeKey)] = rows
    }
    for (const [scopeKey, aliases] of Object.entries(eventAliasesByScope)) {
      bridgedValues[buildLegacyEventAliasSettingKey(scopeKey, 'period')] = aliases.period
      bridgedValues[buildLegacyEventAliasSettingKey(scopeKey, 'severity')] = aliases.severity
      bridgedValues[buildLegacyEventAliasSettingKey(scopeKey, 'status')] = aliases.status
    }

    return ok({ values: bridgedValues })
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

  @Post('prompts')
  @ApiOperation({ summary: '프롬프트 생성' })
  @ApiOkResponse({ description: '생성된 프롬프트 반환' })
  async createPrompt(@Body() body: CreatePromptBody) {
    const row = await this.promptStore.createPrompt({
      appKey: body?.appKey,
      key: String(body?.key ?? ''),
      routeKey: body?.routeKey,
      promptType: body?.promptType,
      label: body?.label,
      content: body?.content,
      enabled: body?.enabled,
      category: body?.category,
    })
    return ok(row)
  }

  @Put('prompts/common')
  @ApiOperation({ summary: '공통 프롬프트 등록/수정' })
  @ApiOkResponse({ description: '갱신된 공통 프롬프트 반환' })
  async upsertCommonPrompt(@Body() body: UpsertCommonPromptBody) {
    const row = await this.promptStore.upsertCommonPrompt({
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
      examples: body?.examples,
    })
    return ok(row)
  }

  @Post('guidance')
  @ApiOperation({ summary: 'guidance 생성' })
  @ApiOkResponse({ description: '생성된 guidance 반환' })
  async createGuidance(@Body() body: CreateGuidanceBody) {
    const row = await this.promptStore.createGuidance({
      appKey: String(body?.appKey ?? ''),
      key: String(body?.key ?? ''),
      routeKey: String(body?.routeKey ?? ''),
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
      baseUrl: body?.baseUrl,
      requestHeaders: body?.requestHeaders,
      requestQuery: body?.requestQuery,
      requestBody: body?.requestBody,
      contextParams: body?.contextParams,
      requestParams: body?.requestParams,
      staticPayload: body?.staticPayload,
    })
    return ok(row)
  }

  @Post('screen-tools/common')
  @ApiOperation({ summary: '공통 화면 이동 액션 등록' })
  @ApiOkResponse({ description: '생성된 공통 액션 반환' })
  async createCommonScreenTool(@Body() body: CreateCommonScreenToolBody) {
    const row = await this.promptStore.createCommonScreenTool({
      actionTypeKey: String(body?.actionTypeKey ?? ''),
      displayName: String(body?.displayName ?? ''),
      path: String(body?.path ?? ''),
      enabled: body?.enabled,
    })
    return ok(row)
  }

  @Post('screen-tools')
  @ApiOperation({ summary: '화면 액션 생성' })
  @ApiOkResponse({ description: '생성된 화면 액션 반환' })
  async createScreenTool(@Body() body: CreateScreenToolBody) {
    const row = await this.promptStore.createScreenTool({
      appKey: String(body?.appKey ?? ''),
      key: String(body?.key ?? ''),
      routeKey: String(body?.routeKey ?? ''),
      actionTypeKey: String(body?.actionTypeKey ?? ''),
      toolName: String(body?.toolName ?? ''),
      displayName: String(body?.displayName ?? ''),
      description: body?.description,
      endpoint: body?.endpoint,
      baseUrl: body?.baseUrl,
      requestHeaders: body?.requestHeaders,
      requestQuery: body?.requestQuery,
      requestBody: body?.requestBody,
      contextParams: body?.contextParams,
      requestParams: body?.requestParams,
      staticPayload: body?.staticPayload,
      enabled: body?.enabled,
    })
    return ok(row)
  }

  @Delete('screen-tools/:id')
  @ApiOperation({ summary: '화면 툴 삭제' })
  @ApiOkResponse({ description: '삭제된 툴 ID 반환' })
  async deleteScreenTool(@Param('id') id: string) {
    const out = await this.promptStore.deleteScreenTool(Number(id))
    return ok(out)
  }

  @Put('rag-docs/:id')
  @ApiOperation({ summary: 'RAG 문서 청크 수정' })
  @ApiOkResponse({ description: '갱신된 RAG 청크 반환' })
  async updateRagDoc(@Param('id') id: string, @Body() body: UpdateRagDocBody) {
    const row = await this.promptStore.updateRagChunk(Number(id), {
      title: body?.title,
      keywords: body?.keywords,
      body: body?.body,
      imageUrl: body?.imageUrl,
      imageAttachMode: body?.imageAttachMode,
      intentType: body?.intentType,
      enabled: body?.enabled,
    })
    return ok(row)
  }

  @Put('rag-docs/common')
  @ApiOperation({ summary: '공통 RAG 등록/수정' })
  @ApiOkResponse({ description: '갱신된 공통 RAG 반환' })
  async upsertCommonRagDoc(@Body() body: UpsertCommonRagDocBody) {
    const row = await this.promptStore.upsertCommonRagDoc({
      title: body?.title,
      keywords: body?.keywords,
      body: body?.body,
      imageUrl: body?.imageUrl,
      imageAttachMode: body?.imageAttachMode,
      intentType: body?.intentType,
      enabled: body?.enabled,
    })
    return ok(row)
  }

  @Post('rag-docs/common')
  @ApiOperation({ summary: '공통 RAG 청크 등록' })
  @ApiOkResponse({ description: '생성된 공통 RAG 청크 반환' })
  async createCommonRagDoc(@Body() body: CreateCommonRagDocBody) {
    const row = await this.promptStore.createCommonRagChunk({
      chunkKey: String(body?.chunkKey ?? ''),
      title: body?.title,
      keywords: body?.keywords,
      body: body?.body,
      imageUrl: body?.imageUrl,
      imageAttachMode: body?.imageAttachMode,
      intentType: body?.intentType,
      enabled: body?.enabled,
      sortOrder: body?.sortOrder,
    })
    return ok(row)
  }

  @Post('rag-docs')
  @ApiOperation({ summary: '화면별 RAG 청크 등록' })
  @ApiOkResponse({ description: '생성된 화면별 RAG 청크 반환' })
  async createRagDoc(@Body() body: CreateRagDocBody) {
    const row = await this.promptStore.createRagChunk({
      appKey: String(body?.appKey ?? ''),
      key: String(body?.key ?? ''),
      chunkKey: String(body?.chunkKey ?? ''),
      title: body?.title,
      keywords: body?.keywords,
      body: body?.body,
      imageUrl: body?.imageUrl,
      imageAttachMode: body?.imageAttachMode,
      intentType: body?.intentType,
      enabled: body?.enabled,
      sortOrder: body?.sortOrder,
    })
    return ok(row)
  }

  @Delete('rag-docs/:id')
  @ApiOperation({ summary: 'RAG 문서 청크 삭제' })
  @ApiOkResponse({ description: '삭제된 RAG 청크 ID 반환' })
  async deleteRagDoc(@Param('id') id: string) {
    const out = await this.promptStore.deleteRagChunk(Number(id))
    return ok(out)
  }

}
