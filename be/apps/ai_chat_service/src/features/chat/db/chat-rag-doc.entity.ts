import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

/**
 * RAG 문서 청크. screenKey 는 실제 화면 경로.
 * 검색 로직은 rag.service 가 담당(키워드/본문 스코어).
 */
@Entity({ name: 'rag' })
@Unique(['screenKey', 'chunkKey'])
export class Rag {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'app_key', nullable: true })
  appKey?: string | null

  @Column({ type: 'text', name: 'screen_key' })
  screenKey!: string

  @Column({ type: 'text', name: 'chunk_key' })
  chunkKey!: string

  @Column({ type: 'text', name: 'title', nullable: true })
  title?: string

  @Column({ type: 'jsonb', name: 'keywords', nullable: true })
  keywords?: string[]

  @Column({ type: 'text', name: 'body', default: '' })
  body!: string

  @Column({ type: 'text', name: 'image_url', nullable: true })
  imageUrl?: string | null

  @Column({ type: 'text', name: 'intent_type', default: 'both' })
  intentType!: string

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
