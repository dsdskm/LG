import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'chat_screen' })
@Unique(['key'])
export class ChatScreenEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'app_key' })
  appKey!: string

  @Column({ type: 'text', name: 'key' })
  key!: string

  @Column({ type: 'text', name: 'route_key', nullable: true })
  routeKey?: string | null

  @Column({ type: 'text', name: 'screen_name' })
  screenName!: string

  @Column({ type: 'int', name: 'depth', default: 0 })
  depth!: number

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}