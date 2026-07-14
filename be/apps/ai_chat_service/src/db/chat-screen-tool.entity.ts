import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

/**
 * 화면별 툴 정의. key 는 실제 화면 경로, routeKey 는 바로 상위 경로.
 * api 이름, endpoint, context/request 파라미터를 저장해 동적 REST 액션 정의에 사용할 수 있다.
 */
@Entity({ name: 'chat_screen_tool' })
@Unique(['routeKey', 'toolName'])
export class ChatScreenToolEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'app_key', nullable: true })
  appKey?: string | null

  @Column({ type: 'text', name: 'key' })
  key!: string

  @Column({ type: 'text', name: 'route_key', nullable: true })
  routeKey?: string | null

  @Column({ type: 'text', name: 'tool_name' })
  toolName!: string

  @Column({ type: 'text', name: 'display_name', nullable: true })
  displayName?: string | null

  // data | action
  @Column({ type: 'text', name: 'kind' })
  kind!: string

  @Column({ type: 'text', name: 'description', nullable: true })
  description?: string | null

  @Column({ type: 'text', name: 'api_name', nullable: true })
  apiName?: string | null

  @Column({ type: 'text', name: 'method', nullable: true })
  method?: string | null

  @Column({ type: 'text', name: 'endpoint', nullable: true })
  endpoint?: string | null

  @Column({ type: 'jsonb', name: 'context_params', nullable: true })
  contextParams?: unknown

  @Column({ type: 'jsonb', name: 'request_params', nullable: true })
  requestParams?: unknown

  @Column({ type: 'jsonb', name: 'static_payload', nullable: true })
  staticPayload?: unknown

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
