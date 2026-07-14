import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ChatSettingEntity } from './chat-setting.entity'

export const CHAT_SETTING_KEYS = {
  llmProvider: 'llmProvider',
} as const

const VALID_PROVIDERS = ['azure', 'vertex'] as const
export type ChatLlmProvider = (typeof VALID_PROVIDERS)[number]

const CACHE_TTL_MS = 30_000

/**
 * 채팅 설정 저장/조회.
 * - key-value(jsonb) 로 저장하고 인메모리 캐시(TTL)로 조회 부하를 줄인다.
 * - upsert 시 캐시를 무효화해 다음 요청에서 즉시 반영된다.
 */
@Injectable()
export class ChatSettingService {
  private readonly logger = new Logger(ChatSettingService.name)

  private cache: Map<string, unknown> | null = null
  private cacheAt = 0

  constructor(
    @InjectRepository(ChatSettingEntity)
    private readonly repo: Repository<ChatSettingEntity>,
  ) {}

  private invalidate() {
    this.cache = null
    this.cacheAt = 0
  }

  private async load(): Promise<Map<string, unknown>> {
    const fresh = this.cache && Date.now() - this.cacheAt < CACHE_TTL_MS
    if (fresh && this.cache) return this.cache
    const rows = await this.repo.find()
    const map = new Map<string, unknown>()
    for (const r of rows) {
      const key = String(r.key ?? '').trim()
      if (!key) continue
      map.set(key, r.value)
    }
    this.cache = map
    this.cacheAt = Date.now()
    return map
  }

  /** 전체 설정을 { key: value } 객체로 반환. */
  async getAll(): Promise<Record<string, unknown>> {
    const map = await this.load()
    return Object.fromEntries(map.entries())
  }

  async get(key: string): Promise<unknown> {
    const map = await this.load()
    return map.get(key)
  }

  async upsert(key: string, value: unknown): Promise<void> {
    const existing = await this.repo.findOne({ where: { key } })
    if (existing) {
      existing.value = value
      await this.repo.save(existing)
    } else {
      await this.repo.save(this.repo.create({ key, value }))
    }
    this.invalidate()
    this.logger.log(`[db] upsert chat_setting key=${key} value=${JSON.stringify(value)}`)
  }

  /** 현재 활성 LLM provider. DB값 우선, 없으면 env(LLM_PROVIDER), 그다음 azure. */
  async getLlmProvider(): Promise<ChatLlmProvider> {
    const raw = await this.get(CHAT_SETTING_KEYS.llmProvider)
    return this.normalizeProvider(raw ?? process.env.LLM_PROVIDER)
  }

  normalizeProvider(raw: unknown): ChatLlmProvider {
    const v = String(raw ?? '').trim().toLowerCase()
    return (VALID_PROVIDERS as readonly string[]).includes(v)
      ? (v as ChatLlmProvider)
      : 'azure'
  }
}
