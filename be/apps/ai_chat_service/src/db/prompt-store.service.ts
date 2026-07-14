import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ChatScreenEntity } from './chat-screen.entity'
import { ChatPromptEntity } from './chat-prompt.entity'
import { ChatGuidanceEntity } from './chat-guidance.entity'
import { ChatRagDocEntity } from './chat-rag-doc.entity'
import { ChatScreenToolEntity } from './chat-screen-tool.entity'

export type GuidanceData = {
  screenName: string
  sections: Array<{ name: string; desc: string; keywords?: string[] }>
  examples: Array<{ q: string; a: string; keywords?: string[] }>
  fallbackText: string
}

export type RagChunkData = { id: string; title: string; keywords: string[]; body: string }
export type RagCollectionData = {
  key: string
  routeKey?: string | null
  scope: string
  chunks: RagChunkData[]
}

// 플레인 모듈(rag.service/screen-registry/guidance)에서 접근하기 위한 싱글턴 참조.
let activeStore: PromptStoreService | null = null
export function getPromptStore(): PromptStoreService | null {
  return activeStore
}

@Injectable()
export class PromptStoreService implements OnModuleInit {
  private readonly logger = new Logger(PromptStoreService.name)

  private prompts = new Map<string, ChatPromptEntity>()
  private guidance = new Map<string, ChatGuidanceEntity>()
  private collections = new Map<string, RagCollectionData>()
  private tools = new Map<string, ChatScreenToolEntity>()
  private screens = new Map<string, ChatScreenEntity>()

  constructor(
    @InjectRepository(ChatScreenEntity) private readonly screenRepo: Repository<ChatScreenEntity>,
    @InjectRepository(ChatPromptEntity) private readonly promptRepo: Repository<ChatPromptEntity>,
    @InjectRepository(ChatGuidanceEntity) private readonly guidanceRepo: Repository<ChatGuidanceEntity>,
    @InjectRepository(ChatRagDocEntity) private readonly ragRepo: Repository<ChatRagDocEntity>,
    @InjectRepository(ChatScreenToolEntity) private readonly toolRepo: Repository<ChatScreenToolEntity>,
  ) {}

  async onModuleInit() {
    await this.reload()
    activeStore = this
    this.logger.log(
      `[prompt-store] loaded screens=${this.screens.size} prompts=${this.prompts.size} guidance=${this.guidance.size} collections=${this.collections.size} tools=${this.tools.size}`,
    )
  }

  /** DB 전체를 인메모리 캐시로 재적재. */
  async reload() {
    const [screens, prompts, guidance, rag, tools] = await Promise.all([
      this.screenRepo.find(),
      this.promptRepo.find(),
      this.guidanceRepo.find(),
      this.ragRepo.find(),
      this.toolRepo.find(),
    ])

    this.screens = new Map(screens.map((s) => [s.key, s]))
    this.prompts = new Map(prompts.map((p) => [`${p.key}::${p.promptType}`, p]))
    this.guidance = new Map(guidance.map((g) => [g.key, g]))
    this.tools = new Map(tools.map((t) => [`${t.key}::${t.toolName}`, t]))

    const byCollection = new Map<string, RagCollectionData>()
    for (const r of rag) {
      if (r.enabled === false) continue
      const col = byCollection.get(r.key) ?? { key: r.key, routeKey: r.routeKey, scope: r.scope ?? '', chunks: [] }
      col.chunks.push({ id: r.chunkKey, title: r.title ?? '', keywords: r.keywords ?? [], body: r.body })
      byCollection.set(r.key, col)
    }
    this.collections = byCollection
  }

  // ── 런타임 조회(동기) ──────────────────────────────
  getPromptContent(key: string, promptType: string): string | undefined {
    const row = this.prompts.get(`${key}::${promptType}`)
    if (!row || row.enabled === false) return undefined
    return row.content
  }

  getGuidance(key: string): GuidanceData | undefined {
    const g = this.guidance.get(key)
    if (!g || g.enabled === false) return undefined
    return {
      screenName: g.screenName ?? '',
      sections: (g.sections as GuidanceData['sections']) ?? [],
      examples: (g.examples as GuidanceData['examples']) ?? [],
      fallbackText: g.fallbackText ?? '',
    }
  }

  getCollection(name: string): RagCollectionData | undefined {
    return this.collections.get(name)
  }

  getScreen(key: string): ChatScreenEntity | undefined {
    return this.screens.get(key)
  }

  getScreenTools(routeKey: string, kind?: string): ChatScreenToolEntity[] {
    const normalizedRouteKey = String(routeKey ?? '').trim()
    const normalizedKind = String(kind ?? '').trim().toLowerCase()

    const candidates = Array.from(this.tools.values())
      .filter((row) => {
        if (row.enabled === false) return false

        const rowKey = String(row.key ?? '').trim()
        const isTarget = rowKey === normalizedRouteKey
        const isCommonFallback = normalizedRouteKey !== 'common' && rowKey === 'common'

        if (!isTarget && !isCommonFallback) return false
        if (!normalizedKind) return true
        return String(row.kind ?? '').trim().toLowerCase() === normalizedKind
      })
      .sort((a, b) => {
        const aPriority = String(a.key ?? '').trim() === normalizedRouteKey ? 0 : 1
        const bPriority = String(b.key ?? '').trim() === normalizedRouteKey ? 0 : 1

        if (aPriority !== bPriority) return aPriority - bPriority
        if (Number(a.sortOrder ?? 0) !== Number(b.sortOrder ?? 0)) {
          return Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)
        }
        return String(a.toolName ?? '').localeCompare(String(b.toolName ?? ''))
      })

    const deduped: ChatScreenToolEntity[] = []
    const seen = new Set<string>()

    for (const row of candidates) {
      const toolName = String(row.toolName ?? '').trim()
      if (!toolName || seen.has(toolName)) continue
      seen.add(toolName)
      deduped.push(row)
    }

    return deduped
  }

  /** 행이 없으면 기본 활성(true). */
  isToolEnabled(key: string, toolName: string): boolean {
    const row = this.tools.get(`${key}::${toolName}`)
    return row === undefined ? true : row.enabled !== false
  }

  getScreenTool(key: string, toolName: string): ChatScreenToolEntity | undefined {
    const row = this.tools.get(`${key}::${toolName}`)
    if (!row || row.enabled === false) return undefined
    return row
  }

  // ── 설정 UI용 조회/수정 ────────────────────────────
  async listScreens() {
    return this.screenRepo.find({ order: { appKey: 'ASC', depth: 'ASC', sortOrder: 'ASC', key: 'ASC' } })
  }

  async listPrompts() {
    return this.promptRepo.find({
      order: { appKey: 'ASC', routeKey: 'ASC', key: 'ASC', sortOrder: 'ASC', promptType: 'ASC' },
    })
  }

  async updatePrompt(
    id: number,
    patch: { content?: string; enabled?: boolean; label?: string },
  ) {
    const row = await this.promptRepo.findOne({ where: { id } })
    if (!row) throw new Error('prompt not found')
    if (patch.content !== undefined) row.content = patch.content
    if (patch.enabled !== undefined) row.enabled = patch.enabled
    if (patch.label !== undefined) row.label = patch.label
    await this.promptRepo.save(row)
    await this.reload()
    return row
  }

  async upsertCommonPrompt(
    patch: { content?: string; enabled?: boolean; label?: string },
  ) {
    const existing = await this.promptRepo.findOne({ where: { key: 'common', promptType: 'system' } })
    const row =
      existing ??
      this.promptRepo.create({
        key: 'common',
        appKey: 'common',
        routeKey: 'common',
        category: 'common',
        promptType: 'system',
        label: '공통 프롬프트',
        content: '',
        sortOrder: 0,
        enabled: true,
      })

    if (patch.content !== undefined) row.content = patch.content
    if (patch.enabled !== undefined) row.enabled = patch.enabled
    if (patch.label !== undefined) row.label = patch.label

    await this.promptRepo.save(row)
    await this.reload()
    return row
  }

  async listGuidance() {
    return this.guidanceRepo.find({ order: { appKey: 'ASC', routeKey: 'ASC', sortOrder: 'ASC', key: 'ASC' } })
  }

  async updateGuidance(
    id: number,
    patch: { screenName?: string; sections?: unknown; examples?: unknown; fallbackText?: string; enabled?: boolean },
  ) {
    const row = await this.guidanceRepo.findOne({ where: { id } })
    if (!row) throw new Error('guidance not found')
    Object.assign(row, patch)
    await this.guidanceRepo.save(row)
    await this.reload()
    return row
  }

  async listRag(key?: string) {
    return this.ragRepo.find({
      where: key ? { key } : {},
      order: { appKey: 'ASC', routeKey: 'ASC', key: 'ASC', sortOrder: 'ASC', chunkKey: 'ASC' },
    })
  }

  async updateRagChunk(
    id: number,
    patch: { title?: string; keywords?: string[]; body?: string; enabled?: boolean },
  ) {
    const row = await this.ragRepo.findOne({ where: { id } })
    if (!row) throw new Error('rag chunk not found')
    Object.assign(row, patch)
    await this.ragRepo.save(row)
    await this.reload()
    return row
  }

  async upsertCommonRagDoc(
    patch: { title?: string; keywords?: string[]; body?: string; enabled?: boolean },
  ) {
    const existing = await this.ragRepo.findOne({ where: { key: 'common', chunkKey: 'common' } })
    const row =
      existing ??
      this.ragRepo.create({
        appKey: 'common',
        key: 'common',
        routeKey: 'common',
        scope: '로봇 관제 사이트 공통',
        chunkKey: 'common',
        title: '공통 RAG',
        keywords: [],
        body: '',
        sortOrder: 0,
        enabled: true,
      })

    if (patch.title !== undefined) row.title = patch.title
    if (patch.keywords !== undefined) row.keywords = patch.keywords
    if (patch.body !== undefined) row.body = patch.body
    if (patch.enabled !== undefined) row.enabled = patch.enabled

    await this.ragRepo.save(row)
    await this.reload()
    return row
  }

  async createCommonRagChunk(input: {
    chunkKey: string
    title?: string
    keywords?: string[]
    body?: string
    enabled?: boolean
    sortOrder?: number
  }) {
    const chunkKey = String(input.chunkKey ?? '').trim()
    if (!chunkKey) throw new Error('chunkKey is required')

    const existing = await this.ragRepo.findOne({ where: { key: 'common', chunkKey } })
    if (existing) throw new Error('common rag chunk already exists')

    const row = this.ragRepo.create({
      appKey: 'common',
      key: 'common',
      routeKey: 'common',
      scope: '로봇 관제 사이트 공통',
      chunkKey,
      title: input.title ?? chunkKey,
      keywords: input.keywords ?? [],
      body: input.body ?? '',
      sortOrder: Number(input.sortOrder ?? 0),
      enabled: input.enabled !== false,
    })

    await this.ragRepo.save(row)
    await this.reload()
    return row
  }

  async deleteRagChunk(id: number) {
    const row = await this.ragRepo.findOne({ where: { id } })
    if (!row) throw new Error('rag chunk not found')

    await this.ragRepo.remove(row)
    await this.reload()

    return { id }
  }

  async listScreenTools(key?: string) {
    return this.toolRepo.find({
      where: key ? { key } : {},
      order: { appKey: 'ASC', routeKey: 'ASC', key: 'ASC', sortOrder: 'ASC', toolName: 'ASC' },
    })
  }

  async updateScreenTool(
    id: number,
    patch: {
      enabled?: boolean
      displayName?: string | null
      description?: string | null
      apiName?: string | null
      method?: string | null
      endpoint?: string | null
      contextParams?: unknown
      requestParams?: unknown
      staticPayload?: unknown
    },
  ) {
    const row = await this.toolRepo.findOne({ where: { id } })
    if (!row) throw new Error('screen tool not found')
    Object.assign(row, patch)
    await this.toolRepo.save(row)
    await this.reload()
    return row
  }
}
