import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'rule' })
@Unique(['appKey', 'screenKey', 'ruleKey'])
export class ChatRuleEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'app_key', type: 'text', default: 'common' })
  appKey!: string

  @Column({ name: 'screen_key', type: 'text', default: 'common' })
  screenKey!: string

  @Column({ name: 'rule_key', type: 'text' })
  ruleKey!: string

  // 실행 명령 문자열. 예: /copy, /undo
  @Column({ name: 'command', type: 'text', nullable: true })
  command?: string | null

  // 규칙 매칭용 패턴 템플릿. 예: /copy {taskflowId}
  @Column({ name: 'pattern', type: 'text', nullable: true })
  pattern?: string | null

  // 정규식 패턴. 가장 우선적으로 매칭에 사용한다.
  @Column({ name: 'pattern_regex', type: 'text', nullable: true })
  patternRegex?: string | null

  // 사용자 입력 별칭 목록. JSONB 배열 또는 객체 맵을 허용한다.
  // 예: ['/copy', '/복사'] 또는 { default: ['/copy', '/복사'] }
  @Column({ name: 'aliases', type: 'jsonb', nullable: true })
  aliases?: unknown | null

  // 도움말과 응답에 노출되는 사람이 읽는 설명.
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null

  // 규칙 실행 후 최종적으로 사용자에게 보여줄 응답 텍스트.
  @Column({ name: 'reply_text', type: 'text', nullable: true })
  replyText?: string | null

  // 액션 실패/찾지 못했을 때 보여줄 대체 문구.
  @Column({ name: 'fallback_text', type: 'text', nullable: true })
  fallbackText?: string | null

  // /? 또는 /help에서 보여줄 예시 명령어 목록.
  @Column({ name: 'example', type: 'simple-array', nullable: true })
  example?: string[] | null

  // 앱/화면별로 공통화되지 않는 특수 메타데이터는 여기에 보관한다.
  @Column({ name: 'extra_json', type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  extraJson?: Record<string, unknown> | null

  @Column({ type: 'boolean', default: true })
  enabled!: boolean

  @Column({ type: 'integer', default: 100 })
  priority!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}