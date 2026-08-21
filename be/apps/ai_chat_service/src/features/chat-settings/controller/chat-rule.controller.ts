import { Body, Controller, Delete, Get, Logger, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ok } from '@ai-log/shared-contracts'
import { matchFrontRuleRows } from '../../../domains/front-rule/front-rule-engine'
import { ChatRuleService } from '../db/chat-rule.service'

@ApiTags('chat-settings')
@Controller('chat/settings/rules')
export class ChatRuleController {
  private readonly logger = new Logger(ChatRuleController.name)

  constructor(private readonly chatRules: ChatRuleService) {}

  @Get()
  @ApiOperation({ summary: 'generic rules 목록 조회' })
  @ApiOkResponse({ description: '앱/화면 범위 기준 rules 조회' })
  async list(@Query('app_key') appKeyQuery?: string, @Query('screen_key') screenKeyQuery?: string) {
    const appKey = String(appKeyQuery ?? '').trim() || undefined
    const screenKey = String(screenKeyQuery ?? '').trim() || undefined

    const requestLog = {
      appKey,
      screenKey,
      raw: {
        app_key: appKeyQuery,
        screen_key: screenKeyQuery,
      },
    }
    this.logger.log(`[chat_settings/rules] list request received ${JSON.stringify(requestLog)}`)
    console.log(`[chat_settings/rules] list request received ${JSON.stringify(requestLog)}`)

    const items = await this.chatRules.listByAppAndScreen(appKey, screenKey)

    const resultLog = {
      appKey,
      screenKey,
      total: items.length,
      rawItems: items,
      fullResponse: { items },
    }

    return ok({ items })
  }

  @Get('all')
  async listAll() {
    const items = await this.chatRules.listAll()
    return ok({ items })
  }

  @Post('match')
  @ApiOperation({ summary: '화면별 taskflow command rule 매칭' })
  async matchCommand(@Body() body: Record<string, unknown>) {
    const appKey = String(body?.appKey ?? body?.app_key ?? '').trim()
    const screenKey = String(body?.screenKey ?? body?.screen_key ?? '').trim()
    const message = String(body?.message ?? '').trim()
    if (!appKey || !screenKey || !message) return ok({ match: null })

    const rows = await this.chatRules.listByAppAndScreen(appKey, screenKey)
    const appRows = await this.chatRules.listByAppAndScreen(appKey, appKey)
    const allTmsRules = Array.from(new Map([...rows, ...appRows].map((row) => [`${row.appKey}:${row.screenKey}:${row.ruleType}:${row.ruleKey}`, row])).values())
    this.logger.log(`[chat_settings/rules/match] appKey=${appKey} screenKey=${screenKey} message="${message}" candidateRules=${allTmsRules.length} ruleKeys=[${allTmsRules.map((row) => `${row.ruleType}:${row.ruleKey}`).join(', ')}]`)
    const matched = matchFrontRuleRows({ screenKey, message }, allTmsRules)
    if (!matched) return ok({ match: null })

    const args = matched.toolArgs && typeof matched.toolArgs === 'object' ? matched.toolArgs : {}
    const {
      aliases: _aliases,
      patternRegex: _patternRegex,
      regex: _regex,
      replyText,
      description,
      ...command
    } = args

    return ok({
      match: {
        ruleKey: matched.ruleKey,
        chatAction: matched.chatAction || undefined,
        chatActionParam: matched.chatActionParam && typeof matched.chatActionParam === 'object'
          ? matched.chatActionParam
          : undefined,
        command,
        replyText: String(replyText ?? description ?? '').trim(),
      },
    })
  }

  @Post()
  @ApiOperation({ summary: 'generic rule 생성/업서트' })
  @ApiOkResponse({ description: 'rule 저장 결과' })
  async upsert(@Body() body: Record<string, unknown>) {
    const appKey = String(body?.appKey ?? body?.app_key ?? 'common').trim() || 'common'
    const screenKey = String(body?.screenKey ?? body?.screen_key ?? 'common').trim() || 'common'
    const ruleType = String(body?.ruleType ?? body?.rule_type ?? 'taskflow').trim() || 'taskflow'
    const ruleKey = String(body?.ruleKey ?? body?.rule_key ?? '').trim()
    const enabledValue = body?.enabled
    const enabled = enabledValue === undefined ? true : Boolean(enabledValue)
    const priorityRaw = Number(body?.priority ?? 100)
    const priority = Number.isFinite(priorityRaw) ? priorityRaw : 100

    if (!ruleKey) {
      throw new Error('ruleKey is required')
    }

    const row = await this.chatRules.upsert({
      appKey,
      screenKey,
      ruleType,
      ruleKey,
      valueJson: body?.valueJson ?? body?.value_json ?? body?.value ?? null,
      enabled,
      priority,
    })

    this.logger.log(`[chat_settings/rules] upsert appKey=${appKey} screenKey=${screenKey} ruleType=${ruleType} ruleKey=${ruleKey}`)
    return ok(row)
  }

  @Put()
  async replace(@Body() body: Record<string, unknown>) {
    return this.upsert(body)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'generic rule 삭제' })
  @ApiOkResponse({ description: '삭제된 rule 반환' })
  async deleteRule(@Param('id') id: string) {
    const parsedId = Number(id)
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      throw new Error('invalid rule id')
    }

    const deleted = await this.chatRules.deleteById(parsedId)
    this.logger.log(`[chat_settings/rules] delete id=${parsedId} deleted=${Boolean(deleted)}`)
    return ok({ deleted })
  }
}
