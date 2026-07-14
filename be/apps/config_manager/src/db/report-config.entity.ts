import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'report' })
export class ReportConfigEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  /**
   * 싱글톤 row 보장용 고정 키
   * 항상 'default' 하나만 사용
   */
  @Column({ type: 'varchar', length: 32, default: 'default' })
  singletonKey!: string;

  /**
   * 메일/알림 제목 템플릿
   * 예: [{eventId}]{summary}
   */
  @Column({ type: 'text' })
  subjectTemplate!: string;

  /**
   * 본문 HTML 템플릿
   */
  @Column({ type: 'text' })
  htmlTemplate!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  description!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}