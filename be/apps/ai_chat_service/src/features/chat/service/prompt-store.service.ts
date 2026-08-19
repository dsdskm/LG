import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import { Repository } from 'typeorm'

import { Screen } from '../db/chat-screen.entity'
import { Prompt } from '../db/chat-prompt.entity'
import { ScreenGuidanceEntity } from '../db/chat-guidance.entity'
import { Rag } from '../db/chat-rag-doc.entity'

export type GuidanceData = {
  screenName: string
  sections: Array<{ name: string; desc: string; keywords?: string[] }>
  examples: string[]
  fallbackText: string
}

export type RagChunkIntentType = 'info' | 'action' | 'both'
export type RagChunkData = {
  id: string
  title: string
  keywords: string[]
  body: string
  imageUrl?: string
  intentType: RagChunkIntentType
}
export type RagCollectionData = {
  key: string
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

  private prompts = new Map<string, Prompt>()
  private guidance = new Map<string, ScreenGuidanceEntity>()
  private collections = new Map<string, RagCollectionData>()
  private screens = new Map<string, Screen>()

  private normalizeRagIntentType(value: unknown): RagChunkIntentType {
    const normalized = String(value ?? '').trim().toLowerCase()
    if (normalized === 'info' || normalized === 'action' || normalized === 'both') {
      return normalized
    }
    return 'both'
  }

  private serializeRagBody(value: unknown): string {
    const normalizeText = (raw: unknown): string => {
      if (raw === undefined || raw === null) return ''
      if (typeof raw === 'string') return raw.trim()
      if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
      if (Array.isArray(raw)) {
        return raw
          .map((item) => normalizeText(item))
          .filter(Boolean)
          .join(', ')
      }
      if (typeof raw === 'object') {
        const record = raw as Record<string, unknown>
        const parts: string[] = []
        for (const [key, nextValue] of Object.entries(record)) {
          const text = normalizeText(nextValue)
          if (!text) continue
          const shouldSkip = ['title', 'summary', 'description', 'text', 'content', 'message', 'name', 'features', 'sections', 'items'].includes(key)
          if (shouldSkip) {
            parts.push(text)
          }
        }
        return parts.join(' ')
      }
      return ''
    }

    if (value === undefined || value === null) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)

    const record = value as Record<string, unknown>
    const summary: string[] = []

    if (record.title) summary.push(String(record.title).trim())
    if (record.summary) summary.push(String(record.summary).trim())
    if (record.description) summary.push(String(record.description).trim())
    if (record.text) summary.push(String(record.text).trim())
    if (record.content) summary.push(String(record.content).trim())

    const featureList = Array.isArray(record.features) ? record.features : []
    const featureText = featureList.map((item) => normalizeText(item)).filter(Boolean).join(', ')
    if (featureText) summary.push(`주요 기능: ${featureText}.`)

    const sectionList = Array.isArray(record.sections) ? record.sections : []
    for (const section of sectionList) {
      if (!section || typeof section !== 'object') continue
      const row = section as Record<string, unknown>
      const sectionName = normalizeText(row.name)
      const sectionText = normalizeText(row.text)
      if (sectionName && sectionText) summary.push(`${sectionName}: ${sectionText}`)
      else if (sectionText) summary.push(sectionText)
    }

    const itemList = Array.isArray(record.items) ? record.items : []
    for (const item of itemList) {
      const itemText = normalizeText(item)
      if (itemText) summary.push(itemText)
    }

    const combined = summary.filter(Boolean).join(' ')
    return combined || normalizeText(value)
  }

  private normalizeRagBody(value: unknown): string {
    return this.serializeRagBody(value)
  }

  refreshFromDb(): Promise<void> {
    return this.reload()
  }

  constructor(
    @InjectRepository(Screen) private readonly screenRepo: Repository<Screen>,
    @InjectRepository(Prompt) private readonly promptRepo: Repository<Prompt>,
    @InjectRepository(ScreenGuidanceEntity) private readonly guidanceRepo: Repository<ScreenGuidanceEntity>,
    @InjectRepository(Rag) private readonly ragRepo: Repository<Rag>,
  ) {}

  async onModuleInit() {
    await this.reload()
    activeStore = this
    this.logger.log(
      `[prompt-store] loaded screens=${this.screens.size} prompts=${this.prompts.size} guidance=${this.guidance.size} collections=${this.collections.size}`,
    )
  }

  /** DB 전체를 인메모리 캐시로 재적재. */
  async reload() {
    const [screens, prompts, guidance, rag] = await Promise.all([
      this.screenRepo.find(),
      this.promptRepo.find(),
      this.guidanceRepo.find(),
      this.ragRepo.find(),
    ])

    this.screens = new Map(screens.map((s) => [s.screenKey, s]))
    this.prompts = new Map(prompts.map((p) => [`${p.screenKey}::${p.type}`, p]))
    this.guidance = new Map(
      guidance
        .map((g) => {
          const key = String(g.screenKey ?? (g as any)?.key ?? '').trim()
          return key ? [key, g] : null
        })
        .filter((entry): entry is [string, ScreenGuidanceEntity] => Boolean(entry)),
    )
    const byCollection = new Map<string, RagCollectionData>()
    for (const r of rag) {
      if (r.enabled === false) continue
      const collectionKeys = new Set<string>()
      const screenKey = String(r.screenKey ?? '').trim()
      const appKey = String(r.appKey ?? '').trim()
      if (screenKey) collectionKeys.add(screenKey)
      if (appKey) collectionKeys.add(appKey)
      if (collectionKeys.size === 0) continue

      for (const collectionKey of collectionKeys) {
        const col = byCollection.get(collectionKey) ?? { key: collectionKey, chunks: [] }
        const existingIds = new Set(col.chunks.map((chunk) => String(chunk.id ?? '').trim()).filter(Boolean))
        if (!existingIds.has(String(r.chunkKey ?? '').trim())) {
          col.chunks.push({
            id: r.chunkKey,
            title: r.title ?? '',
            keywords: r.keywords ?? [],
            body: this.normalizeRagBody(r.body),
            imageUrl: String(r.imageUrl ?? '').trim() || undefined,
            intentType: this.normalizeRagIntentType(r.intentType),
          })
        }
        byCollection.set(collectionKey, col)
      }
    }
    this.collections = byCollection
  }

  // ── 런타임 조회(동기) ──────────────────────────────
  getPromptContent(key: string, promptType: string): string | undefined {
    const row = this.prompts.get(`${key}::${promptType}`)
    if (!row || row.enabled === false) return undefined
    return row.prompt
  }

  getGuidance(key: string): GuidanceData | undefined {
    const g = this.guidance.get(key)
    if (!g) return undefined
    return {
      screenName: key,
      sections: [],
      examples: (g.examples as GuidanceData['examples']) ?? [],
      fallbackText: '',
    }
  }

  getCollection(name: string): RagCollectionData | undefined {
    return this.collections.get(name)
  }

  getScreen(key: string): Screen | undefined {
    return this.screens.get(key)
  }

  getEnabledScreens(): Screen[] {
    return Array.from(this.screens.values())
      .filter((row) => row.enabled !== false)
      .sort((a, b) => {
        if (a.appKey !== b.appKey) return String(a.appKey).localeCompare(String(b.appKey))
        return String(a.screenKey).localeCompare(String(b.screenKey))
      })
  }

  // ── 설정 UI용 조회/수정 ────────────────────────────
  async listScreens() {
    return this.screenRepo.find({ order: { appKey: 'ASC', screenKey: 'ASC' } })
  }

  async listPrompts(filters?: { appKey?: string | null; screenKey?: string | null; type?: string | null }) {
    const where: Record<string, unknown> = {}
    const appKey = String(filters?.appKey ?? '').trim()
    const screenKey = String(filters?.screenKey ?? '').trim()
    const type = String(filters?.type ?? '').trim()

    if (appKey) where.appKey = appKey
    if (screenKey) where.screenKey = screenKey
    if (type) where.type = type

    return this.promptRepo.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { appKey: 'ASC', screenKey: 'ASC', type: 'ASC' },
    })
  }

  async updatePrompt(
    id: number,
    patch: { prompt?: string; enabled?: boolean },
  ) {
    const row = await this.promptRepo.findOne({ where: { id } })
    if (!row) throw new Error('prompt not found')
    if (patch.prompt !== undefined) row.prompt = patch.prompt
    if (patch.enabled !== undefined) row.enabled = patch.enabled
    await this.promptRepo.save(row)
    await this.reload()
    return row
  }

  async createPrompt(input: {
    appKey?: string | null
    screenKey: string
    type?: string | null
    prompt?: string | null
    enabled?: boolean
  }) {
    const screenKey = String(input.screenKey ?? '').trim()
    const type = String(input.type ?? 'system').trim() || 'system'
    if (!screenKey) throw new Error('prompt screenKey is required')

    const existing = await this.promptRepo.findOne({ where: { screenKey, type } })
    if (existing) return existing

    const appKey = String(input.appKey ?? '').trim() || screenKey.split('/')[0] || screenKey

    const row = this.promptRepo.create({
      screenKey,
      appKey,
      type,
      prompt: String(input.prompt ?? ''),
      enabled: input.enabled !== false,
    })

    await this.promptRepo.save(row)
    await this.reload()
    return row
  }

  async upsertCommonPrompt(
    patch: { prompt?: string; enabled?: boolean },
  ) {
    const existing = await this.promptRepo.findOne({ where: { screenKey: 'common', type: 'system' } })
    const row =
      existing ??
      this.promptRepo.create({
        screenKey: 'common',
        appKey: 'common',
        type: 'system',
        prompt: '',
        enabled: true,
      })

    if (patch.prompt !== undefined) row.prompt = patch.prompt
    if (patch.enabled !== undefined) row.enabled = patch.enabled

    await this.promptRepo.save(row)
    await this.reload()
    return row
  }

  async listGuidance(filters?: { appKey?: string | null; screenKey?: string | null; id?: number | null }) {
    const where: Record<string, unknown> = {}
    const appKey = String(filters?.appKey ?? '').trim()
    const screenKey = String(filters?.screenKey ?? '').trim()
    const id = Number(filters?.id)

    if (appKey) where.appKey = appKey
    if (screenKey) where.screenKey = screenKey
    if (Number.isFinite(id) && id > 0) where.id = id

    return this.guidanceRepo.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { appKey: 'ASC', screenKey: 'ASC' },
    })
  }

  async updateGuidance(
    id: number,
    patch: { examples?: unknown },
  ) {
    const row = await this.guidanceRepo.findOne({ where: { id } })
    if (!row) throw new Error('guidance not found')
    if (patch.examples !== undefined) {
      row.examples = patch.examples
    }
    await this.guidanceRepo.save(row)
    await this.reload()
    return row
  }

  async createGuidance(input: {
    appKey?: string | null
    screenKey: string
  }) {
    const screenKey = String(input.screenKey ?? '').trim()
    if (!screenKey) throw new Error('guidance screenKey is required')

    const appKey = String(input.appKey ?? '').trim() || undefined
    const existing = await this.guidanceRepo.findOne({
      where: appKey
        ? { appKey, screenKey }
        : { screenKey },
    })
    if (existing) return existing

    const row = this.guidanceRepo.create({
      appKey,
      screenKey,
      examples: [],
    })

    await this.guidanceRepo.save(row)
    await this.reload()
    return row
  }

  async listRag(filter?: { appKey?: string; screenKey?: string }) {
    const where: Record<string, unknown> = {}

    const appKey = String(filter?.appKey ?? '').trim()
    const screenKey = String(filter?.screenKey ?? '').trim()

    if (appKey) where.appKey = appKey
    if (screenKey) where.screenKey = screenKey

    return this.ragRepo.find({
      where: Object.keys(where).length > 0 ? where : {},
      order: { appKey: 'ASC', screenKey: 'ASC', chunkKey: 'ASC' },
    })
  }

  async updateRagChunk(
    id: number,
    patch: {
      title?: string
      keywords?: string[]
      body?: string | Record<string, unknown> | unknown[] | null
      imageUrl?: string | null
      enabled?: boolean
      intentType?: string
    },
  ) {
    const row = await this.ragRepo.findOne({ where: { id } })
    if (!row) throw new Error('rag chunk not found')

    if (patch.title !== undefined) row.title = patch.title
    if (patch.keywords !== undefined) row.keywords = patch.keywords
    if (patch.body !== undefined) row.body = this.serializeRagBody(patch.body)
    if (patch.imageUrl !== undefined) {
      row.imageUrl = String(patch.imageUrl ?? '').trim() || null
    }
    if (patch.intentType !== undefined) {
      row.intentType = this.normalizeRagIntentType(patch.intentType)
    }
    if (patch.enabled !== undefined) {
      row.enabled = patch.enabled
    }

    await this.ragRepo.save(row)
    await this.reload()
    return row
  }

  async upsertCommonRagDoc(
    patch: {
      title?: string
      keywords?: string[]
      body?: string | Record<string, unknown> | unknown[] | null
      imageUrl?: string | null
      intentType?: string
      enabled?: boolean
    },
  ) {
    const existing = await this.ragRepo.findOne({ where: { screenKey: 'common', chunkKey: 'common' } })
    const row =
      existing ??
      this.ragRepo.create({
        appKey: 'common',
        screenKey: 'common',
        chunkKey: 'common',
        title: '공통 RAG',
        keywords: [],
        body: '',
        enabled: true,
      })

    if (patch.title !== undefined) row.title = patch.title
    if (patch.keywords !== undefined) row.keywords = patch.keywords
    if (patch.body !== undefined) row.body = this.serializeRagBody(patch.body)
    if (patch.imageUrl !== undefined) row.imageUrl = String(patch.imageUrl ?? '').trim() || null
    if (patch.intentType !== undefined) row.intentType = this.normalizeRagIntentType(patch.intentType)
    if (patch.enabled !== undefined) row.enabled = patch.enabled

    await this.ragRepo.save(row)
    await this.reload()
    return row
  }

  async createCommonRagChunk(input: {
    chunkKey?: string
    title?: string
    keywords?: string[]
    body?: string | Record<string, unknown> | unknown[] | null
    imageUrl?: string | null
    intentType?: string
    enabled?: boolean
  }) {
    const requestedChunkKey = String(input.chunkKey ?? '').trim()
    const title = String(input.title ?? '').trim()
    const baseChunkKey = requestedChunkKey || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const chunkKey = baseChunkKey || `chunk-${Date.now()}`

    const existing = await this.ragRepo.findOne({ where: { screenKey: 'common', chunkKey } })
    if (existing) throw new Error('common rag chunk already exists')

    const row = this.ragRepo.create({
      appKey: 'common',
      screenKey: 'common',
      chunkKey,
      title: title || chunkKey,
      keywords: input.keywords ?? [],
      body: this.serializeRagBody(input.body ?? ''),
      imageUrl: String(input.imageUrl ?? '').trim() || null,
      intentType: this.normalizeRagIntentType(input.intentType),
      enabled: input.enabled !== false,
    })

    await this.ragRepo.save(row)
    await this.reload()
    return row
  }

  async createRagChunk(input: {
    appKey: string
    screenKey: string
    chunkKey?: string
    title?: string
    keywords?: string[]
    body?: string | Record<string, unknown> | unknown[] | null
    imageUrl?: string | null
    intentType?: string
    enabled?: boolean
  }) {
    const screenKey = String(input.screenKey ?? '').trim()
    if (!screenKey) throw new Error('screenKey is required')

    const requestedChunkKey = String(input.chunkKey ?? '').trim()
    const title = String(input.title ?? '').trim()
    const chunkKey = requestedChunkKey || `chunk-${randomUUID()}`

    const existing = await this.ragRepo.findOne({ where: { screenKey, chunkKey } })
    if (existing) throw new Error('screen rag chunk already exists')

    const row = this.ragRepo.create({
      appKey: String(input.appKey ?? '').trim() || screenKey.split('/')[0] || undefined,
      screenKey,
      chunkKey,
      title: title || chunkKey,
      keywords: Array.isArray(input.keywords) ? input.keywords : [],
      body: this.serializeRagBody(input.body ?? ''),
      imageUrl: String(input.imageUrl ?? '').trim() || null,
      intentType: this.normalizeRagIntentType(input.intentType),
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

}
