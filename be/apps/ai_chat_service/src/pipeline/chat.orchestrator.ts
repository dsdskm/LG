/**
 * 탭 챗봇 오케스트레이터.
 *
 * 화면(routeKey)에 등록된 ScreenConfig 기준으로 pipeline intent를 분류하고,
 * info(RAG) / action(통합 tool 실행) 경로로 처리한다.
 *
 * 주의:
 * - screenTask: ChatService에서 화면별로 먼저 분류한 사용자 작업 단위
 *   예) list, analyze, recommend_action, run_action, create, update
 *
 * - pipelineIntent: Orchestrator 내부에서 처리 경로를 정하기 위한 분기 단위
 *   예) info, data, action (data/action은 action 경로로 통합 처리)
 */

import { Logger } from '@nestjs/common'

import type { LlmClient } from '../llm/llm.types'
import type { ToolContext, ToolDefinition } from './tool.type'
import { IntentClassifier } from './intent.classifier'
import { RagService } from './rag/rag.service'
import { ToolAgent, type ExecutedCall } from './agent/tool-agent'
import { getScreenConfig, type ScreenConfig } from './screen-registry'
import { COMMON_COLLECTION } from './rag/rag.docs'
import type { ChatIntent, ChatReply, ChatTurn } from './pipeline.types'
import type { ChatPipelineConfig } from './pipeline.config'
import { getPromptStore } from '../db/prompt-store.service'
import { getChatSettingService } from '../db/chat-setting.service'
import { buildToolContextFromBody } from './tool-context.util'

export type OrchestrationOutput = {
  handled: boolean
  reply?: ChatReply
  meta?: Record<string, unknown>
}

type NavigationResult = {
  path: string
  app?: string
  screenName?: string
}

type ScreenTask =
  | 'unknown'
  | 'guide'
  | 'list'
  | 'search'
  | 'summary'
  | 'analyze'
  | 'recommend_action'
  | 'run_action'
  | 'settings'
  | 'create'
  | 'update'
  | 'delete'

type FallbackIntentConfig = {
  actionKeywords: string[]
  actionScreenTasks: ScreenTask[]
}

const DEFAULT_FALLBACK_ACTION_KEYWORDS = [
  '실행', '수행', '처리', '조치', '액션', '이동', '열어', 'navigate', 'action', 'run',
  '추가', '생성', '수정', '변경', '삭제', '제거', '편집', '노드', '태스크플로우', '태스크플로', '태스크 플로우', '태스크 플로', 'taskflow',
  '저장', '임시저장', '정렬', '가로모드', '세로모드', '컨트롤', 'control', '예시',
  'or', 'parallel', 'ifthenelse', 'ifthen', 'repeat', '병렬', '반복',
]

const DEFAULT_FALLBACK_ACTION_SCREEN_TASKS: ScreenTask[] = ['create', 'update', 'delete', 'run_action', 'recommend_action']

export class ChatOrchestrator {
  /**
   * pipeline intent 분류기.
   *
  * 여기서 말하는 intent는 화면별 세부 작업이 아니라,
  * 최종 처리 경로(info 또는 action 우선순위)를 정하는 기준이다.
   */
  private readonly classifier: IntentClassifier
  private readonly rag: RagService
  private readonly agent: ToolAgent

  constructor(
    private readonly client: LlmClient,
    private readonly maxOutputTokens: number,
    private readonly pipeline: ChatPipelineConfig,
    private readonly logger = new Logger(ChatOrchestrator.name),
  ) {
    this.classifier = new IntentClassifier(this.client, this.maxOutputTokens)
    this.rag = new RagService(this.client, this.maxOutputTokens, pipeline.ragTopK, logger)
    this.agent = new ToolAgent(this.client, this.maxOutputTokens, pipeline.maxToolTurns, logger)
  }

  private resolveReqId(body?: any): string {
    return String(body?.reqId ?? body?.requestId ?? '').trim() || '-'
  }

  private stageLog(stage: string, reqId: string, detail?: string) {
    const suffix = detail ? ` ${detail}` : ''
    this.logger.log(`================= [${stage}] [reqId=${reqId}]${suffix}`)
  }

  private async generateDefaultLlmReply(
    screen: ScreenConfig,
    message: string,
    history: ChatTurn[],
    reason: string,
    reqId = '-',
  ): Promise<string | undefined> {
    const systemPrompt = [screen.dataSystemPrompt, screen.actionSystemPrompt].filter(Boolean).join('\n\n')

    this.logger.warn(
      `================= [5단계:기본LLM_폴백] [reqId=${reqId}] status=fallback reason=${reason}`,
    )

    this.logger.debug(
      `================= [5단계:기본LLM_폴백_추적] [reqId=${reqId}] route=${screen.key} systemPromptLen=${systemPrompt.length}`,
    )

    const res = await this.client.generateContent({
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: message },
      ],
      maxOutputTokens: this.maxOutputTokens,
    })

    const text = (res?.text ?? '').trim()
    return text || undefined
  }

  private decideFallbackIntent(
    message: string,
    canRunAction: boolean,
    screenTask: ScreenTask | undefined,
    config: FallbackIntentConfig,
  ): ChatIntent {
    const text = String(message ?? '').toLowerCase()
    const actionKeywords = config.actionKeywords
    const actionRequested = actionKeywords.some((keyword) => text.includes(keyword))

    const actionScreenTask = new Set<ScreenTask>(config.actionScreenTasks)
    if (canRunAction && screenTask && actionScreenTask.has(screenTask)) {
      return 'action'
    }

    if (canRunAction && actionRequested) {
      return 'action'
    }

    return 'info'
  }

  private normalizeActionKeywords(raw: unknown): string[] {
    if (!Array.isArray(raw)) return []
    const normalized = raw
      .map((item) => String(item ?? '').trim().toLowerCase())
      .filter(Boolean)
    return Array.from(new Set(normalized))
  }

  private normalizeActionScreenTasks(raw: unknown): ScreenTask[] {
    if (!Array.isArray(raw)) return []

    const allowed = new Set<ScreenTask>([
      'unknown',
      'guide',
      'list',
      'search',
      'summary',
      'analyze',
      'recommend_action',
      'run_action',
      'settings',
      'create',
      'update',
      'delete',
    ])

    const normalized = raw
      .map((item) => String(item ?? '').trim() as ScreenTask)
      .filter((item) => allowed.has(item))

    return Array.from(new Set(normalized))
  }

  private async resolveFallbackIntentConfig(screenKey: string): Promise<FallbackIntentConfig> {
    const settings = getChatSettingService()
    if (!settings) {
      return {
        actionKeywords: DEFAULT_FALLBACK_ACTION_KEYWORDS,
        actionScreenTasks: DEFAULT_FALLBACK_ACTION_SCREEN_TASKS,
      }
    }

    const routeKey = String(screenKey ?? '').trim()
    const screenKeywordKey = routeKey ? `intentFallback.${routeKey}.actionKeywords` : ''
    const screenTaskKey = routeKey ? `intentFallback.${routeKey}.actionScreenTasks` : ''

    const [screenKeywordsRaw, globalKeywordsRaw, screenTasksRaw, globalTasksRaw] = await Promise.all([
      screenKeywordKey ? settings.get(screenKeywordKey) : Promise.resolve(undefined),
      settings.get('intentFallback.actionKeywords'),
      screenTaskKey ? settings.get(screenTaskKey) : Promise.resolve(undefined),
      settings.get('intentFallback.actionScreenTasks'),
    ])

    const screenKeywords = this.normalizeActionKeywords(screenKeywordsRaw)
    const globalKeywords = this.normalizeActionKeywords(globalKeywordsRaw)
    const screenTasks = this.normalizeActionScreenTasks(screenTasksRaw)
    const globalTasks = this.normalizeActionScreenTasks(globalTasksRaw)

    return {
      actionKeywords: screenKeywords.length > 0
        ? screenKeywords
        : globalKeywords.length > 0
          ? globalKeywords
          : DEFAULT_FALLBACK_ACTION_KEYWORDS,
      actionScreenTasks: screenTasks.length > 0
        ? screenTasks
        : globalTasks.length > 0
          ? globalTasks
          : DEFAULT_FALLBACK_ACTION_SCREEN_TASKS,
    }
  }

  private findLatestAssistantTurn(history: ChatTurn[]): string {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i]?.role !== 'assistant') continue
      const content = String(history[i]?.content ?? '').trim()
      if (content) return content
    }
    return ''
  }

  private isTaskflowNodeClarificationPrompt(text: string): boolean {
    const value = String(text ?? '').trim()
    if (!value) return false
    return /어떤\s*노드.*추가하시겠어요|노드\s*이름.*알려주|추가할\s*노드\s*이름|노드\s*이름\s*말씀해/i.test(value)
  }

  private looksLikeNodeNameOnlyAnswer(text: string): boolean {
    const value = String(text ?? '').trim()
    if (!value) return false
    if (value.length > 40) return false
    if (/[?？]/.test(value)) return false
    if (/(추가|삭제|지워|제거|수정|바꿔|저장|정렬|가로|세로|예시|어떻게|도움|가이드|설명)/i.test(value)) {
      return false
    }
    return /[\p{L}\p{N}]/u.test(value)
  }

  private isTaskflowDeleteClarificationPrompt(text: string): boolean {
    const value = String(text ?? '').trim()
    if (!value) return false
    return /어떤\s*노드.*(삭제|지워|제거)/i.test(value)
  }

  private isTaskflowModeClarificationPrompt(text: string): boolean {
    const value = String(text ?? '').trim()
    if (!value) return false
    return /(가로|세로).*(모드|방향)|모드.*(가로|세로)/i.test(value)
  }

  private isTaskflowSaveClarificationPrompt(text: string): boolean {
    const value = String(text ?? '').trim()
    if (!value) return false
    return /(저장|임시\s*저장).*(어떤|원하시|할까요)|어떤\s*저장/i.test(value)
  }

  private buildContinuationMessage(
    message: string,
    history: ChatTurn[],
    screen: ScreenConfig,
    currentPath?: string,
    lastAssistantMessage?: string,
    reqId = '-',
  ): string {
    const raw = String(message ?? '').trim()
    if (!raw) return raw

    const normalizedPath = String(currentPath ?? '').trim()
    const isTmsTaskflowCanvas = /^\/?tms\/taskflows\/[^/]+\/canvas(?:\/|$)/.test(
      normalizedPath.replace(/^\/+/, ''),
    )
    if (!isTmsTaskflowCanvas) return raw

    const hasComposeTaskflowTool = screen.actionTools.some(
      (tool) => tool?.declaration?.name === 'compose_linear_taskflow',
    )
    if (!hasComposeTaskflowTool) return raw

    const latestAssistant = String(lastAssistantMessage ?? '').trim() || this.findLatestAssistantTurn(history)
    if (this.looksLikeTaskflowEditMessage(raw)) return raw

    let merged = ''
    if (this.isTaskflowNodeClarificationPrompt(latestAssistant)) {
      merged = /노드/i.test(raw)
        ? `${raw} 추가해줘`
        : `${raw} 노드 추가해줘`
    } else if (this.isTaskflowDeleteClarificationPrompt(latestAssistant)) {
      merged = /노드/i.test(raw)
        ? `${raw} 지워줘`
        : `${raw} 노드 지워줘`
    } else if (this.isTaskflowModeClarificationPrompt(latestAssistant)) {
      merged = `${raw} 모드로 바꿔줘`
    } else if (this.isTaskflowSaveClarificationPrompt(latestAssistant)) {
      merged = /임시\s*저장/i.test(raw)
        ? '태스크 플로우 임시 저장해줘'
        : '태스크 플로우 저장해줘'
    } else if (this.looksLikeNodeNameOnlyAnswer(raw) && this.isTaskflowNodeClarificationPrompt(latestAssistant)) {
      merged = /노드/i.test(raw)
        ? `${raw} 추가해줘`
        : `${raw} 노드 추가해줘`
    }

    if (!merged) return raw
    this.stageLog(
      '2-2단계:멀티턴_문맥복원',
      reqId,
      'status=rewritten reason=이전 clarification 문맥을 반영해 후속 발화를 실행 가능 문장으로 변환',
    )
    this.logger.debug(`================= [2-2단계:멀티턴_문맥복원_추적] [reqId=${reqId}] original=${raw} effective=${merged}`)
    return merged
  }

  private uniqueCollections(collections: string[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []

    for (const raw of collections) {
      const key = String(raw ?? '').trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      result.push(key)
    }

    return result
  }

  /**
   * 등록된 화면이면 처리하고, 아니면 handled:false로 반환한다.
   * handled:false는 ChatService에서 guidance fallback으로 이어진다.
   */
  async handle(routeKey: string, message: string, body: any): Promise<OrchestrationOutput> {
    const reqId = this.resolveReqId(body)
    const screen = getScreenConfig(routeKey, reqId)
    this.stageLog(
      '2단계:화면설정_확정',
      reqId,
      `status=${screen ? 'resolved' : 'not-found'} reason=routeKey 기준 화면 설정 조회`,
    )
    if (!screen) {
      return { handled: false }
    }

    this.logger.debug(
      `================= [2단계:화면설정_확정_추적] [reqId=${reqId}] route=${routeKey} screenKey=${screen.key} appKey=${screen.appKey} dataTools=${screen.dataTools.length} actionTools=${screen.actionTools.length} ragCollection=${screen.ragCollection}`,
    )

    const history = normalizeHistory(body?.history)
    const latestAssistantMessage = String(body?.lastAssistantMessage ?? '').trim() || undefined
    const effectiveMessage = this.buildContinuationMessage(
      message,
      history,
      screen,
      String(body?.currentPath ?? '').trim() || undefined,
      latestAssistantMessage,
      reqId,
    )
    const screenTask = this.normalizeScreenTask(body?.screenTask)
    this.stageLog('2-0단계:요청요약', reqId, `status=received reason=screen=${screen.key} query=${effectiveMessage}`)
    this.stageLog('2-1단계:화면작업_입력', reqId, `status=loaded reason=screenTask=${screenTask}`)
    const previousFilters =
      body?.previousFilters && typeof body.previousFilters === 'object'
        ? (body.previousFilters as Record<string, unknown>)
        : undefined
    this.stageLog('2-2단계:이전필터_입력', reqId, `status=checked reason=previousFilters=${Boolean(previousFilters)}`)
    const pipelineIntentResult = await this.classifier.classify(
      effectiveMessage,
      screen.screenName,
      screen.intentHints,
      history,
    )
    this.stageLog(
      '2-3단계:의도분류_원결과',
      reqId,
      `status=classified reason=intent=${pipelineIntentResult.intent}, confidence=${pipelineIntentResult.confidence}`,
    )

    this.logger.debug(
      `================= [2-3단계:의도분류_원결과_추적] [reqId=${reqId}] reasonText=${pipelineIntentResult.reason}`,
    )

    const fallbackIntentConfig = await this.resolveFallbackIntentConfig(screen.key)

    let pipelineIntent: ChatIntent = pipelineIntentResult.intent
    let infoRagCollections = this.uniqueCollections([screen.ragCollection, screen.appKey, COMMON_COLLECTION])
    const actionRagCollections = this.uniqueCollections([screen.ragCollection, screen.appKey, COMMON_COLLECTION])
    this.stageLog('2-4단계:의도분류_초안', reqId, `status=drafted reason=초기 의도=${pipelineIntent}`)
    // 의도 분석 실패(저신뢰도) 시 common action 또는 common RAG로 우선 복구한다.
    if (pipelineIntentResult.confidence < this.pipeline.intentMinConfidence) {
      pipelineIntent = this.decideFallbackIntent(
        effectiveMessage,
        screen.actionTools.length > 0,
        screenTask,
        fallbackIntentConfig,
      )
      infoRagCollections = this.uniqueCollections([COMMON_COLLECTION, screen.ragCollection, screen.appKey])
      this.stageLog(
        '2-5단계:저신뢰도_보정',
        reqId,
        `status=adjusted reason=저신뢰도(${pipelineIntentResult.confidence})로 fallbackIntent=${pipelineIntent} 적용`,
      )
    }

    // 실행 가능 tool이 없는 화면이면 info(RAG)로 처리한다.
    if (pipelineIntent !== 'info' && screen.dataTools.length === 0 && screen.actionTools.length === 0) {
      pipelineIntent = 'info'
    }

    const hasComposeTaskflowTool = screen.actionTools.some(
      (tool) => tool?.declaration?.name === 'compose_linear_taskflow',
    )
    const shouldForceTaskflowAction =
      hasComposeTaskflowTool && this.looksLikeTaskflowEditMessage(effectiveMessage)

    if (shouldForceTaskflowAction && pipelineIntent !== 'action') {
      pipelineIntent = 'action'
      this.stageLog(
        '2-6-1단계:태스크플로우의도_강제',
        reqId,
        'status=forced reason=compose_linear_taskflow 대상 발화로 판단되어 action 파이프라인으로 강제 전환',
      )
    }

    if (pipelineIntent === 'data') {
      pipelineIntent = 'action'
      this.stageLog(
        '2-6-2단계:데이터의도_통합',
        reqId,
        'status=merged reason=data intent를 action 처리 경로로 통합',
      )
    }

    this.stageLog(
      '2-6단계:최종의도_확정',
      reqId,
      `status=confirmed reason=screenTask=${screenTask}, intent=${pipelineIntent}, infoRagCollectionCount=${infoRagCollections.length}`,
    )
    this.stageLog(
      '2-7단계:의도요약',
      reqId,
      `status=classified reason=${pipelineIntent === 'action' ? '액션 요청' : '정보 문의'}`,
    )

    this.logger.debug(
      `================= [2-6단계:최종의도_확정_추적] [reqId=${reqId}] confidence=${pipelineIntentResult.confidence} classifierReason=${pipelineIntentResult.reason} infoRagCollections=${infoRagCollections.join(',')}`,
    )

    const toolCtx = this.buildToolCtx(body, effectiveMessage)

    let output: OrchestrationOutput
    switch (pipelineIntent) {
      case 'action':
        output = await this.handleExecution(
          screen,
          effectiveMessage,
          toolCtx,
          pipelineIntentResult,
          history,
          screenTask,
          previousFilters,
          actionRagCollections,
          reqId,
        )
        break

      case 'info':
      default:
        output = await this.handleInfo(
          screen,
          effectiveMessage,
          pipelineIntentResult,
          history,
          screenTask,
          infoRagCollections,
          reqId,
        )
        break
    }

    const chatAction = String(output?.reply?.chat_action ?? '-')
    const hasParam = Boolean(output?.reply?.chat_action_param)
    const hasDraft = Boolean(
      output?.reply?.chat_action_param &&
      typeof output.reply.chat_action_param === 'object' &&
      (
        Boolean((output.reply.chat_action_param as any)?.canvasDraft) ||
        Boolean((output.reply.chat_action_param as any)?.toolResult?.canvasDraft)
      ),
    )
    this.stageLog(
      '6단계:최종반환_요약',
      reqId,
      `status=returned reason=handled=${Boolean(output?.handled)} chatAction=${chatAction} hasParam=${hasParam} hasDraft=${hasDraft}`,
    )

    return output
  }

  private normalizeScreenTask(value: unknown): ScreenTask {
    const raw = String(value ?? 'unknown').trim()

    switch (raw) {
      case 'guide':
      case 'list':
      case 'search':
      case 'summary':
      case 'analyze':
      case 'recommend_action':
      case 'run_action':
      case 'settings':
      case 'create':
      case 'update':
      case 'delete':
        return raw

      case 'unknown':
      default:
        return 'unknown'
    }
  }

  private buildToolCtx(body: any, message?: string): ToolContext {
    return buildToolContextFromBody({
      body,
      message,
      actionRunnerUrl: this.pipeline.actionRunnerUrl,
      log: {
        log: (m) => this.logger.log(m),
        error: (m) => this.logger.error(m),
      },
    })
  }

  private findNavigationResult(executed: ExecutedCall[]): NavigationResult | undefined {
    for (const call of executed) {
      if (call.error) continue
      const result = call.result
      if (!result || typeof result !== 'object') continue

      const path = String((result as Record<string, unknown>).path ?? '').trim().replace(/^\/+/, '')
      if (!path) continue

      const app = String((result as Record<string, unknown>).app ?? '').trim() || undefined
      return { path, app }
    }

    return undefined
  }

  private normalizeForMatch(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '')
  }

  private inferNavigationFromScreenName(message: string, currentApp: string): NavigationResult | undefined {
    const store = getPromptStore()
    const screens = store?.getEnabledScreens() ?? []
    const normalizedMessage = this.normalizeForMatch(message)
    if (!normalizedMessage) return undefined

    const candidates = screens
      .map((screen) => {
        const normalizedScreenName = this.normalizeForMatch(screen.screenName)
        if (!normalizedScreenName) return undefined
        if (!normalizedMessage.includes(normalizedScreenName)) return undefined

        return {
          key: screen.key,
          appKey: screen.appKey,
          screenName: screen.screenName,
          nameLen: normalizedScreenName.length,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => {
        const appPriorityA = a.appKey === currentApp ? 0 : 1
        const appPriorityB = b.appKey === currentApp ? 0 : 1
        if (appPriorityA !== appPriorityB) return appPriorityA - appPriorityB
        if (a.nameLen !== b.nameLen) return b.nameLen - a.nameLen
        return a.key.localeCompare(b.key)
      })

    const best = candidates[0]
    if (!best) return undefined

    return {
      path: best.key,
      app: best.appKey,
      screenName: best.screenName,
    }
  }

  private looksLikeTaskflowEditMessage(message: string): boolean {
    const text = String(message ?? '').trim()
    if (!text) return false

    if (/(어떻게\s*써|어떻게\s*사용|사용법|뜻|의미|설명|알려줘|알려주|뭐야|무엇|왜\s*|무슨|예시\s*있|어떤\s*경우)/i.test(text)) {
      return false
    }

    const taskflowSubject = /(태스크\s*플로우|태스크\s*플로|태스크플로우|태스크플로|taskflow|노드|이동|parallel|병렬|ifthenelse|ifthen|repeat|or\s*노드|컨트롤|control)/i.test(text)
    if (!taskflowSubject) return false

    return /(구성해|구성|만들어|만들|생성해|생성|추가해|추가|삭제해|삭제|지워|제거해|제거|수정해|수정|바꿔|바꿔줘|저장해|저장|정렬|연결해|이어|붙여|넣어|이동해|가\s*는|가\s*줘|이동\s*태스크)/i.test(text)
  }

  private async tryDeterministicTaskflowDraft(
    screen: ScreenConfig,
    message: string,
    toolCtx: ToolContext,
  ): Promise<Record<string, unknown> | undefined> {
    const composeTool = screen.actionTools.find((tool) => tool?.declaration?.name === 'compose_linear_taskflow')
    if (!composeTool) return undefined
    if (!this.looksLikeTaskflowEditMessage(message)) return undefined

    try {
      const result = await composeTool.execute({}, toolCtx)
      if (!result || typeof result !== 'object') return undefined

      const objectResult = result as Record<string, unknown>
      const hasCanvasDraft = Boolean(objectResult.canvasDraft && typeof objectResult.canvasDraft === 'object')
      const hasClarification = String(objectResult.clarification ?? '').trim().length > 0

      if (!hasCanvasDraft && !hasClarification) return undefined

      if (hasCanvasDraft) {
        this.logger.log(`[prompt-apply] route=${screen.key} deterministic-taskflow-draft-applied=true`)
        this.stageLog(
          '4단계:결정적드래프트_적용',
          this.resolveReqId((toolCtx as any)?.body),
          'status=applied reason=compose_linear_taskflow 결과에 canvasDraft가 포함되어 우선 적용',
        )
      } else {
        this.stageLog(
          '4단계:결정적드래프트_명확화',
          this.resolveReqId((toolCtx as any)?.body),
          'status=blocked reason=compose_linear_taskflow 결과에 clarification이 포함되어 사용자 입력 안내 반환',
        )
      }

      return {
        toolName: 'compose_linear_taskflow',
        toolResult: objectResult,
      }
    } catch (e: any) {
      this.logger.warn(`[prompt-apply] route=${screen.key} deterministic-taskflow-draft-failed err=${e?.message ?? String(e)}`)
      return undefined
    }
  }

  private async handleInfo(
    screen: ScreenConfig,
    message: string,
    pipelineIntentResult: unknown,
    history: ChatTurn[],
    screenTask: ScreenTask,
    ragCollections: string[],
    reqId: string,
  ): Promise<OrchestrationOutput> {
    this.stageLog('3단계:INFO처리_RAG조회', reqId, `status=running reason=정보성 질의로 RAG 우선 조회`)
    this.logger.debug(
      `================= [3단계:INFO처리_RAG조회_추적] [reqId=${reqId}] route=${screen.key} ragCollections=${ragCollections.join(',')}`,
    )

    // response chain:
    // 1. screen/app RAG collection
    // 2. common RAG collection
    // 3. default LLM
    const { text, usedCollection, usedChunks } = await this.rag.answer(
      ragCollections,
      message,
      history,
      reqId,
      { intentType: 'info' },
    )

    const defaultLlmText =
      usedChunks.length === 0 || !text?.trim()
        ? await this.generateDefaultLlmReply(screen, message, history, usedChunks.length === 0 ? 'no-rag-hit' : 'rag-empty-text', reqId)
        : undefined
    const finalText = defaultLlmText || text || ''

    return {
      handled: true,
      reply: {
        chat_action: screen.chatActions.info,
        text: finalText,
      },
      meta: {
        screenTask,
        pipelineIntent: 'info',
        pipelineIntentResult,
        usedCollection,
        usedChunks,
        defaultLlmFallback: Boolean(defaultLlmText),
      },
    }
  }

  private async handleExecution(
    screen: ScreenConfig,
    message: string,
    toolCtx: ToolContext,
    pipelineIntentResult: unknown,
    history: ChatTurn[],
    screenTask: ScreenTask,
    previousFilters: Record<string, unknown> | undefined,
    actionRagCollections: string[],
    reqId = '-',
  ): Promise<OrchestrationOutput> {
    const executionTools = this.resolveExecutionTools(screen)
    const actionToolNames = new Set([
      ...screen.actionTools,
      ...(Array.isArray(screen.commonActionTools) ? screen.commonActionTools : []),
    ].map((tool) => tool.declaration.name))
    const hasExecutionTool = executionTools.length > 0

    if (!hasExecutionTool) {
      const fallbackText = String(screen.fallbackText ?? '').trim() || '실행 가능한 도구가 없습니다.'
      this.stageLog('3단계:ACTION처리_툴없음', reqId, 'status=blocked reason=현재 화면에 실행 가능한 tool이 없음')
      return {
        handled: true,
        reply: {
          chat_action: screen.chatActions.info,
          text: fallbackText,
        },
        meta: {
          screenTask,
          pipelineIntent: 'action',
          pipelineIntentResult,
          executed: [],
          fallbackTextUsed: true,
        },
      }
    }

    const actionRag = this.retrieveActionRagContext(actionRagCollections, message)
    if (actionRag.usedChunks.length > 0) {
      this.stageLog(
        '3-0단계:ACTION처리_RAG조회',
        reqId,
        `status=matched reason=collection=${actionRag.usedCollection ?? '-'} hitCount=${actionRag.usedChunks.length}`,
      )
    } else {
      this.stageLog(
        '3-0단계:ACTION처리_RAG조회',
        reqId,
        'status=miss reason=액션 전용 RAG 매칭 결과 없음',
      )
    }

    const systemPrompt = this.buildExecutionPrompt(screen, previousFilters, actionRag.context)

    this.stageLog('3단계:ACTION처리_툴실행', reqId, 'status=running reason=action 통합 경로로 tool 실행')
    this.logger.debug(
      `================= [3단계:ACTION처리_툴실행_추적] [reqId=${reqId}] route=${screen.key} promptLen=${systemPrompt.length} toolCount=${executionTools.length}`,
    )

    const { text, executed } = await this.agent.run(
      systemPrompt,
      message,
      executionTools,
      toolCtx,
      history,
    )
    const evaluateExecution = async (executionText: string, executionCalls: ExecutedCall[], source: 'screen' | 'common') => {
      const noExecution = executionCalls.length === 0 || executionCalls.every((call) => Boolean(call.error))
      const deterministicTaskflowParam = await this.tryDeterministicTaskflowDraft(screen, message, toolCtx)
      const deterministicApplied = Boolean(deterministicTaskflowParam)
      const deterministicClarification = this.extractActionClarification(deterministicTaskflowParam)

      if (deterministicClarification) {
        return {
          handled: true,
          reply: {
            chat_action: screen.chatActions.action,
            chat_action_param: deterministicTaskflowParam,
            text: deterministicClarification,
          },
          meta: {
            screenTask,
            pipelineIntent: 'action',
            pipelineIntentResult,
            executed: summarizeCalls(executionCalls),
            fallbackTextUsed: false,
            actionAttemptSource: source,
          },
        } as OrchestrationOutput
      }

      const inferredNavigation = noExecution
        ? this.inferNavigationFromScreenName(message, screen.appKey)
        : undefined

      const ran = executionCalls.find((c) => c.name === 'run_action')
      const navigation = this.findNavigationResult(executionCalls) ?? inferredNavigation
      const actionParam = deterministicTaskflowParam ?? this.buildActionParam(executionCalls, ran)
      const clarificationText = this.extractActionClarification(actionParam)
      const assistantToolText = this.extractActionAssistantText(actionParam)
      const successfulActionCall = [...executionCalls].reverse().find((call) => !call.error && actionToolNames.has(call.name))
      const hasSiteAction = Boolean(deterministicApplied || navigation || successfulActionCall)

      const resolvedFilters = pickResolvedFilters(executionCalls)
      const fallbackReason = this.resolveExecutionFallbackReason(executionCalls)
      const fallbackText = this.buildExecutionFallbackText(String(screen.fallbackText ?? ''), fallbackReason)

      if (noExecution && !navigation) {
        this.stageLog('3-2단계:ACTION_폴백텍스트', reqId, `status=fallback reason=${fallbackReason} source=${source}`)
      }

      const finalText =
        clarificationText ||
        assistantToolText ||
        executionText?.trim() ||
        (navigation ? `${navigation.screenName ?? navigation.path} 화면으로 이동하겠습니다.` : '') ||
        (noExecution ? fallbackText : '') ||
        (hasSiteAction ? '요청을 처리했습니다.' : '조회 결과를 확인했습니다.')

      return {
        handled: true,
        reply: {
          chat_action: navigation
            ? 'navigation'
            : screen.chatActions.action,
          chat_action_param: navigation
            ? { path: navigation.path, app: navigation.app }
            : hasSiteAction
              ? actionParam
              : resolvedFilters
                ? { filters: resolvedFilters }
                : undefined,
          text: finalText,
        },
        meta: {
          screenTask,
          pipelineIntent: 'action',
          pipelineIntentResult,
          executed: summarizeCalls(executionCalls),
          hasSiteAction,
          actionRagCollection: actionRag.usedCollection,
          actionRagChunks: actionRag.usedChunks,
          actionAttemptSource: source,
          fallbackReason: noExecution && !navigation ? fallbackReason : undefined,
          fallbackTextUsed: Boolean(noExecution && !navigation),
        },
      } satisfies OrchestrationOutput
    }

    const firstAttempt = await evaluateExecution(text, executed, 'screen')
    if (firstAttempt.reply && firstAttempt.meta && firstAttempt.meta.fallbackTextUsed !== true) {
      return firstAttempt
    }

    const commonActionTools = Array.isArray(screen.commonActionTools) ? screen.commonActionTools : []
    if (commonActionTools.length > 0) {
      this.stageLog(
        '3-1단계:ACTION_공통재시도',
        reqId,
        `status=running reason=screen action 실패 후 common action tool 재시도(commonTools=${commonActionTools.length})`,
      )

      const commonRetryPrompt = [
        systemPrompt,
        '위 action 도구 실행이 실패했다. 이제 공통 action 도구만 기준으로 다시 판단하라.',
        '가능하면 공통 action 도구를 우선 선택하고, 실패하면 그때만 fallback 문구로 내려가라.',
      ].join('\n\n')

      const commonAttempt = await this.agent.run(
        commonRetryPrompt,
        message,
        commonActionTools,
        toolCtx,
        history,
      )

      const commonResult = await evaluateExecution(commonAttempt.text, commonAttempt.executed, 'common')
      if (commonResult.reply) {
        return commonResult
      }
    }

    return firstAttempt
  }

  private retrieveActionRagContext(
    collectionNames: string[],
    query: string,
  ): { context: string; usedCollection?: string; usedChunks: string[] } {
    for (const name of collectionNames) {
      const hits = this.rag.retrieve(name, query, 'action')
      if (hits.length === 0) continue

      const context = hits
        .map((hit, index) => `[액션 문서 ${index + 1}] ${hit.chunk.title}\n${hit.chunk.body}`)
        .join('\n\n')

      return {
        context,
        usedCollection: name,
        usedChunks: hits.map((hit) => hit.chunk.id),
      }
    }

    return { context: '', usedChunks: [] }
  }

  private resolveExecutionFallbackReason(executed: ExecutedCall[]): 'tool-not-selected' | 'missing-params' | 'permission-denied' | 'tool-execution-failed' {
    if (executed.length === 0) {
      return 'tool-not-selected'
    }

    const errors = executed
      .map((call) => String(call.error ?? '').trim().toLowerCase())
      .filter(Boolean)

    if (errors.length === 0) {
      return 'tool-not-selected'
    }

    if (errors.some((msg) => /401|403|unauthorized|forbidden|permission|권한|인가/.test(msg))) {
      return 'permission-denied'
    }

    if (errors.some((msg) => /missing|required|invalid|argument|args|schema|param|context param missing|필수|파라미터/.test(msg))) {
      return 'missing-params'
    }

    return 'tool-execution-failed'
  }

  private buildExecutionFallbackText(
    baseFallbackText: string,
    reason: 'tool-not-selected' | 'missing-params' | 'permission-denied' | 'tool-execution-failed',
  ): string {
    const guidanceByReason: Record<typeof reason, string> = {
      'tool-not-selected': '요청을 조금 더 구체적으로 입력해 주세요.',
      'missing-params': '필수 입력값이 부족할 수 있어요. 대상 이름/조건을 포함해 다시 요청해 주세요.',
      'permission-denied': '권한 확인이 필요합니다. 권한 또는 토큰 상태를 점검해 주세요.',
      'tool-execution-failed': '일시적인 실행 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    }

    const base = String(baseFallbackText ?? '').trim() || '요청을 처리할 수 있는 도구를 찾지 못했습니다.'
    return `${base} ${guidanceByReason[reason]}`.trim()
  }

  private resolveExecutionTools(screen: ScreenConfig): ToolDefinition[] {
    const ordered = [...screen.actionTools, ...screen.dataTools]

    const seen = new Set<string>()
    const unique: ToolDefinition[] = []

    for (const tool of ordered) {
      const name = String(tool?.declaration?.name ?? '').trim()
      if (!name || seen.has(name)) continue
      seen.add(name)
      unique.push(tool)
    }

    return unique
  }

  private buildExecutionPrompt(
    screen: ScreenConfig,
    previousFilters?: Record<string, unknown>,
    actionRagContext?: string,
  ): string {
    const basePrompt = [screen.dataSystemPrompt, screen.actionSystemPrompt].filter(Boolean).join('\n\n')
    const promptBlocks: string[] = [basePrompt]

    if (String(actionRagContext ?? '').trim()) {
      promptBlocks.push([
        '다음은 action 실행 시 참고해야 하는 액션 RAG 문서다.',
        '문서에 나온 파라미터 규칙/정책/우선순위를 가능한 범위에서 tool 인자 구성에 반영하라.',
        String(actionRagContext ?? '').trim(),
      ].join('\n\n'))
    }

    if (previousFilters) {
      promptBlocks.push([
        `직전에 적용된 필터(JSON): ${JSON.stringify(previousFilters)}`,
        '사용자가 조건 추가/좁히기/변경을 요청하면 위 필터를 기준으로 병합하되, 유지할 값도 tool 인자로 다시 명시한다. 완전히 새로운 조회면 무시한다.',
      ].join('\n'))
    }

    return promptBlocks.filter(Boolean).join('\n\n')
  }

  private buildActionParam(
    executed: ExecutedCall[],
    ran?: ExecutedCall,
  ): Record<string, unknown> | undefined {
    const successCall = [...executed].reverse().find((call) => !call.error)

    if (!successCall) {
      return ran ? { executed: ran.result } : undefined
    }

    const result = successCall.result
    const objectResult = result && typeof result === 'object'
      ? (result as Record<string, unknown>)
      : undefined

    if (objectResult?.chat_action_param && typeof objectResult.chat_action_param === 'object') {
      return objectResult.chat_action_param as Record<string, unknown>
    }

    // 기존 run_action 응답 형식과의 호환을 유지한다.
    if (successCall.name === 'run_action') {
      return { executed: result }
    }

    return {
      toolName: successCall.name,
      toolResult: result,
    }
  }

  private extractActionClarification(actionParam?: Record<string, unknown>): string | undefined {
    if (!actionParam || typeof actionParam !== 'object') return undefined

    const direct = String(actionParam.clarification ?? '').trim()
    if (direct) return direct

    const toolResult =
      actionParam.toolResult && typeof actionParam.toolResult === 'object'
        ? (actionParam.toolResult as Record<string, unknown>)
        : undefined
    if (!toolResult) return undefined

    const nested = String(toolResult.clarification ?? '').trim()
    return nested || undefined
  }

  private extractActionAssistantText(actionParam?: Record<string, unknown>): string | undefined {
    if (!actionParam || typeof actionParam !== 'object') return undefined

    const direct = String(actionParam.assistantText ?? '').trim()
    if (direct) return direct

    const toolResult =
      actionParam.toolResult && typeof actionParam.toolResult === 'object'
        ? (actionParam.toolResult as Record<string, unknown>)
        : undefined
    if (!toolResult) return undefined

    const nested = String(toolResult.assistantText ?? toolResult.message ?? '').trim()
    return nested || undefined
  }
}

/** 프론트가 보낸 history를 안전하게 정규화한다. role/content 검증, 최대 8턴. */
function normalizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((turn: any) => ({
      role: turn?.role === 'assistant' ? 'assistant' : 'user',
      content: String(turn?.content ?? '').trim(),
    }))
    .filter((turn): turn is ChatTurn => Boolean(turn.content))
    .slice(-8)
}

/** query_events가 확정한 필터를 프론트 반환용으로 추출한다. 마지막 호출을 우선한다. */
function pickResolvedFilters(executed: ExecutedCall[]): Record<string, unknown> | undefined {
  for (let i = executed.length - 1; i >= 0; i -= 1) {
    const result = executed[i].result as any

    if (executed[i].name === 'query_events' && result?.resolvedFilters) {
      return result.resolvedFilters
    }
  }

  return undefined
}

function summarizeCalls(executed: ExecutedCall[]) {
  return executed.map((call) => ({
    name: call.name,
    args: call.args,
    error: call.error,
  }))
}