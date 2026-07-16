import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

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

  @Column({ type: 'jsonb', name: 'examples', default: () => "'[]'::jsonb" })
  examples?: unknown

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
