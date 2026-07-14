import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'events' })
export class ReceiverEventEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'text', name: 'robot_id', default: 'UNKNOWN' })
  robotId!: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'jsonb', name: 'error_log_bundle', nullable: true })
  errorLogBundle!: unknown | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
