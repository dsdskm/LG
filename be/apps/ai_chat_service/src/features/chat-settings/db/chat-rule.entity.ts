import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'rule' })
@Unique(['appKey', 'screenKey', 'ruleType', 'ruleKey'])
export class ChatRuleEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'app_key', type: 'text', default: 'common' })
  appKey!: string

  @Column({ name: 'screen_key', type: 'text', default: 'common' })
  screenKey!: string

  @Column({ name: 'rule_type', type: 'text', default: 'taskflow' })
  ruleType!: string

  @Column({ name: 'rule_key', type: 'text' })
  ruleKey!: string

  @Column({ name: 'value_json', type: 'jsonb', default: () => "'[]'::jsonb" })
  valueJson!: unknown

  @Column({ type: 'boolean', default: true })
  enabled!: boolean

  @Column({ type: 'integer', default: 100 })
  priority!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}