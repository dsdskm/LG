import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'screen' })
@Unique(['screenKey'])
export class Screen {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'app_key' })
  appKey!: string

  @Column({ type: 'text', name: 'screen_key' })
  screenKey!: string

  @Column({ type: 'text', name: 'screen_name' })
  screenName!: string

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}