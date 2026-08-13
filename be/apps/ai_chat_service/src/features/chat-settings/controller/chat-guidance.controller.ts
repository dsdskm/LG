import { Body, Controller, Get, Logger, Param, Post, Put, Query } from '@nestjs/common'
import { ok, type ChatGuidanceCreateRequest, type ChatGuidanceUpdateRequest } from '@ai-log/shared-contracts'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PromptStoreService } from '../../chat/service/prompt-store.service'

@ApiTags('chat-settings')
@Controller('chat/settings/guidance')
export class ChatGuidanceController {
  private readonly logger = new Logger(ChatGuidanceController.name)

  constructor(private readonly promptStore: PromptStoreService) {}

  @Get()
  @ApiOperation({ summary: '화면 가이드 목록 조회' })
  @ApiOkResponse({ description: '화면 가이드 목록 반환' })
  async listGuidance(
    @Query('app_key') appKeyQuery?: string,
    @Query('screen_key') screenKeyQuery?: string,
    @Query('appKey') appKeyCamel?: string,
    @Query('screenKey') screenKeyCamel?: string,
    @Query('id') idQuery?: string,
  ) {
    const appKey = String(appKeyQuery ?? appKeyCamel ?? '').trim() || undefined
    const screenKey = String(screenKeyQuery ?? screenKeyCamel ?? '').trim() || undefined
    const id = Number(idQuery)

    const items = await this.promptStore.listGuidance({
      appKey,
      screenKey,
      id: Number.isFinite(id) && id > 0 ? id : undefined,
    })

    this.logger.log(
      `[chat_settings/guidance] list appKey=${appKey ?? '-'} screenKey=${screenKey ?? '-'} id=${Number.isFinite(id) && id > 0 ? id : '-'} total=${items.length}`,
    )
    return ok({ items })
  }

  @Post()
  @ApiOperation({ summary: '화면 가이드 생성' })
  @ApiOkResponse({ description: '생성된 화면 가이드 반환' })
  async createGuidance(@Body() body: ChatGuidanceCreateRequest) {
    const screenKey = String(body?.screenKey ?? '').trim()
    if (!screenKey) throw new Error('screenKey is required')

    const appKey = body?.appKey == null ? undefined : String(body.appKey).trim() || undefined
    const created = await this.promptStore.createGuidance({
      appKey,
      screenKey,
    })
    this.logger.log(`[chat_settings/guidance] create screenKey=${screenKey}`)
    return ok(created)
  }

  @Put(':id')
  @ApiOperation({ summary: '화면 가이드 수정' })
  @ApiOkResponse({ description: '수정된 화면 가이드 반환' })
  async updateGuidance(@Param('id') id: string, @Body() body: ChatGuidanceUpdateRequest) {
    const parsedId = Number(id)
    if (!Number.isFinite(parsedId)) throw new Error('invalid guidance id')

    const updated = await this.promptStore.updateGuidance(parsedId, { examples: body?.examples })
    this.logger.log(`[chat_settings/guidance] update id=${parsedId}`)
    return ok(updated)
  }
}
