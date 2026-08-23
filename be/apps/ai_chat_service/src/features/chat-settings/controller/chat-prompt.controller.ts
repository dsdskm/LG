import { Body, Controller, Delete, Get, Logger, Param, Post, Put, Query } from '@nestjs/common'
import { ok, type ChatPromptUpsertRequest } from '@ai-log/shared-contracts'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PromptStoreService } from '../../chat/service/prompt-store.service'

@ApiTags('chat-settings')
@Controller('chat/settings/prompts')
export class ChatPromptController {
  private readonly logger = new Logger(ChatPromptController.name)

  constructor(private readonly promptStore: PromptStoreService) {}

  @Get()
  @ApiOperation({ summary: '프롬프트 목록 조회' })
  @ApiOkResponse({ description: '프롬프트 목록 반환' })
  async listPrompts(
    @Query('app_key') appKeyQuery?: string,
    @Query('screen_key') screenKeyQuery?: string,
    @Query('appKey') appKeyCamel?: string,
    @Query('screenKey') screenKeyCamel?: string,
    @Query('instruction') instructionQuery?: string,
    @Query('type') typeQuery?: string,
  ) {
    const appKey = String(appKeyQuery ?? appKeyCamel ?? '').trim() || undefined
    const screenKey = String(screenKeyQuery ?? screenKeyCamel ?? '').trim() || undefined
    const instructionValue = String(instructionQuery ?? '').trim().toLowerCase()
    const type = String(typeQuery ?? '').trim() ||
      (instructionValue === 'true' || instructionValue === '1' || instructionValue === 'instruction' ? 'instruction' : undefined)

    const items = await this.promptStore.listPrompts({ appKey, screenKey, type })
    this.logger.log(
      `[chat_settings/prompts] list appKey=${appKey ?? '-'} screenKey=${screenKey ?? '-'} type=${type ?? '-'} total=${items.length}`,
    )
    return ok({ items })
  }

  @Post()
  @ApiOperation({ summary: '프롬프트 생성' })
  @ApiOkResponse({ description: '생성된 프롬프트 반환' })
  async createPrompt(@Body() body: ChatPromptUpsertRequest) {
    const screenKey = String(body?.screenKey ?? '').trim()
    if (!screenKey) throw new Error('screenKey is required')

    const appKey = body?.appKey == null ? undefined : String(body.appKey).trim() || undefined
    const type = body?.type == null ? undefined : String(body.type).trim() || undefined
    const prompt = body?.prompt == null ? undefined : String(body.prompt).trim()

    const created = await this.promptStore.createPrompt({
      appKey,
      screenKey,
      type,
      prompt,
      enabled: body?.enabled,
    })
    this.logger.log(`[chat_settings/prompts] create screenKey=${screenKey} type=${body?.type ?? 'instruction'}`)
    return ok(created)
  }

  @Put('common')
  @ApiOperation({ summary: '공통 프롬프트 upsert' })
  @ApiOkResponse({ description: '공통 프롬프트 반환' })
  async upsertCommonPrompt(@Body() body: Partial<ChatPromptUpsertRequest>) {
    const prompt = body?.prompt == null ? undefined : String(body.prompt)
    const updated = await this.promptStore.upsertCommonPrompt({
      prompt,
      enabled: body?.enabled,
    })
    this.logger.log('[chat_settings/prompts] upsert common')
    return ok(updated)
  }

  @Put(':id')
  @ApiOperation({ summary: '프롬프트 수정' })
  @ApiOkResponse({ description: '수정된 프롬프트 반환' })
  async updatePrompt(@Param('id') id: string, @Body() body: Partial<ChatPromptUpsertRequest>) {
    const parsedId = Number(id)
    if (!Number.isFinite(parsedId)) throw new Error('invalid prompt id')

    const prompt = body?.prompt == null ? undefined : String(body.prompt)
    const updated = await this.promptStore.updatePrompt(parsedId, {
      prompt,
      enabled: body?.enabled,
    })
    this.logger.log(`[chat_settings/prompts] update id=${parsedId}`)
    return ok(updated)
  }

  @Delete(':id')
  @ApiOperation({ summary: '프롬프트 삭제' })
  @ApiOkResponse({ description: '삭제된 프롬프트 반환' })
  async deletePrompt(@Param('id') id: string) {
    const parsedId = Number(id)
    if (!Number.isFinite(parsedId) || parsedId <= 0) throw new Error('invalid prompt id')

    const deleted = await this.promptStore.deletePrompt(parsedId)
    this.logger.log(`[chat_settings/prompts] delete id=${parsedId}`)
    return ok(deleted)
  }
}
