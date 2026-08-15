import { Body, Controller, Delete, Get, Logger, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ok } from '@ai-log/shared-contracts'
import { PromptStoreService } from '../../chat/service/prompt-store.service'

type ChatRagBody = {
  appKey?: string | null
  screenKey?: string | null
  chunkKey?: string | null
  title?: string | null
  keywords?: string[] | null
  body?: string | null
  imageUrl?: string | null
  intentType?: string | null
  enabled?: boolean
}

@ApiTags('chat-settings')
@Controller('chat/settings/rag-docs')
export class ChatRagController {
  private readonly logger = new Logger(ChatRagController.name)

  constructor(private readonly promptStore: PromptStoreService) {}

  @Get()
  @ApiOperation({ summary: 'RAG 문서 목록 조회' })
  @ApiOkResponse({ description: 'RAG 문서 목록 반환' })
  async listRag(
    @Query('app_key') appKeyQuery?: string,
    @Query('screen_key') screenKeyQuery?: string,
    @Query('appKey') appKeyCamel?: string,
    @Query('screenKey') screenKeyCamel?: string,
  ) {
    const appKey = String(appKeyQuery ?? appKeyCamel ?? '').trim() || undefined
    const screenKey = String(screenKeyQuery ?? screenKeyCamel ?? '').trim() || undefined

    const items = await this.promptStore.listRag({ appKey, screenKey })
    const filtered = appKey
      ? items.filter((item) => String(item.appKey ?? '').trim() === appKey || String(item.screenKey ?? '').trim() === appKey)
      : items

    this.logger.log(
      `[chat_settings/rag-docs] list appKey=${appKey ?? '-'} screenKey=${screenKey ?? '-'} total=${filtered.length}`,
    )
    return ok({ items: filtered })
  }

  @Post()
  @ApiOperation({ summary: 'RAG 문서 생성' })
  @ApiOkResponse({ description: '생성된 RAG 문서 반환' })
  async createRag(@Body() body: ChatRagBody & { key?: string | null; routeKey?: string | null; screen_key?: string | null; app_key?: string | null; route_key?: string | null }) {
    const screenKey = String(body?.screenKey ?? body?.screen_key ?? body?.key ?? body?.routeKey ?? body?.route_key ?? '').trim()
    if (!screenKey) throw new Error('screenKey is required')

    const appKey = String(body?.appKey ?? body?.app_key ?? '').trim() || screenKey.split('/')[0] || 'common'
    const created = await this.promptStore.createRagChunk({
      appKey,
      screenKey,
      chunkKey: body?.chunkKey ?? undefined,
      title: body?.title ?? undefined,
      keywords: Array.isArray(body?.keywords) ? body.keywords : [],
      body: body?.body ?? '',
      imageUrl: body?.imageUrl ?? null,
      intentType: body?.intentType ?? 'both',
      enabled: body?.enabled ?? true,
    })

    this.logger.log(`[chat_settings/rag-docs] create appKey=${appKey} screenKey=${screenKey}`)
    return ok(created)
  }

  @Post('common')
  @ApiOperation({ summary: '공통 RAG 문서 생성' })
  @ApiOkResponse({ description: '생성된 공통 RAG 문서 반환' })
  async createCommonRag(@Body() body: ChatRagBody) {
    const created = await this.promptStore.createCommonRagChunk({
      chunkKey: body?.chunkKey ?? undefined,
      title: body?.title ?? undefined,
      keywords: Array.isArray(body?.keywords) ? body.keywords : [],
      body: body?.body ?? '',
      imageUrl: body?.imageUrl ?? null,
      intentType: body?.intentType ?? 'both',
      enabled: body?.enabled ?? true,
    })

    this.logger.log('[chat_settings/rag-docs] create common')
    return ok(created)
  }

  @Put('common')
  @ApiOperation({ summary: '공통 RAG 문서 upsert' })
  @ApiOkResponse({ description: '공통 RAG 문서 반환' })
  async upsertCommonRag(@Body() body: ChatRagBody) {
    const updated = await this.promptStore.upsertCommonRagDoc({
      title: body?.title ?? undefined,
      keywords: Array.isArray(body?.keywords) ? body.keywords : undefined,
      body: body?.body ?? undefined,
      imageUrl: body?.imageUrl ?? undefined,
      intentType: body?.intentType ?? undefined,
      enabled: body?.enabled ?? undefined,
    })

    this.logger.log('[chat_settings/rag-docs] upsert common')
    return ok(updated)
  }

  @Put(':id')
  @ApiOperation({ summary: 'RAG 문서 수정' })
  @ApiOkResponse({ description: '수정된 RAG 문서 반환' })
  async updateRag(@Param('id') id: string, @Body() body: ChatRagBody) {
    const parsedId = Number(id)
    if (!Number.isFinite(parsedId)) throw new Error('invalid rag id')

    const updated = await this.promptStore.updateRagChunk(parsedId, {
      title: body?.title ?? undefined,
      keywords: Array.isArray(body?.keywords) ? body.keywords : undefined,
      body: body?.body ?? undefined,
      imageUrl: body?.imageUrl ?? undefined,
      intentType: body?.intentType ?? undefined,
      enabled: body?.enabled ?? undefined,
    })

    this.logger.log(`[chat_settings/rag-docs] update id=${parsedId}`)
    return ok(updated)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'RAG 문서 삭제' })
  @ApiOkResponse({ description: '삭제된 RAG 문서 반환' })
  async deleteRag(@Param('id') id: string) {
    const parsedId = Number(id)
    if (!Number.isFinite(parsedId)) throw new Error('invalid rag id')

    const deleted = await this.promptStore.deleteRagChunk(parsedId)
    this.logger.log(`[chat_settings/rag-docs] delete id=${parsedId}`)
    return ok(deleted)
  }
}
