/**
 * 챗봇 진입 서비스.
 *
 * 처리 순서:
 * 1. 현재 화면(routeKey) 확정
 * 2. 화면별 handler 선택
 * 3. 해당 화면 안에서 intent 분류
 * 4. 화면별 pipeline/orchestrator 처리
 * 5. 실패/미등록 화면이면 guidance 정적 안내 폴백
 * 6. 모든 응답은 chat_log 에 저장
 */
import { Injectable, Logger } from '@nestjs/common'

import { getDefaultLlmProvider } from '../llm/llm.factory'
import type { LlmProvider, LlmRuntime } from '../llm/llm.types'
import { ChatLogService } from '../db/chat-log.service'
import { ChatSettingService } from '../db/chat-setting.service'
import { getPromptStore, type RagChunkData } from '../db/prompt-store.service'
import { findPhraseMapMatch } from '../db/query-phrase-map.repo'
import { ChatOrchestrator } from '../pipeline/chat.orchestrator'
import { loadChatPipelineConfig } from '../pipeline/pipeline.config'
import type { ChatReply, ChatReplyImage, ChatTurn, SuggestedAction } from '../pipeline/pipeline.types'
import { getScreenConfig } from '../pipeline/screen-registry'
import { buildToolContextFromBody } from '../pipeline/tool-context.util'
import { queryEvents } from '../screens/robot/ailog-event.datatools'

type RuntimeEntry = {
  llm: LlmRuntime
  orchestrator: ChatOrchestrator
}

type ChatContext = {
  body: any
  reqId: string
  llm: LlmRuntime
  orchestrator: ChatOrchestrator
  startedAt: number
  author: string
  conversationId: string
  message: string
  currentApp: string
  currentPath: string
  key: string
  history: ChatTurn[]
}

type ScreenSummary = {
  appKey: string
  key: string
  screenName: string
  sortOrder: number
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

const TASKFLOW_EXPLANATION_KEYWORDS = [
  /설명/, /구성/, /구조/, /예시/, /사용법/, /어떻게/, /뭐야/, /무엇/, /알려/, /차이/, /노드/,
]

const TASKFLOW_COMPOSE_REQUEST_KEYWORDS = [
  /만들어\s*줘/i, /구성해\s*줘/i, /생성해\s*줘/i, /추가해\s*줘/i, /캔버스/i, /반영해\s*줘/i,
]

const TASKFLOW_EXPLANATION_IMAGE_MIN_SCORE = 5
const TASKFLOW_EXPLANATION_IMAGE_MIN_SCORE_ALWAYS = 1

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)
  private readonly pipelineCfg = loadChatPipelineConfig()

  private readonly runtimeCache = new Map<string, RuntimeEntry>()

  constructor(
    private readonly chatLog: ChatLogService,
    private readonly chatSetting: ChatSettingService,
  ) { }

  private stageLog(stage: string, status: string, reason: string, reqId?: string) {
    const normalizedReqId = String(reqId ?? '').trim() || '-'
    this.logger.log(`================= [${stage}] [reqId=${normalizedReqId}] status=${status} reason=${reason}`)
  }

  private ensureReqId(body: any): string {
    const fromBody = String(body?.reqId ?? body?.requestId ?? '').trim()
    if (fromBody) {
      body.reqId = fromBody
      return fromBody
    }

    const now = Date.now().toString(36)
    const rand = Math.random().toString(36).slice(2, 8)
    const reqId = `req-${now}-${rand}`
    body.reqId = reqId
    return reqId
  }

  private toDisplayText(value: unknown): string {
    if (typeof value === 'string') return value.trim()
    if (value === null || value === undefined) return ''
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (typeof value === 'object') {
      const row = value as Record<string, unknown>

      const isEventSummaryObject =
        ['totalCount', 'actionCompletedCount', 'analysisCompletedCount', 'analysisFailedCount']
          .some((k) => k in row)

      if (isEventSummaryObject) {
        const n = (k: string) => Number(row[k] ?? 0) || 0
        return [
          `조회 결과 총 ${n('totalCount')}건입니다.`,
          `조치 완료 ${n('actionCompletedCount')}건, 분석 완료 ${n('analysisCompletedCount')}건, 분석 실패 ${n('analysisFailedCount')}건입니다.`,
          `심각도는 critical ${n('severityCriticalCount')}건, high ${n('severityHighCount')}건, middle ${n('severityMiddleCount')}건, low ${n('severityLowCount')}건입니다.`,
        ].join(' ')
      }

      const preferred = [row.text, row.summary, row.message, row.description]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .find(Boolean)
      if (preferred) return preferred
      try {
        return JSON.stringify(value)
      } catch {
        return ''
      }
    }
    return ''
  }

  async handleChat(body: any): Promise<ChatReply> {
    const reqId = this.ensureReqId(body)
    this.stageLog('1단계:요청수신', 'received', '채팅 요청 수신 및 파이프라인 시작', reqId)

    const runtime = await this.resolveRuntime()
    this.stageLog('1-1단계:런타임확보', 'ready', 'LLM/오케스트레이터 런타임 확보 완료', reqId)
    // this.logger.log(`[handleChat] runtime ${JSON.stringify(runtime)}`)
    // validation check
    runtime.llm.assertConfig()
    this.stageLog('1-2단계:런타임검증', 'validated', 'LLM 설정 유효성 검증 완료', reqId)

    const ctx = await this.buildChatContext(body, runtime)
    this.stageLog('2단계:컨텍스트구성', 'built', `routeKey=${ctx.key} 기준 대화 컨텍스트 구성 완료`, reqId)
    // this.logger.log(`[handleChat] ctx ${JSON.stringify(ctx)}`)

    const ruleFirstReply = await this.tryRuleFirstEventQuery(ctx)
    if (ruleFirstReply) {
      this.stageLog('3단계:룰우선처리', 'served', 'phrase-map/휴리스틱 우선 처리로 응답 완료', reqId)
      return this.withSuggestedActions(
        this.withTaskflowExplanationImages(
          this.attachPipelineTrace(
            ruleFirstReply,
            'rule(phrase-map|heuristic)=>tool(query_events)=>응답조립',
          ),
          ctx,
        ),
        ctx,
      )
    }

    this.stageLog('4단계:화면파이프라인', 'running', '등록 화면 파이프라인 처리 시작', reqId)
    const pipelineReply = await this.handleScreenPipeline(ctx)
    if (pipelineReply) {
      const fallbackReply = await this.tryComposeTaskflowFallback(ctx, pipelineReply)
      if (fallbackReply) {
        this.stageLog('4-1단계:화면파이프라인', 'completed', '화면 파이프라인 후 태스크플로우 draft 폴백 반영 완료', reqId)
        return this.withSuggestedActions(
          this.withTaskflowExplanationImages(
            this.attachPipelineTrace(
              fallbackReply,
              'llm(공통 프롬프트+앱별 프롬프트)=>분기(action)=>tool(compose_linear_taskflow)=>응답조립',
            ),
            ctx,
          ),
          ctx,
        )
      }
      this.stageLog('4-1단계:화면파이프라인', 'completed', '화면 파이프라인에서 응답 생성 완료', reqId)
      return this.withSuggestedActions(
        this.withTaskflowExplanationImages(
          this.attachPipelineTrace(
            pipelineReply,
            'llm(공통 프롬프트+앱별 프롬프트)=>분기(action|info)=>응답조립',
          ),
          ctx,
        ),
        ctx,
      )
    }

    // 미등록 화면 또는 pipeline 실패 시 기존 guidance 경로
    this.stageLog('5단계:가이던스폴백', 'fallback', '등록 화면 처리 불가로 기본 안내 경로 진입', reqId)
    const guidanceReply = await this.handleGuidance(ctx)
    this.stageLog('5-1단계:가이던스폴백', 'completed', '기본 안내 응답 생성 완료', reqId)
    return this.withSuggestedActions(
      this.withTaskflowExplanationImages(
        this.attachPipelineTrace(
          guidanceReply,
          'llm(공통 프롬프트+앱별 프롬프트)=>guidance-llm=>응답조립',
        ),
        ctx,
      ),
      ctx,
    )
  }

  private attachPipelineTrace(reply: ChatReply, fallbackTrace: string): ChatReply {
    const existingTrace = String((reply as Record<string, unknown>)?.pipelineTrace ?? '').trim()
    if (existingTrace) {
      return {
        ...reply,
        pipelineTrace: existingTrace,
      }
    }

    const trace = String(fallbackTrace ?? '').trim()
    if (!trace) return reply

    return {
      ...reply,
      pipelineTrace: trace,
    }
  }

  private buildOrchestratorPipelineTrace(meta: unknown): string {
    if (!meta || typeof meta !== 'object') {
      return 'llm(공통 프롬프트+앱별 프롬프트)=>분기(action|info)=>응답조립'
    }

    const row = meta as Record<string, unknown>
    const pipelineIntent = String(row.pipelineIntent ?? '').trim().toLowerCase()

    if (pipelineIntent === 'action') {
      return 'llm(공통 프롬프트+앱별 프롬프트)=>분기(action)=>llm(액션 프롬프트)=>tool/응답조립'
    }

    if (pipelineIntent === 'info') {
      return 'llm(공통 프롬프트+앱별 프롬프트)=>분기(info)=>rag(화면+공통)=>llm(정보 프롬프트)=>응답조립'
    }

    return 'llm(공통 프롬프트+앱별 프롬프트)=>분기(action|info)=>응답조립'
  }

  private normalizeRouteLike(value: string): string {
    return String(value ?? '').trim().replace(/^\/+/, '')
  }

  private inferAppKeyFromRoute(routeKey: string): string {
    const normalized = this.normalizeRouteLike(routeKey)
    return normalized.split('/').filter(Boolean)[0] || ''
  }

  private buildNavigationSuggestions(ctx: ChatContext): SuggestedAction[] {
    const store = getPromptStore()
    const screensRaw = store?.getEnabledScreens() ?? []

    const allScreens: ScreenSummary[] = screensRaw.map((row) => ({
      appKey: String(row.appKey ?? '').trim(),
      key: this.normalizeRouteLike(String(row.key ?? '')),
      screenName: String(row.screenName ?? '').trim(),
      sortOrder: Number(row.sortOrder ?? 0),
    })).filter((row) => row.appKey && row.key && row.screenName)

    if (allScreens.length === 0) {
      return []
    }

    const currentRoute = this.normalizeRouteLike(ctx.key)
    const currentApp = this.normalize(ctx.currentApp) || this.inferAppKeyFromRoute(currentRoute)

    const sameApp = allScreens
      .filter((row) => row.appKey === currentApp && row.key !== currentRoute)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const crossAppPriorityKeys = ['robot/dashboard', 'ota/campaign', 'cms/content', 'tms']
    const crossApp: ScreenSummary[] = []
    for (const key of crossAppPriorityKeys) {
      const hit = allScreens.find((row) => row.key === key && row.key !== currentRoute)
      if (hit) crossApp.push(hit)
    }

    const merged = [...sameApp, ...crossApp]
    const deduped: ScreenSummary[] = []
    const seen = new Set<string>()
    for (const row of merged) {
      if (seen.has(row.key)) continue
      seen.add(row.key)
      deduped.push(row)
      if (deduped.length >= 6) break
    }

    return deduped.map((screen) => ({
      id: `nav-${screen.key}`,
      type: 'navigation',
      label: screen.screenName,
      keyword: `${screen.screenName} 화면으로 이동해줘`,
      chat_action: 'navigation',
      chat_action_param: {
        path: screen.key,
        app: screen.appKey,
      },
    }))
  }

  private withSuggestedActions(reply: ChatReply, ctx: ChatContext): ChatReply {
    if (
      this.isTmsCanvasRoute(ctx.key) &&
      this.looksLikeTaskflowComposeMessage(ctx.message) &&
      !this.hasCanvasDraftParam(reply)
    ) {
      // 구성 요청인데 draft 없는 응답을 suggested_actions로 덮어 실패를 감추지 않도록 한다.
      return reply
    }

    const suggestions = this.buildNavigationSuggestions(ctx)
    if (suggestions.length === 0) return reply

    const nextParam = { ...(reply.chat_action_param ?? {}), suggested_actions: suggestions }
    return {
      ...reply,
      chat_action_param: nextParam,
    }
  }

  private isTmsCanvasRoute(routeKey: string): boolean {
    const normalized = this.normalizeRouteLike(routeKey)
    return /^tms\/taskflows\/[^/]+\/canvas(?:\/|$)/.test(normalized)
  }

  private looksLikeTaskflowComposeMessage(message: string): boolean {
    const text = this.normalize(message)
    if (!text) return false

    const asksCompose = /(구성해줘|구성해\s*줘|만들어줘|만들어\s*줘|태스크\s*플로우|태스크플로우|taskflow)/i.test(text)
    if (!asksCompose) return false

    return /(이동|move|->|→|거쳐|들러|갔다가|에서\s*.+\s*로)/i.test(text)
  }

  private hasCanvasDraftParam(reply: ChatReply | null | undefined): boolean {
    if (!reply?.chat_action_param || typeof reply.chat_action_param !== 'object') return false

    const param = reply.chat_action_param as Record<string, unknown>
    if (param.canvasDraft && typeof param.canvasDraft === 'object') return true

    const toolResult =
      param.toolResult && typeof param.toolResult === 'object'
        ? (param.toolResult as Record<string, unknown>)
        : undefined

    return Boolean(toolResult?.canvasDraft && typeof toolResult.canvasDraft === 'object')
  }

  private looksLikeTaskflowExplanationMessage(message: string, reply: ChatReply): boolean {
    const sourceText = `${this.normalize(message)} ${this.normalize(reply?.text)}`
    if (!sourceText) return false

    const hasExplanationKeyword = TASKFLOW_EXPLANATION_KEYWORDS.some((pattern) => pattern.test(sourceText))
    if (!hasExplanationKeyword) return false

    const looksLikeComposeRequest = TASKFLOW_COMPOSE_REQUEST_KEYWORDS.some((pattern) => pattern.test(this.normalize(message)))
    return !looksLikeComposeRequest
  }

  private scoreTaskflowExplanationChunk(query: string, chunk: RagChunkData): number {
    const normalizedQuery = this.normalize(query).toLowerCase()
    if (!normalizedQuery) return 0

    let score = 0

    for (const keyword of Array.isArray(chunk.keywords) ? chunk.keywords : []) {
      const normalizedKeyword = String(keyword ?? '').trim().toLowerCase()
      if (!normalizedKeyword) continue
      if (normalizedQuery.includes(normalizedKeyword)) {
        score += normalizedKeyword.length >= 4 ? 5 : 3
      }
    }

    const title = String(chunk.title ?? '').trim().toLowerCase()
    if (title && normalizedQuery.includes(title)) score += 4

    const body = String(chunk.body ?? '').trim().toLowerCase()
    if (body) {
      const bodyTerms = body.split(/[^\p{L}\p{N}_]+/u).filter((term) => term.length >= 2)
      for (const term of bodyTerms.slice(0, 32)) {
        if (normalizedQuery.includes(term.toLowerCase())) score += 1
      }
    }

    return score
  }

  private resolveTaskflowExplanationChunk(routeKey: string, message: string, reply: ChatReply): RagChunkData | null {
    const store = getPromptStore()
    const normalizedRouteKey = this.findNearestRegisteredRouteKey(routeKey) ?? this.normalizeRouteLike(routeKey)
    const collection = store?.getCollection(normalizedRouteKey)
    if (!collection) return null

    const query = `${this.normalize(message)} ${this.normalize(reply?.text)}`.trim()
    if (!query) return null

    const candidates = collection.chunks.filter((chunk) => {
      if (!String(chunk?.imageUrl ?? '').trim()) return false
      return String(chunk?.imageAttachMode ?? 'auto').toLowerCase() !== 'never'
    })
    if (candidates.length === 0) return null

    const scored = candidates
      .map((chunk) => ({ chunk, score: this.scoreTaskflowExplanationChunk(query, chunk) }))
      .filter((item) => {
        const mode = String(item.chunk.imageAttachMode ?? 'auto').toLowerCase()
        if (mode === 'always') return item.score >= TASKFLOW_EXPLANATION_IMAGE_MIN_SCORE_ALWAYS
        return item.score >= TASKFLOW_EXPLANATION_IMAGE_MIN_SCORE
      })
      .sort((left, right) => {
        const leftMode = String(left.chunk.imageAttachMode ?? 'auto').toLowerCase()
        const rightMode = String(right.chunk.imageAttachMode ?? 'auto').toLowerCase()
        const leftPriority = leftMode === 'always' ? 0 : 1
        const rightPriority = rightMode === 'always' ? 0 : 1
        if (leftPriority !== rightPriority) return leftPriority - rightPriority
        if (right.score !== left.score) return right.score - left.score

        const leftSortOrder = Number(left.chunk.sortOrder ?? 0)
        const rightSortOrder = Number(right.chunk.sortOrder ?? 0)
        if (leftSortOrder !== rightSortOrder) return leftSortOrder - rightSortOrder

        return String(left.chunk.id ?? '').localeCompare(String(right.chunk.id ?? ''))
      })

    return scored[0]?.chunk ?? null
  }

  private resolveTaskflowExplanationImages(routeKey: string, message: string, reply: ChatReply): ChatReplyImage[] {
    const matched = this.resolveTaskflowExplanationChunk(routeKey, message, reply)
    if (!matched) return []

    const src = String(matched.imageUrl ?? '').trim()
    if (!src) return []

    return [{
      id: `taskflow-node-${matched.id}`,
      src,
      alt: String(matched.title ?? '').trim() || 'taskflow explanation image',
      title: String(matched.title ?? '').trim(),
      caption: String(matched.body ?? '').trim(),
    }]
  }

  private withTaskflowExplanationImages(reply: ChatReply, ctx: ChatContext): ChatReply {
    if (!this.isTmsCanvasRoute(ctx.key)) return reply
    if (this.hasCanvasDraftParam(reply)) return reply
    if (!this.looksLikeTaskflowExplanationMessage(ctx.message, reply)) return reply

    const images = this.resolveTaskflowExplanationImages(ctx.key, ctx.message, reply)
    if (images.length === 0) return reply

    return {
      ...reply,
      images,
    }
  }

  private async tryComposeTaskflowFallback(
    ctx: ChatContext,
    reply: ChatReply,
  ): Promise<ChatReply | null> {
    if (!this.isTmsCanvasRoute(ctx.key)) return null
    if (!this.looksLikeTaskflowComposeMessage(ctx.message)) return null
    if (this.hasCanvasDraftParam(reply)) return null

    const actionParam = reply?.chat_action_param && typeof reply.chat_action_param === 'object'
      ? (reply.chat_action_param as Record<string, unknown>)
      : undefined
    const directClarification = String(actionParam?.clarification ?? '').trim()
    const nestedClarification =
      actionParam?.toolResult && typeof actionParam.toolResult === 'object'
        ? String((actionParam.toolResult as Record<string, unknown>).clarification ?? '').trim()
        : ''
    if (directClarification || nestedClarification) return null

    const screen = getScreenConfig(ctx.key, ctx.reqId)
    const composeTool = screen?.actionTools?.find(
      (tool) => tool?.declaration?.name === 'compose_linear_taskflow',
    )
    if (!composeTool) {
      this.stageLog('4-7단계:태스크플로우폴백', 'skipped', 'compose_linear_taskflow 도구를 찾지 못해 폴백 불가', ctx.reqId)
      return null
    }

    const toolCtx = buildToolContextFromBody({
      body: ctx.body,
      message: ctx.message,
      actionRunnerUrl: this.pipelineCfg.actionRunnerUrl,
      log: {
        log: (m) => this.logger.log(m),
        error: (m) => this.logger.error(m),
      },
    })

    try {
      const result = await composeTool.execute({}, toolCtx)
      if (!result || typeof result !== 'object') {
        this.stageLog('4-7단계:태스크플로우폴백', 'miss', 'compose 도구 응답이 객체 형식이 아님', ctx.reqId)
        return null
      }

      const objectResult = result as Record<string, unknown>
      const canvasDraft = objectResult.canvasDraft
      if (!canvasDraft || typeof canvasDraft !== 'object') {
        this.stageLog('4-7단계:태스크플로우폴백', 'miss', 'compose 도구 응답에 canvasDraft 없음', ctx.reqId)
        return null
      }

      this.stageLog('4-7단계:태스크플로우폴백', 'applied', 'pipeline 응답에 draft가 없어 compose 도구 결과를 강제 반영', ctx.reqId)
      return {
        ...reply,
        chat_action_param: {
          toolName: 'compose_linear_taskflow',
          toolResult: objectResult,
        },
        text: String(objectResult.assistantText ?? '').trim() || '요청을 캔버스에 반영했습니다.',
      }
    } catch (e: any) {
      this.stageLog('4-7단계:태스크플로우폴백', 'error', `compose 도구 실행 실패(${e?.message ?? String(e)})`, ctx.reqId)
      return null
    }
  }

  private async resolveRuntime(): Promise<RuntimeEntry> {
    const provider = (await this.chatSetting.getLlmProvider()) as LlmProvider
    const cached = this.runtimeCache.get(provider)

    if (cached) {
      return cached
    }

    const llm = getDefaultLlmProvider(provider)

    const orchestrator = new ChatOrchestrator(
      llm.client,
      llm.maxOutputTokens,
      this.pipelineCfg,
    )

    const entry = { llm, orchestrator }

    this.runtimeCache.set(provider, entry)

    return entry
  }

  private async buildChatContext(body: any, runtime: RuntimeEntry): Promise<ChatContext> {
    const reqId = this.ensureReqId(body)
    const currentApp = this.normalize(body.currentApp)
    const currentPath = this.normalize(body.currentPath)
    const message = this.normalize(body.message)
    const key = this.resolveRouteKey(body, currentApp, currentPath, reqId)
    const author = this.resolveAuthor(body)
    const conversationId = this.resolveConversationId(body)

    if (!body?.conversationId && conversationId) {
      body.conversationId = conversationId
    }

    if (!body?.key && key) {
      body.key = key
    }

    const history = await this.chatLog.buildHistoryContext({
      author: author || undefined,
      conversationId: conversationId || undefined,
      currentApp,
      hoursBack: 24,
      maxTurns: 200,
    })

    this.logger.log(
      `[chat] [reqId=${reqId}] status=loaded reason=대화 히스토리 컨텍스트 조회 완료`,
    )
    this.logger.debug(
      `[chat] [trace][reqId=${reqId}] author=${author || '-'} conversationId=${conversationId || '-'} currentApp=${currentApp || '-'} turns=${history.length}`,
    )

    return {
      body,
      reqId,
      llm: runtime.llm,
      orchestrator: runtime.orchestrator,
      startedAt: Date.now(),
      author,
      conversationId,
      message,
      currentApp,
      currentPath,
      key,
      history,
    }
  }

  private normalize(value?: string) {
    return String(value ?? '').trim()
  }

  private resolveRouteKey(body: any, currentApp: string, currentPath: string, reqId?: string): string {
    const explicitCandidates = [
      { source: 'key', value: this.normalize(body?.key) },
      { source: 'routeKey', value: this.normalize(body?.routeKey) },
      { source: 'screenRouteKey', value: this.normalize(body?.screenRouteKey) },
    ]

    const explicit = explicitCandidates.find((candidate) => candidate.value)
    if (explicit?.value) {
      this.logger.log(
        `[route-key] [reqId=${String(reqId ?? '-').trim() || '-'}] status=resolved reason=명시적 route 입력값(${explicit.source}) 사용`,
      )
      this.logger.debug(
        `[route-key] [trace][reqId=${String(reqId ?? '-').trim() || '-'}] source=${explicit.source} key=${explicit.value} currentApp=${currentApp || '-'} currentPath=${currentPath || '-'}`,
      )
      return explicit.value
    }

    const app = this.normalize(currentApp)
    const path = this.normalize(currentPath).replace(/^\/+/, '')

    if (app && path) {
      if (path === app || path.startsWith(`${app}/`)) {
        this.logger.log(
          `[route-key] [reqId=${String(reqId ?? '-').trim() || '-'}] status=resolved reason=currentPath가 app prefix 규칙을 만족`,
        )
        this.logger.debug(`[route-key] [trace][reqId=${String(reqId ?? '-').trim() || '-'}] source=currentPath key=${path}`)
        return path
      }
      const normalized = `${app}/${path}`.replace(/\/+/g, '/')
      this.logger.log(
        `[route-key] [reqId=${String(reqId ?? '-').trim() || '-'}] status=resolved reason=currentApp/currentPath 결합 규칙으로 route 생성`,
      )
      this.logger.debug(`[route-key] [trace][reqId=${String(reqId ?? '-').trim() || '-'}] source=currentApp+currentPath key=${normalized}`)
      return normalized
    }

    const fallback = path || app
    this.logger.log(
      `[route-key] [reqId=${String(reqId ?? '-').trim() || '-'}] status=fallback reason=명시적 route 정보가 없어 fallback 규칙 적용`,
    )
    this.logger.debug(`[route-key] [trace][reqId=${String(reqId ?? '-').trim() || '-'}] source=fallback key=${fallback || '-'}`)
    return fallback
  }

  private resolveAuthor(body: any): string {
    return (
      this.normalize(body?.author) ||
      this.normalize(body?.context?.userId) ||
      this.normalize(body?.context?.accountId) ||
      ''
    )
  }

  private resolveConversationId(body: any): string {
    const incoming = this.normalize(body?.conversationId)
    if (incoming) return incoming
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  /**
   * 화면 우선 pipeline 처리.
   *
   * 순서:
   * 1. 등록된 화면인지 확인
   * 2. 화면별 handler 선택
   * 3. 화면 안에서 intent 분류
   * 4. intent별 처리
   */
  private async handleScreenPipeline(ctx: ChatContext): Promise<ChatReply | null> {
    this.stageLog('4-1단계:화면매칭', 'running', `requestedRoute=${ctx.key} 화면 매칭 시작`, ctx.reqId)
    const matchedRouteKey = this.findNearestRegisteredRouteKey(ctx.key, ctx.reqId)

    if (!matchedRouteKey) {
      this.stageLog('4-1단계:화면매칭', 'not-found', '등록된 화면을 찾지 못해 guidance 폴백 예정', ctx.reqId)
      return null
    }

    const routeCtx =
      matchedRouteKey === ctx.key
        ? ctx
        : {
            ...ctx,
            key: matchedRouteKey,
            body: {
              ...ctx.body,
              originalRouteKey: ctx.key,
              routeKey: matchedRouteKey,
              screenRouteKey: matchedRouteKey,
            },
          }

    if (matchedRouteKey !== ctx.key) {
      this.stageLog('4-2단계:라우트보정', 'adjusted', '요청 route가 미등록이라 근접 등록 route로 보정', ctx.reqId)
      this.logger.debug(`[handleScreenPipeline] [trace] original=${ctx.key} matched=${matchedRouteKey}`)
    }

    this.stageLog('4-3단계:화면디스패치', 'dispatched', `route=${routeCtx.key} 화면 핸들러로 분기`, ctx.reqId)
    try {
      if (routeCtx.key === 'robot/ailog/event') {
        return this.handleRobotAilogEventScreen(routeCtx)
      }

      if (routeCtx.key.startsWith('robot/ailog/')) {
        return this.handleRobotAilogChildScreen(routeCtx)
      }

      if (routeCtx.key.startsWith('robot/')) {
        return this.handleRobotGenericScreen(routeCtx)
      }

      return this.handleGenericRegisteredScreen(routeCtx)
    } catch (e: any) {
      this.logger.error(
        `[chat] screen pipeline error route=${routeCtx.key} err=${e?.message ?? String(e)}`,
      )
      this.stageLog('4-3단계:화면디스패치', 'error', '화면 핸들러 처리 중 예외 발생', ctx.reqId)
      return null
    }
  }

  private isRegisteredScreen(routeKey: string, reqId?: string) {
    return Boolean(getScreenConfig(routeKey, reqId))
  }

  private matchRouteTemplate(template: string, actual: string): boolean {
    const tpl = String(template ?? '').trim().replace(/^\/+/, '')
    const act = String(actual ?? '').trim().replace(/^\/+/, '')
    if (!tpl || !act) return false

    const tplSeg = tpl.split('/').filter(Boolean)
    const actSeg = act.split('/').filter(Boolean)
    if (tplSeg.length !== actSeg.length) return false

    for (let i = 0; i < tplSeg.length; i += 1) {
      const t = tplSeg[i]
      const a = actSeg[i]
      if (!t || !a) return false
      if (t.startsWith(':')) continue
      if (t !== a) return false
    }

    return true
  }

  private findParameterizedRegisteredRouteKey(routeKey: string): string | null {
    const normalized = String(routeKey ?? '').trim().replace(/^\/+/, '')
    if (!normalized) return null

    const store = getPromptStore()
    const screens = store?.getEnabledScreens() ?? []

    const matched = screens
      .map((screen) => String(screen.key ?? '').trim())
      .filter((key) => key && key.includes('/:'))
      .filter((key) => this.matchRouteTemplate(key, normalized))
      .sort((a, b) => b.length - a.length)[0]

    return matched || null
  }

  private findNearestRegisteredRouteKey(routeKey: string, reqId?: string): string | null {
    const normalized = String(routeKey ?? '').trim().replace(/^\/+/, '')
    if (!normalized) return null

    if (this.isRegisteredScreen(normalized, reqId)) {
      return normalized
    }

    const parameterized = this.findParameterizedRegisteredRouteKey(normalized)
    if (parameterized && this.isRegisteredScreen(parameterized, reqId)) {
      this.logger.log(
        `[handleScreenPipeline] param route match original=${normalized} matched=${parameterized}`,
      )
      return parameterized
    }

    const segments = normalized.split('/').filter(Boolean)
    for (let i = segments.length - 1; i > 0; i -= 1) {
      const candidate = segments.slice(0, i).join('/')
      if (this.isRegisteredScreen(candidate, reqId)) {
        return candidate
      }
    }

    const heuristicCandidates = this.getHeuristicFallbackCandidates(normalized)
    for (const candidate of heuristicCandidates) {
      if (this.isRegisteredScreen(candidate, reqId)) {
        this.logger.log(
          `[handleScreenPipeline] heuristic route fallback original=${normalized} matched=${candidate}`,
        )
        return candidate
      }
    }

    return null
  }

  private getHeuristicFallbackCandidates(routeKey: string): string[] {
    const normalized = String(routeKey ?? '').trim().replace(/^\/+/, '')
    if (!normalized) return []

    if (normalized.startsWith('robot/ailog/')) {
      return ['robot/ailog/event', 'robot/ailog', 'robot/dashboard']
    }

    if (normalized.startsWith('robot/')) {
      return ['robot/dashboard', 'robot/management']
    }

    if (normalized.startsWith('ota/')) {
      return ['ota']
    }

    if (normalized.startsWith('cms/')) {
      return ['cms']
    }

    if (normalized.startsWith('tms/')) {
      return ['tms']
    }

    return []
  }

  /**
   * robot/ailog/event 전용 처리.
   *
   * 여기서는 화면이 먼저 확정된 상태에서 message intent를 분류한다.
   */
  private async handleRobotAilogEventScreen(ctx: ChatContext): Promise<ChatReply | null> {
    const task = this.classifyRobotAilogEventTask(ctx.message)

    this.logger.log(
      `[handleRobotAilogEventScreen] [reqId=${ctx.reqId}] status=classified reason=robot/ailog/event 전용 task 분류 완료`,
    )
    return this.runOrchestrator(ctx, task)
  }

  private classifyRobotAilogEventTask(message: string): ScreenTask {
    const text = message.toLowerCase()

    if (this.includesAny(text, ['실행', '수행', 'run', '조치해', '처리해'])) {
      return 'run_action'
    }

    if (this.includesAny(text, ['추천', '조치', '액션', 'action', '대응'])) {
      return 'recommend_action'
    }

    if (this.includesAny(text, ['분석', '원인', '왜', '이유', 'analyze'])) {
      return 'analyze'
    }

    if (this.includesAny(text, ['요약', 'summary', '정리'])) {
      return 'summary'
    }

    if (this.includesAny(text, ['조회', '검색', '찾아', '보여', 'list', 'search', '이벤트'])) {
      return 'list'
    }

    if (this.includesAny(text, ['설명', '도움말', '가이드', '방법', 'guide'])) {
      return 'guide'
    }

    return 'unknown'
  }
  private async handleRobotAilogChildScreen(ctx: ChatContext): Promise<ChatReply | null> {
    const intent = this.classifyGenericScreenTask(ctx.message)

    this.logger.log(
      `[chat] [reqId=${ctx.reqId}] status=classified reason=자식 화면의 generic task 분류 완료`,
    )

    return this.runOrchestrator(ctx, intent)
  }

  /**
   * robot 일반 화면 처리.
   *
   * 예:
   * - robot/dashboard
   * - robot/management
   * - robot/groups
   * - robot/users
   */
  private async handleRobotGenericScreen(ctx: ChatContext): Promise<ChatReply | null> {
    const intent = this.classifyGenericScreenTask(ctx.message)

    this.logger.log(
      `[chat] [reqId=${ctx.reqId}] status=classified reason=robot 일반 화면의 generic task 분류 완료`,
    )

    return this.runOrchestrator(ctx, intent)
  }

  /**
   * robot 외 등록 화면 처리.
   * 현재는 ota/cms/tms 세부 화면이 아직 없으므로 generic 처리만 둔다.
   */
  private async handleGenericRegisteredScreen(ctx: ChatContext): Promise<ChatReply | null> {
    const intent = this.classifyGenericScreenTask(ctx.message)

    this.logger.log(
      `[chat] [reqId=${ctx.reqId}] status=classified reason=등록 화면의 generic task 분류 완료`,
    )

    return this.runOrchestrator(ctx, intent)
  }

  private classifyGenericScreenTask(message: string): ScreenTask {
    const text = message.toLowerCase()

    if (this.includesAny(text, ['생성', '추가', '등록', 'create', 'add'])) {
      return 'create'
    }

    if (this.includesAny(text, ['수정', '변경', '업데이트', 'update', 'edit'])) {
      return 'update'
    }

    if (this.includesAny(text, ['삭제', '제거', 'delete', 'remove'])) {
      return 'delete'
    }

    if (this.includesAny(text, ['조회', '검색', '찾아', '보여', 'list', 'search'])) {
      return 'list'
    }

    if (this.includesAny(text, ['분석', '원인', '왜', '이유', 'analyze'])) {
      return 'analyze'
    }

    if (this.includesAny(text, ['요약', 'summary', '정리'])) {
      return 'summary'
    }

    if (this.includesAny(text, ['설정', 'setting', 'config'])) {
      return 'settings'
    }

    if (this.includesAny(text, ['설명', '도움말', '가이드', '방법', 'guide'])) {
      return 'guide'
    }

    return 'unknown'
  }

  private includesAny(text: string, keywords: string[]) {
    return keywords.some((keyword) => text.includes(keyword))
  }

  /**
   * 실제 pipeline/orchestrator 실행.
   *
   * 화면과 intent를 먼저 확정한 다음 orchestrator에 넘긴다.
   * orchestrator 내부에서는 이 screenTask를 기준으로 RAG/data/action 분기하면 된다.
   */
  private async runOrchestrator(
    ctx: ChatContext,
    intent: ScreenTask,
  ): Promise<ChatReply | null> {
    this.stageLog('4-4단계:오케스트레이터실행', 'running', `route=${ctx.key} screenTask=${intent} 실행 시작`, ctx.reqId)
    const pipelineBody = {
      ...ctx.body,
      reqId: ctx.reqId,
      routeKey: ctx.key,
      screenRouteKey: ctx.key,
      screenTask: intent,
      history: ctx.history,
    }
    const out = await ctx.orchestrator.handle(
      ctx.key,
      ctx.message,
      pipelineBody,
    )
    this.stageLog('4-5단계:오케스트레이터결과', 'completed', `handled=${String(out.handled)} hasReply=${String(Boolean(out.reply))}`, ctx.reqId)
    if (out.handled && out.reply) {
      const tracedReply = this.attachPipelineTrace(
        out.reply,
        this.buildOrchestratorPipelineTrace(out.meta),
      )
      await this.saveLog(ctx.body, tracedReply, ctx)
      this.stageLog('4-6단계:응답저장', 'saved', '오케스트레이터 응답을 chat_log에 저장 완료', ctx.reqId)
      return tracedReply
    }

    this.stageLog('4-6단계:응답저장', 'skipped', '오케스트레이터에서 유효 응답이 없어 저장 생략', ctx.reqId)
    return null
  }

  /**
   * 규칙 기반 우선 처리.
   * phrase map 에 매칭되는 robot/ailog/event 조회 문장은 LLM 없이 즉시 처리한다.
   */
  private async tryRuleFirstEventQuery(ctx: ChatContext): Promise<ChatReply | null> {
    const matchedRouteKey = this.findNearestRegisteredRouteKey(ctx.key, ctx.reqId)
    const isAilogRoute =
      matchedRouteKey === 'robot/ailog/event' ||
      matchedRouteKey === 'robot/ailog' ||
      String(ctx.key ?? '').startsWith('robot/ailog')

    if (!isAilogRoute) {
      return null
    }

    const phraseMatch = await findPhraseMapMatch('robot/ailog/event', ctx.message)
    const normalizedMessage = String(ctx.message ?? '').toLowerCase()
    const heuristicQuickQuery =
      /(이슈|이벤트)/.test(normalizedMessage) &&
      /(오늘|어제|일주일|한달|한\s*달|1개월|3개월|3달|\d{1,2}월\s*\d{1,2}일|부터|까지)/.test(normalizedMessage)

    if (!phraseMatch && !heuristicQuickQuery) {
      this.stageLog('3단계:룰우선처리', 'miss', '매칭 규칙이 없어 일반 파이프라인으로 진행', ctx.reqId)
      return null
    }

    if (phraseMatch) {
      this.stageLog(
        '3단계:룰우선처리',
        'matched',
        `phrase-map 매칭 성공(matchType=${phraseMatch.matchType ?? 'exact'})`,
        ctx.reqId,
      )
    } else {
      this.stageLog('3단계:룰우선처리', 'heuristic', '휴리스틱 조건 만족으로 즉시 조회 처리', ctx.reqId)
    }

    const toolCtx = buildToolContextFromBody({
      body: ctx.body,
      message: ctx.message,
      log: {
        log: (m) => this.logger.log(m),
        error: (m) => this.logger.error(m),
      },
    })

    try {
      const result = (await queryEvents.execute({}, toolCtx)) as any
      const filters = result?.resolvedFilters && typeof result.resolvedFilters === 'object'
        ? result.resolvedFilters
        : undefined
      const summary = this.toDisplayText(result?.summary)

      const screen = getScreenConfig('robot/ailog/event', ctx.reqId)
      const reply: ChatReply = {
        chat_action: screen?.chatActions.data ?? 'ailog/event/filter',
        chat_action_param: filters ? { filters } : undefined,
        text: summary || '조회 결과를 확인했습니다.',
      }

      await this.saveLog(ctx.body, reply, ctx)
      this.stageLog('3단계:룰우선처리', 'served', '룰 기반 직접 조회 응답 반환 완료', ctx.reqId)
      return reply
    } catch (e: any) {
      this.logger.warn(
        `[rule-first] direct query failed route=${matchedRouteKey} err=${e?.message ?? String(e)}; fallback to pipeline`,
      )
      this.stageLog('3단계:룰우선처리', 'error', '직접 조회 실패로 일반 파이프라인으로 폴백', ctx.reqId)
      return null
    }
  }

  /** 기존 화면 안내(guidance) 처리. */
  private async handleGuidance(ctx: ChatContext): Promise<ChatReply> {
    const commonSystem = getPromptStore()?.getPromptContent('common', 'system') ?? ''
    const routeKey = ctx.key
    const routeHint =
      getPromptStore()?.getPromptContent(routeKey, 'intent-hint') ??
      getPromptStore()?.getPromptContent(routeKey, 'data-system') ??
      getPromptStore()?.getPromptContent(routeKey, 'action-system') ??
      ''

    const systemPrompt = [commonSystem, routeHint].filter(Boolean).join('\n\n')
    const messages = systemPrompt
      ? [
        { role: 'system' as const, content: systemPrompt },
        ...ctx.history,
        { role: 'user' as const, content: ctx.message },
      ]
      : [...ctx.history, { role: 'user' as const, content: ctx.message }]

    this.logger.log(
      `[chat] [reqId=${ctx.reqId}] status=fallback reason=guidance 경로에서 기본 LLM 호출`,
    )
    this.logger.debug(
      `[chat] [trace][reqId=${ctx.reqId}] commonSystemApplied=${Boolean(commonSystem)} route=${routeKey || '-'} routeHintApplied=${Boolean(routeHint)}`,
    )

    const result = await ctx.llm.client.generateContent({
      messages,
      maxOutputTokens: ctx.llm.maxOutputTokens,
    })

    const text = result?.text?.trim()
    const finalText = text || ''

    if (!text) {
      this.logger.warn(
        `[chat] guidance-empty-text route=${routeKey || '-'} fallbackApplied=false`,
      )
    }

    const reply: ChatReply = {
      chat_action: routeKey || 'default',
      text: finalText,
    }

    await this.saveLog(ctx.body, reply, ctx)

    return reply
  }

  private async saveLog(body: any, reply: ChatReply, ctx?: ChatContext) {
    const author = ctx?.author || this.resolveAuthor(body)
    const conversationId =
      ctx?.conversationId ||
      this.resolveConversationId(body)

    await this.chatLog.save({
      author: author || undefined,
      conversationId: conversationId || undefined,
      currentApp: this.normalize(body.currentApp) || undefined,
      currentPath: this.normalize(body.currentPath) || undefined,
      chatAction: reply.chat_action,
      userMessage: this.normalize(body.message) || undefined,
      assistantText: reply.text,
    })
  }
}