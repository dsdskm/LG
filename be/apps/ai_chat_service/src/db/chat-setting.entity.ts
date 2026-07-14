import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'

/**
 * 채팅 설정. key-value 구조로 확장 가능하게 저장한다.
 * 예) key='llmProvider' value='"vertex"'(jsonb).
 */
@Entity({ name: 'chat_setting' })
@Unique(['key'])
export class ChatSettingEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'key' })
  key!: string

  @Column({ type: 'jsonb', name: 'value', nullable: true })
  value?: unknown

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
