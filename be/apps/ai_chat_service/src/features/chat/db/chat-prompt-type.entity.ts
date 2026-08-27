import { Column, Entity, PrimaryColumn } from 'typeorm'

/** 고정 프롬프트 유형 마스터. 유형 추가/수정은 배포 SQL로만 관리한다. */
@Entity({ name: 'prompt_type' })
export class PromptType {
  @PrimaryColumn({ type: 'text', name: 'key' })
  key!: string

  @Column({ type: 'text', name: 'label' })
  label!: string

  @Column({ type: 'text', name: 'description' })
  description!: string

  @Column({ type: 'integer', name: 'sort_order' })
  sortOrder!: number
}