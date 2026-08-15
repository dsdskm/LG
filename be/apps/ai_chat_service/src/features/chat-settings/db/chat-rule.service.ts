import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { clearScreenRuleCache } from '../../../domains/front-rule/front-rule-engine'
import { clearTaskflowRulesCache } from '../../../pipeline/taskflow-language-rules'
import { ChatRuleEntity } from './chat-rule.entity'

export type ChatRuleRow = ChatRuleEntity

@Injectable()
export class ChatRuleService {
  private readonly logger = new Logger(ChatRuleService.name)

  constructor(
    @InjectRepository(ChatRuleEntity)
    private readonly repository: Repository<ChatRuleEntity>,
  ) {}

  async listByAppAndScreen(appKey?: string, screenKey?: string): Promise<ChatRuleEntity[]> {
    const normalizedAppKey = String(appKey ?? '').trim()
    const normalizedScreenKey = String(screenKey ?? '').trim()
    const rows = await this.repository.find({
      where: {
        ...(normalizedAppKey ? { appKey: normalizedAppKey } : {}),
        ...(normalizedScreenKey ? { screenKey: normalizedScreenKey } : {}),
        enabled: true,
      },
      order: { priority: 'DESC', updatedAt: 'DESC', id: 'DESC' },
    })
    this.logger.warn(
      `[chat-rule] list appKey=${normalizedAppKey || '-'} screenKey=${normalizedScreenKey || '-'} count=${rows.length} keys=${JSON.stringify(rows.map((row) => `${row.ruleType}:${row.ruleKey}`))}`,
    )
    return rows
  }

  async listAll(): Promise<ChatRuleEntity[]> {
    return this.repository.find({
      where: { enabled: true },
      order: { appKey: 'ASC', screenKey: 'ASC', ruleType: 'ASC', priority: 'DESC', updatedAt: 'DESC', id: 'DESC' },
    })
  }

  async upsert(input: Partial<ChatRuleEntity>): Promise<ChatRuleEntity> {
    const existing = await this.repository.findOne({
      where: {
        appKey: String(input.appKey ?? 'common').trim() || 'common',
        screenKey: String(input.screenKey ?? 'common').trim() || 'common',
        ruleType: String(input.ruleType ?? 'taskflow').trim() || 'taskflow',
        ruleKey: String(input.ruleKey ?? '').trim(),
      },
    })
    const row = this.repository.create({ ...existing, ...input })
    const saved = await this.repository.save(row)
    clearScreenRuleCache(saved.screenKey)
    clearTaskflowRulesCache(saved.screenKey)
    return saved
  }

  async deleteById(id: number): Promise<ChatRuleEntity | null> {
    const row = await this.repository.findOne({ where: { id } })
    if (!row) return null
    const deleted = await this.repository.remove(row)
    clearScreenRuleCache(row.screenKey)
    clearTaskflowRulesCache(row.screenKey)
    return deleted
  }
}