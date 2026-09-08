import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { registerActionToolReader, type ActionToolRow } from '../../../pipeline/action-tool-registry'
import { ActionToolEntity } from './action-tool.entity'

function matchRouteTemplate(template: string, actual: string): boolean {
  const tpl = String(template ?? '').trim().replace(/^\/+/, '')
  const act = String(actual ?? '').trim().replace(/^\/+/, '')
  if (!tpl || !act) return false
  if (tpl === act) return true

  const tplSeg = tpl.split('/').filter(Boolean)
  const actSeg = act.split('/').filter(Boolean)
  if (tplSeg.length !== actSeg.length) return false

  return tplSeg.every((segment, index) => segment.startsWith(':') || segment === actSeg[index])
}

/** action_tool 표의 CRUD 와 메모리 캐시. 캐시는 채팅 요청마다 DB 를 때리지 않기 위한 것이다. */
@Injectable()
export class ActionToolService implements OnModuleInit {
  private readonly logger = new Logger(ActionToolService.name)

  private rows: ActionToolEntity[] = []

  constructor(
    @InjectRepository(ActionToolEntity) private readonly repository: Repository<ActionToolEntity>,
  ) {}

  async onModuleInit() {
    await this.reload()
    registerActionToolReader({ listForRoute: (appKey, screenKey) => this.listForRoute(appKey, screenKey) })
  }

  async reload(): Promise<void> {
    this.rows = await this.repository.find({ order: { sortOrder: 'ASC', id: 'ASC' } })
    this.logger.log(`[action-tool] loaded rows=${this.rows.length}`)
  }

  /** 화면(템플릿 포함) -> 앱 -> common 순으로 먼저 찾은 toolKey 를 쓴다. */
  listForRoute(appKey: string, screenKey: string): ActionToolRow[] {
    const scoped = this.rows.filter((row) => row.enabled !== false)

    const buckets = [
      scoped.filter((row) => matchRouteTemplate(row.screenKey, screenKey)),
      scoped.filter((row) => row.appKey === appKey && row.screenKey === appKey),
      scoped.filter((row) => row.appKey === 'common' && row.screenKey === 'common'),
    ]

    const picked = new Map<string, ActionToolRow>()
    for (const bucket of buckets) {
      for (const row of bucket) {
        if (picked.has(row.toolKey)) continue
        picked.set(row.toolKey, {
          toolKey: row.toolKey,
          llmFunction: row.llmFunction,
          clientFunction: row.clientFunction,
          enabled: row.enabled,
          sortOrder: row.sortOrder,
        })
      }
    }

    return [...picked.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }

  async listAll(): Promise<ActionToolEntity[]> {
    return this.repository.find({ order: { appKey: 'ASC', screenKey: 'ASC', sortOrder: 'ASC', id: 'ASC' } })
  }

}
