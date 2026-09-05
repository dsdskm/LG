import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'property_tms' })
@Unique(['taskId'])
export class PropertyTmsEntity {
  @PrimaryGeneratedColumn()
  id!: number

  // 외부 TMS task 의 id. 이 테이블은 마스터를 복제하지 않고 이 값으로 조인만 한다.
  @Column({ name: 'task_id', type: 'int' })
  taskId!: number

  @Column({ name: 'task_name', type: 'text' })
  taskName!: string

  // ROOT | CONTROL | ACTION
  @Column({ name: 'task_type', type: 'text' })
  taskType!: string

  @Column({ name: 'role_summary', type: 'text', nullable: true })
  roleSummary?: string | null

  @Column({ name: 'trigger_phrases', type: 'text', array: true, default: () => "'{}'::text[]" })
  triggerPhrases!: string[]

  @Column({ name: 'content_type', type: 'text', nullable: true })
  contentType?: string | null

  // 자연어 의도 매칭용 힌트. BT 구조 규칙은 tms 앱의 bt/rules 가 단일 소스라 여기 담지 않는다.
  @Column({ name: 'compose_hint', type: 'jsonb', default: () => "'{}'::jsonb" })
  composeHint!: Record<string, unknown>

  @Column({ type: 'boolean', default: true })
  enabled!: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
