import type { SuggestedAction } from '@ai-log/shared-contracts';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'analysis' })
export class AnalyzerResultEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'event_id', nullable: true })
  eventId?: number;

  @Column({ type: 'text', name: 'summary', nullable: true })
  summary?: string;

  @Column({ type: 'text', name: 'reason', nullable: true })
  reason?: string;

  @Column({ type: 'text', name: 'solutions', nullable: true })
  solutions?: string;

  @Column({ type: 'text', name: 'func', nullable: true })
  funcKey?: string;

  @Column({ type: 'text', name: 'severity', nullable: true })
  severity?: string;

  @Column({ type: 'text', name: 'service', nullable: true })
  service?: string;

  // 후속 액션 제안 (event_analyzer가 채움). 읽기 전용.
  @Column({ type: 'jsonb', name: 'actions', nullable: true })
  actions?: SuggestedAction[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
