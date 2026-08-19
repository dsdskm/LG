import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ChatSettingEntity } from '../db/chat-setting.entity'

export const CHAT_SETTING_KEYS = {
  llmProvider: 'llmProvider',
  llmProviderSchema: 'llmProviderSchema',
  tmsInfoOnly: 'tmsInfoOnly',
} as const

export type ChatSettingSchemaItem = {
  key: string
  label: string
  type: string
  options?: Array<{ value: string; label: string }>
  enabled?: boolean
}

const VALID_PROVIDERS = ['azure', 'vertex'] as const
export type ChatLlmProvider = (typeof VALID_PROVIDERS)[number]

const CACHE_TTL_MS = 30_000

/**
 * 채팅 설정 저장/조회.
 * - key-value(jsonb) 로 저장하고 인메모리 캐시(TTL)로 조회 부하를 줄인다.
 * - upsert 시 캐시를 무효화해 다음 요청에서 즉시 반영된다.
 */
@Injectable()
export class ChatSettingService implements OnModuleInit {
  private readonly logger = new Logger(ChatSettingService.name)

  private cache: Map<string, unknown> | null = null
  private cacheAt = 0

  constructor(
    @InjectRepository(ChatSettingEntity)
    private readonly repo: Repository<ChatSettingEntity>,
  ) {}

  async onModuleInit() {
    activeChatSettingService = this
  }

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

  async getSchema(): Promise<ChatSettingSchemaItem[]> {
    const raw = await this.get(CHAT_SETTING_KEYS.llmProviderSchema)
    return Array.isArray(raw) ? (raw as ChatSettingSchemaItem[]) : []
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

  /** 현재 활성 LLM provider. DB값만 사용한다. */
  async getLlmProvider(): Promise<ChatLlmProvider> {
    const raw = await this.get(CHAT_SETTING_KEYS.llmProvider)
    return this.normalizeProvider(raw)
  }

  async getBoolean(key: string, fallback = false): Promise<boolean> {
    const raw = await this.get(key)
    if (raw === undefined || raw === null || raw === '') return fallback

    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'number') return raw !== 0

    const v = String(raw).trim().toLowerCase()
    if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true
    if (['false', '0', 'no', 'n', 'off'].includes(v)) return false

    return Boolean(raw) && fallback === true
  }

  normalizeProvider(raw: unknown): ChatLlmProvider {
    const v = String(raw ?? '').trim().toLowerCase()
    if ((VALID_PROVIDERS as readonly string[]).includes(v)) {
      return v as ChatLlmProvider
    }

    throw new Error('chat_setting.llmProvider row is missing or invalid')
  }
}

let activeChatSettingService: ChatSettingService | null = null
export function getChatSettingService(): ChatSettingService | null {
  return activeChatSettingService
}
