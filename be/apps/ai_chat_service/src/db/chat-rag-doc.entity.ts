import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

/**
 * RAG 문서 청크. key 는 실제 화면 경로, routeKey 는 바로 상위 경로.
 * 검색 로직은 rag.service 가 담당(키워드/본문 스코어).
 */
@Entity({ name: 'chat_rag_doc' })
@Unique(['key', 'chunkKey'])
export class ChatRagDocEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text', name: 'app_key', nullable: true })
  appKey?: string | null

  @Column({ type: 'text', name: 'key' })
  key!: string

  @Column({ type: 'text', name: 'route_key', nullable: true })
  routeKey?: string | null

  @Column({ type: 'text', name: 'scope', nullable: true })
  scope?: string

  @Column({ type: 'text', name: 'chunk_key' })
  chunkKey!: string

  @Column({ type: 'text', name: 'title', nullable: true })
  title?: string

  @Column({ type: 'jsonb', name: 'keywords', nullable: true })
  keywords?: string[]

  @Column({ type: 'text', name: 'body', default: '' })
  body!: string

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
