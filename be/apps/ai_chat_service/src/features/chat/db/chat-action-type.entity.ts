import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'chat_action_type' })
@Unique(['key'])
export class ChatActionTypeEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'key' })
  key!: string

  @Column({ type: 'text', name: 'label' })
  label!: string

  @Column({ type: 'text', name: 'kind', default: 'action' })
  kind!: string

  @Column({ type: 'text', name: 'api_name' })
  apiName!: string

  @Column({ type: 'text', name: 'method' })
  method!: string

  @Column({ type: 'boolean', name: 'requires_path', default: true })
  requiresPath!: boolean

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
