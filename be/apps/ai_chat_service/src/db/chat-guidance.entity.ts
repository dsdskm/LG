import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

/**
 * guidance(정적 안내) 데이터. key 는 실제 화면 경로, routeKey 는 바로 상위 경로.
 * 매칭 로직은 guidance.util.buildGuidanceAnswer 가 담당(코드 유지).
 */
@Entity({ name: 'chat_guidance' })
@Unique(['key'])
export class ChatGuidanceEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'app_key', nullable: true })
  appKey?: string | null

  @Column({ type: 'text', name: 'key' })
  key!: string

  @Column({ type: 'text', name: 'route_key', nullable: true })
  routeKey?: string | null

  @Column({ type: 'text', name: 'chat_action', nullable: true })
  chatAction?: string

  @Column({ type: 'text', name: 'screen_name', nullable: true })
  screenName?: string

  @Column({ type: 'jsonb', name: 'sections', nullable: true })
  sections?: unknown

  @Column({ type: 'jsonb', name: 'examples', nullable: true })
  examples?: unknown

  @Column({ type: 'text', name: 'fallback_text', nullable: true })
  fallbackText?: string

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
