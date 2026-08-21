import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { clearScreenRuleCache } from '../../../domains/front-rule/front-rule-engine'
import { clearTaskflowRulesCache } from '../../../pipeline/taskflow-language-rules'
import { ChatRuleEntity } from './chat-rule.entity'

export type ChatRuleRow = ChatRuleEntity

function routeMatchesTemplate(template: string, actual: string): boolean {
  const tpl = String(template ?? '').trim().replace(/^\/+/, '')
  const act = String(actual ?? '').trim().replace(/^\/+/, '')
  if (!tpl || !act) return false

  const tplSeg = tpl.split('/').filter(Boolean)
  const actSeg = act.split('/').filter(Boolean)
  if (tplSeg.length !== actSeg.length) return false

  for (let i = 0; i < tplSeg.length; i += 1) {
    const t = tplSeg[i]
    const a = actSeg[i]
    if (!t || !a) return false
    if (t.startsWith(':')) continue
    if (t !== a) return false
  }

  return true
}

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

    const baseWhere = {
      ...(normalizedAppKey ? { appKey: normalizedAppKey } : {}),
      enabled: true,
    }

    const exactRows = normalizedScreenKey
      ? await this.repository.find({
        where: {
          ...baseWhere,
          screenKey: normalizedScreenKey,
        },
        order: { priority: 'DESC', updatedAt: 'DESC', id: 'DESC' },
      })
      : []

    const appRows = normalizedAppKey
      ? await this.repository.find({
        where: {
          ...baseWhere,
          screenKey: normalizedAppKey,
        },
        order: { priority: 'DESC', updatedAt: 'DESC', id: 'DESC' },
      })
      : []

    const rows = [...exactRows, ...appRows]
    const deduped = Array.from(new Map(rows.map((row) => [`${row.appKey}:${row.screenKey}:${row.ruleType}:${row.ruleKey}`, row])).values())

    if (rows.length > 0) {
      this.logger.warn(
        `[chat-rule] list appKey=${normalizedAppKey || '-'} screenKey=${normalizedScreenKey || '-'} count=${deduped.length} keys=${JSON.stringify(deduped.map((row) => `${row.ruleType}:${row.ruleKey}`))}`,
      )
      return deduped
    }

    if (!normalizedScreenKey) {
      this.logger.warn(
        `[chat-rule] list appKey=${normalizedAppKey || '-'} screenKey=${normalizedScreenKey || '-'} count=0 keys=[]`,
      )
      return []
    }

    const allRows = await this.repository.find({
      where: baseWhere,
      order: { priority: 'DESC', updatedAt: 'DESC', id: 'DESC' },
    })
    const templateRows = allRows.filter((row) => routeMatchesTemplate(String(row.screenKey ?? ''), normalizedScreenKey))

    const combined = [...deduped, ...templateRows]
    const finalRows = Array.from(new Map(combined.map((row) => [`${row.appKey}:${row.screenKey}:${row.ruleType}:${row.ruleKey}`, row])).values())

    this.logger.warn(
      `[chat-rule] list appKey=${normalizedAppKey || '-'} screenKey=${normalizedScreenKey || '-'} count=${finalRows.length} keys=${JSON.stringify(finalRows.map((row) => `${row.ruleType}:${row.ruleKey}`))}`,
    )
    return finalRows
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