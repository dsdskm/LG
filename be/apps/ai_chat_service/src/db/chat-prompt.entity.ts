import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

/**
 * 텍스트형 챗봇 프롬프트.
 * key 는 실제 화면 경로(common | robot | robot/ailog | robot/ailog/event ...),
 * routeKey 는 바로 상위 경로를 뜻한다.
 */
@Entity({ name: 'chat_prompt' })
@Unique(['key', 'promptType'])
export class ChatPromptEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'key' })
  key!: string

  @Column({ type: 'text', name: 'app_key', nullable: true })
  appKey?: string | null

  @Column({ type: 'text', name: 'route_key', nullable: true })
  routeKey?: string | null

  // common | screen | tool
  @Column({ type: 'text', name: 'category' })
  category!: string

  // system | fallback | intent-hint | data-system | action-system | tool-description
  @Column({ type: 'text', name: 'prompt_type' })
  promptType!: string

  @Column({ type: 'text', name: 'label', nullable: true })
  label?: string

  @Column({ type: 'text', name: 'content', default: '' })
  content!: string

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
