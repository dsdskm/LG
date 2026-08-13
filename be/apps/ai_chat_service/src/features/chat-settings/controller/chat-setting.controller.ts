import { Body, Controller, Get, Logger, Put, Query } from '@nestjs/common'
import { ok, type ChatSettingUpdateRequest } from '@ai-log/shared-contracts'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ChatLogService } from '../db/chat-log.service'
import { CHAT_SETTING_KEYS, ChatSettingService } from '../service/chat-setting.service'
import { PromptStoreService } from '../../chat/service/prompt-store.service'
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

@ApiTags('chat-settings')
@Controller('chat/settings')
export class ChatSettingController {
  private readonly logger = new Logger(ChatSettingController.name)

  constructor(
    private readonly settings: ChatSettingService,
    private readonly chatLog: ChatLogService,
    private readonly promptStore: PromptStoreService,
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
    const history = await this.chatLog.list({ limit: 20 })
    const prompts = await this.promptStore.listPrompts()

    this.logger.log(
      `[chat_settings] getAll history=${history.length} prompts=${prompts.length} settings=${Object.keys(values).length}`,
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
      management: { history, prompts },
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
  async update(@Body() body: ChatSettingUpdateRequest) {
    this.logger.log(`[chat_settings] update body=${JSON.stringify(body)}`)

    if (body?.llmProvider !== undefined) {
      const provider = this.settings.normalizeProvider(body.llmProvider)
      await this.settings.upsert(CHAT_SETTING_KEYS.llmProvider, provider)
    }

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
}

