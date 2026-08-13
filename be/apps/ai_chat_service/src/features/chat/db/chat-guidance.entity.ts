import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * 정적 화면 가이드. 실제 DB 컬럼은 app_key, screen_key, examples 이다.
 */
@Entity({ name: 'screen_guidance' })
export class ScreenGuidanceEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'app_key', nullable: true })
  appKey?: string | null

  @Column({ type: 'text', name: 'screen_key' })
  screenKey!: string

  @Column({ type: 'jsonb', name: 'examples', default: () => "'[]'::jsonb" })
  examples?: unknown

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
