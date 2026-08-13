import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

/**
 * 텍스트형 챗봇 프롬프트.
 * screenKey 는 실제 화면 경로(common | robot | robot/ailog | robot/ailog/event ...).
 */
@Entity({ name: 'prompt' })
@Unique(['screenKey', 'type'])
export class Prompt {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'app_key', nullable: true })
  appKey?: string | null

  @Column({ type: 'text', name: 'screen_key' })
  screenKey!: string

  // system | fallback | intent-hint | data-system | action-system | tool-description
  @Column({ type: 'text', name: 'type' })
  type!: string

  @Column({ type: 'text', name: 'prompt', default: '' })
  prompt!: string

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
