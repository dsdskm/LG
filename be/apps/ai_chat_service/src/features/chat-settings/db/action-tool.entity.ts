import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

/** 앱·화면별로 어떤 action tool 을 LLM 에게 열어 줄지 관리하는 표.
 * llm_function(LLM 이 호출하는 이름)과 client_function(그 결과로 프론트가 실행하는 이름)이 한 쌍이다.
 * 두 함수의 구현은 코드에 있고 이 표의 tool_key 로 찾으므로(ACTION_TOOL_FACTORIES),
 * 이 표는 조회 전용이다. 새 도구는 코드 구현 + seed SQL 로 추가한다.
 */
@Entity({ name: 'action_tool' })
@Unique(['appKey', 'screenKey', 'toolKey'])
export class ActionToolEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'app_key', type: 'text', default: 'common' })
  appKey!: string

  @Column({ name: 'screen_key', type: 'text', default: 'common' })
  screenKey!: string

  /** 도구 구현체를 찾는 키. prompt(action-tools) 의 설명 키와 같은 값을 쓴다. 예: tool.compose */
  @Column({ name: 'tool_key', type: 'text' })
  toolKey!: string

  /** LLM 에 function calling 으로 선언되는 함수 이름. 실제 이름은 도구 구현이 정하고, 서버가 시작할 때 대조한다. */
  @Column({ name: 'llm_function', type: 'text', nullable: true })
  llmFunction?: string | null

  /** LLM 함수와 짝이 되는 프론트 함수 이름. 프론트 client-actions 레지스트리 키와 같아야 한다. */
  @Column({ name: 'client_function', type: 'text', nullable: true })
  clientFunction?: string | null

  /** 관리 화면에 보여줄 설명. LLM 에 가는 문구는 prompt(action-tools) 가 담당한다. */
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', default: true })
  enabled!: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
