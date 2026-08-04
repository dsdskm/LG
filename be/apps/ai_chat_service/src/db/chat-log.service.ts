import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ChatLogEntity } from './chat-log.entity'
import type { ChatTurn } from '../pipeline/pipeline.types'

export type ChatLogInput = {
  author?: string
  conversationId?: string
  currentApp?: string
  currentPath?: string
  chatAction?: string
  userMessage?: string
  assistantText?: string
  debugMeta?: Record<string, unknown>
}

export type ChatLogListQuery = {
  limit?: number
  currentApp?: string
  author?: string
  conversationId?: string
}

@Injectable()
export class ChatLogService {
  private readonly logger = new Logger(ChatLogService.name)

  constructor(
    @InjectRepository(ChatLogEntity)
    private readonly repo: Repository<ChatLogEntity>,
  ) {}

  /**
   * 대화기록 저장. 저장 실패가 채팅 응답을 막지 않도록 예외를 삼킨다.
   */
  async save(input: ChatLogInput): Promise<void> {
    try {
      const entity = this.repo.create({
        author: input.author,
        conversationId: input.conversationId,
        currentApp: input.currentApp,
        currentPath: input.currentPath,
        chatAction: input.chatAction,
        userMessage: input.userMessage,
        assistantText: input.assistantText,
        debugMeta: input.debugMeta,
      })
      const saved = await this.repo.save(entity)
      this.logger.log(`[db] insert chat_log OK id=${saved.id} action=${input.chatAction}`)
    } catch (e: any) {
      this.logger.error(`[db] insert chat_log FAILED err=${e?.message ?? String(e)}`)
    }
  }

  async list(query: ChatLogListQuery = {}): Promise<ChatLogEntity[]> {
    const limit = Number.isFinite(query.limit) ? Math.max(1, Math.min(200, Number(query.limit))) : 50
    const qb = this.repo
      .createQueryBuilder()
      .from('chat_log', 'log')
      .select([
        'log.id AS id',
        'log.current_app AS "currentApp"',
        'log.current_path AS "currentPath"',
        'log.chat_action AS "chatAction"',
        'log.conversation_id AS "conversationId"',
        'log.user_message AS "userMessage"',
        'log.assistant_text AS "assistantText"',
        'log.debug_meta AS "debugMeta"',
        'log.created_at AS "createdAt"',
      ])

    qb.addSelect('log.author', 'author')

    const currentApp = String(query.currentApp ?? '').trim()
    if (currentApp) {
      qb.where('log.current_app = :currentApp', { currentApp })
    }

    const author = String(query.author ?? '').trim()
    if (author) {
      if (currentApp) qb.andWhere('log.author = :author', { author })
      else qb.where('log.author = :author', { author })
    }

    const conversationId = String(query.conversationId ?? '').trim()
    if (conversationId) {
      if (currentApp || author) qb.andWhere('log.conversation_id = :conversationId', { conversationId })
      else qb.where('log.conversation_id = :conversationId', { conversationId })
    }

    const rows = await qb.orderBy('log.created_at', 'DESC').limit(limit).getRawMany()

    return rows.map((row: any) => ({
      id: Number(row.id),
      author: String(row.author ?? '').trim() || undefined,
      conversationId: String(row.conversationId ?? '').trim() || undefined,
      currentApp: String(row.currentApp ?? '').trim() || undefined,
      currentPath: String(row.currentPath ?? '').trim() || undefined,
      chatAction: String(row.chatAction ?? '').trim() || undefined,
      userMessage: String(row.userMessage ?? '').trim() || undefined,
      assistantText: String(row.assistantText ?? '').trim() || undefined,
      debugMeta: row.debugMeta && typeof row.debugMeta === 'object'
        ? (row.debugMeta as Record<string, unknown>)
        : undefined,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    }))
  }

  async buildHistoryContext(query: {
    author?: string
    conversationId?: string
    currentApp?: string
    hoursBack?: number
    maxTurns?: number
  }): Promise<ChatTurn[]> {
    const hoursBack = Number.isFinite(query.hoursBack)
      ? Math.max(1, Math.min(72, Number(query.hoursBack)))
      : 24
    const maxTurns = Number.isFinite(query.maxTurns)
      ? Math.max(1, Math.min(400, Number(query.maxTurns)))
      : 200

    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

    const qb = this.repo
      .createQueryBuilder()
      .from('chat_log', 'log')
      .select([
        'log.user_message AS "userMessage"',
        'log.assistant_text AS "assistantText"',
        'log.created_at AS "createdAt"',
      ])
      .where('log.created_at >= :since', { since })

    const currentApp = String(query.currentApp ?? '').trim()
    if (currentApp) {
      qb.andWhere('log.current_app = :currentApp', { currentApp })
    }

    const author = String(query.author ?? '').trim()
    if (author) {
      qb.andWhere('log.author = :author', { author })
    }

    const conversationId = String(query.conversationId ?? '').trim()
    if (conversationId) {
      qb.andWhere('log.conversation_id = :conversationId', { conversationId })
    }

    const rows = await qb
      .orderBy('log.created_at', 'ASC')
      .limit(Math.ceil(maxTurns / 2) + 50)
      .getRawMany()

    const turns: ChatTurn[] = []
    for (const row of rows) {
      const user = String(row.userMessage ?? '').trim()
      const assistant = String(row.assistantText ?? '').trim()
      if (user) turns.push({ role: 'user', content: user })
      if (assistant) turns.push({ role: 'assistant', content: assistant })
    }

    return turns.slice(-maxTurns)
  }
}
