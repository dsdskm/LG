import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { PropertyTmsEntity } from '../db/property-tms.entity'

export type TaskSemantics = {
  taskId: number
  taskName: string
  taskType: string
  roleSummary: string
  triggerPhrases: string[]
  contentType: string
  composeHint: Record<string, unknown>
}

/** property_tms.task_type 이 갖는 값. */
export const TASK_TYPE = {
  root: 'ROOT',
  control: 'CONTROL',
  action: 'ACTION',
} as const

// screen-registry 같은 플레인 모듈에서 접근하기 위한 싱글턴 참조. prompt-store 와 동일한 패턴.
let activeStore: PropertyTmsStoreService | null = null
export function getPropertyTmsStore(): PropertyTmsStoreService | null {
  return activeStore
}

@Injectable()
export class PropertyTmsStoreService implements OnModuleInit {
  private readonly logger = new Logger(PropertyTmsStoreService.name)

  private byTaskName = new Map<string, TaskSemantics>()

  constructor(
    @InjectRepository(PropertyTmsEntity) private readonly repo: Repository<PropertyTmsEntity>,
  ) {}

  async onModuleInit() {
    await this.reload()
    activeStore = this
  }

  async reload(): Promise<void> {
    const rows = await this.repo.find({ where: { enabled: true } })

    const next = new Map<string, TaskSemantics>()
    for (const row of rows) {
      next.set(row.taskName.toLowerCase(), {
        taskId: row.taskId,
        taskName: row.taskName,
        taskType: row.taskType,
        roleSummary: row.roleSummary ?? '',
        triggerPhrases: row.triggerPhrases,
        contentType: row.contentType ?? '',
        composeHint: row.composeHint,
      })
    }

    this.byTaskName = next
    this.logger.log(`[property-tms] loaded tasks=${this.byTaskName.size}`)
  }

  get(taskName: string): TaskSemantics | undefined {
    return this.byTaskName.get(String(taskName).trim().toLowerCase())
  }

  list(): TaskSemantics[] {
    return [...this.byTaskName.values()]
  }

  /** LLM 프롬프트에 넣을 task 카탈로그. taskName 은 여기 있는 값만 사용하도록 강제한다. */
  buildCatalogText(): string {
    const lines = this.list()
      .sort((a, b) => a.taskType.localeCompare(b.taskType) || a.taskName.localeCompare(b.taskName))
      .map((task) => {
        const parts = [`- ${task.taskName} (${task.taskType})`]
        if (task.roleSummary) parts.push(task.roleSummary)
        if (task.triggerPhrases.length > 0) parts.push(`표현: ${task.triggerPhrases.join(', ')}`)
        if (task.contentType) parts.push(`콘텐츠: ${task.contentType}`)
        return parts.join(' | ')
      })

    return lines.join('\n')
  }
}
