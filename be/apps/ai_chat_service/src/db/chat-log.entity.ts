import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

/**
 * 채팅 대화기록. 한 행 = 사용자 메시지 1건 + 어시스턴트 응답 1건.
 */
@Entity({ name: 'chat_log' })
@Index(['currentApp', 'createdAt'])
export class ChatLogEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  // 현재 화면 컨텍스트
  @Column({ type: 'text', name: 'current_app', nullable: true })
  currentApp?: string

  @Column({ type: 'text', name: 'current_path', nullable: true })
  currentPath?: string

  // 라우팅 결과
  @Column({ type: 'text', name: 'chat_action', nullable: true })
  chatAction?: string

  @Column({ type: 'text', name: 'author', nullable: true })
  author?: string

  @Column({ type: 'text', name: 'conversation_id', nullable: true })
  conversationId?: string

  // 대화 내용
  @Column({ type: 'text', name: 'user_message', nullable: true })
  userMessage?: string

  @Column({ type: 'text', name: 'assistant_text', nullable: true })
  assistantText?: string

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date
}
