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
import { getPromptStore } from '../db/prompt-store.service'
import { findPhraseMapMatch } from '../db/query-phrase-map.repo'
import { ChatOrchestrator } from '../pipeline/chat.orchestrator'
import { loadChatPipelineConfig } from '../pipeline/pipeline.config'
import type { ChatReply, ChatTurn, SuggestedAction } from '../pipeline/pipeline.types'
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

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)
  private readonly pipelineCfg = loadChatPipelineConfig()

  private readonly runtimeCache = new Map<string, RuntimeEntry>()

  constructor(
    private readonly chatLog: ChatLogService,
    private readonly chatSetting: ChatSettingService,
  ) { }

  private stageLog(stage: string, detail?: string, reqId?: string) {
    const suffix = detail ? ` ${detail}` : ''
    const normalizedReqId = String(reqId ?? '').trim() || '-'
    this.logger.log(`================= [0단계:요청처리_진행상태] [reqId=${normalizedReqId}] ${stage}${suffix}`)
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
    this.stageLog('handleChat:start', `currentApp=${this.normalize(body?.currentApp) || '-'} currentPath=${this.normalize(body?.currentPath) || '-'} key=${this.normalize(body?.key) || '-'} message=${this.normalize(body?.message) || '-'}`, reqId)

    const runtime = await this.resolveRuntime()
    this.stageLog('handleChat:runtime-resolved', undefined, reqId)
    // this.logger.log(`[handleChat] runtime ${JSON.stringify(runtime)}`)
    // validation check
    runtime.llm.assertConfig()
    this.stageLog('handleChat:runtime-validated', undefined, reqId)

    const ctx = await this.buildChatContext(body, runtime)
    this.stageLog('handleChat:context-built', `routeKey=${ctx.key} historyTurns=${ctx.history.length}`, reqId)
    // this.logger.log(`[handleChat] ctx ${JSON.stringify(ctx)}`)

    const ruleFirstReply = await this.tryRuleFirstEventQuery(ctx)
    if (ruleFirstReply) {
      this.stageLog('handleChat:rule-first-handled', `chatAction=${ruleFirstReply.chat_action}`, reqId)
      return this.withSuggestedActions(ruleFirstReply, ctx)
    }

    this.stageLog('handleChat:pipeline-begin', undefined, reqId)
    const pipelineReply = await this.handleScreenPipeline(ctx)
    this.logger.log(`[handleChat] pipelineReply ${pipelineReply}`)
    if (pipelineReply) {
      this.stageLog('handleChat:pipeline-handled', `chatAction=${pipelineReply.chat_action}`, reqId)
      return this.withSuggestedActions(pipelineReply, ctx)
    }

    // 미등록 화면 또는 pipeline 실패 시 기존 guidance 경로
    this.stageLog('handleChat:guidance-fallback-begin', undefined, reqId)
    const guidanceReply = await this.handleGuidance(ctx)
    this.stageLog('handleChat:guidance-fallback-done', `chatAction=${guidanceReply.chat_action}`, reqId)
    return this.withSuggestedActions(guidanceReply, ctx)
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
    const suggestions = this.buildNavigationSuggestions(ctx)
    if (suggestions.length === 0) return reply

    const nextParam = { ...(reply.chat_action_param ?? {}), suggested_actions: suggestions }
    return {
      ...reply,
      chat_action_param: nextParam,
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
      `[chat] [reqId=${reqId}] history-context author=${author || '-'} conversationId=${conversationId || '-'} currentApp=${currentApp || '-'} turns=${history.length}`,
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
        `[route-key] [reqId=${String(reqId ?? '-').trim() || '-'}] source=${explicit.source} key=${explicit.value} rawKey=${this.normalize(body?.key) || '-'} rawRouteKey=${this.normalize(body?.routeKey) || '-'} rawScreenRouteKey=${this.normalize(body?.screenRouteKey) || '-'} currentApp=${currentApp || '-'} currentPath=${currentPath || '-'}`,
      )
      return explicit.value
    }

    const app = this.normalize(currentApp)
    const path = this.normalize(currentPath).replace(/^\/+/, '')

    if (app && path) {
      if (path === app || path.startsWith(`${app}/`)) {
        this.logger.log(
          `[route-key] [reqId=${String(reqId ?? '-').trim() || '-'}] source=currentPath key=${path} rawKey=${this.normalize(body?.key) || '-'} rawRouteKey=${this.normalize(body?.routeKey) || '-'} rawScreenRouteKey=${this.normalize(body?.screenRouteKey) || '-'} currentApp=${app} currentPath=${path}`,
        )
        return path
      }
      const normalized = `${app}/${path}`.replace(/\/+/g, '/')
      this.logger.log(
        `[route-key] [reqId=${String(reqId ?? '-').trim() || '-'}] source=currentApp+currentPath key=${normalized} rawKey=${this.normalize(body?.key) || '-'} rawRouteKey=${this.normalize(body?.routeKey) || '-'} rawScreenRouteKey=${this.normalize(body?.screenRouteKey) || '-'} currentApp=${app} currentPath=${path}`,
      )
      return normalized
    }

    const fallback = path || app
    this.logger.log(
      `[route-key] [reqId=${String(reqId ?? '-').trim() || '-'}] source=fallback key=${fallback || '-'} rawKey=${this.normalize(body?.key) || '-'} rawRouteKey=${this.normalize(body?.routeKey) || '-'} rawScreenRouteKey=${this.normalize(body?.screenRouteKey) || '-'} currentApp=${app || '-'} currentPath=${path || '-'}`,
    )
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
    this.stageLog('screen-pipeline:start', `requestedRoute=${ctx.key}`, ctx.reqId)
    const matchedRouteKey = this.findNearestRegisteredRouteKey(ctx.key, ctx.reqId)

    if (!matchedRouteKey) {
      this.logger.log(`[handleScreenPipeline] unregistered screen route=${ctx.key}`)
      this.stageLog('screen-pipeline:unregistered', `requestedRoute=${ctx.key}`, ctx.reqId)
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
      this.logger.log(
        `[handleScreenPipeline] route fallback original=${ctx.key} matched=${matchedRouteKey}`,
      )
      this.stageLog('screen-pipeline:route-fallback', `original=${ctx.key} matched=${matchedRouteKey}`, ctx.reqId)
    }

    this.logger.log(`[handleScreenPipeline] key=${routeCtx.key}`)
    this.stageLog('screen-pipeline:dispatch', `route=${routeCtx.key}`, ctx.reqId)
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
      this.stageLog('screen-pipeline:error', `route=${routeCtx.key} err=${e?.message ?? String(e)}`, ctx.reqId)
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
      `[handleRobotAilogEventScreen] screen=robot/ailog/event task=${task} message=${ctx.message}`,
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
      `[chat] screen=${ctx.key} intent=${intent} message=${ctx.message}`,
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
      `[chat] screen=${ctx.key} intent=${intent} message=${ctx.message}`,
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
      `[chat] screen=${ctx.key} intent=${intent} message=${ctx.message}`,
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
    this.stageLog('orchestrator:start', `route=${ctx.key} screenTask=${intent} message=${ctx.message}`, ctx.reqId)
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
    this.logger.log(`[runOrchestrator] out ${JSON.stringify(out)}`)
    this.stageLog('orchestrator:result', `handled=${String(out.handled)} hasReply=${String(Boolean(out.reply))}`, ctx.reqId)
    if (out.handled && out.reply) {
      await this.saveLog(ctx.body, out.reply, ctx)
      this.stageLog('orchestrator:reply-saved', `chatAction=${out.reply.chat_action}`, ctx.reqId)
      return out.reply
    }

    this.stageLog('orchestrator:no-reply', undefined, ctx.reqId)
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
      this.stageLog('rule-first:miss', `route=${matchedRouteKey || ctx.key} message=${ctx.message}`, ctx.reqId)
      return null
    }

    if (phraseMatch) {
      this.stageLog(
        'rule-first:match',
        `route=${matchedRouteKey || ctx.key} matchType=${phraseMatch.matchType ?? 'exact'} intent=${phraseMatch.intentKey}`,
        ctx.reqId,
      )
    } else {
      this.stageLog('rule-first:heuristic', `route=${matchedRouteKey || ctx.key} message=${ctx.message}`, ctx.reqId)
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
      this.stageLog('rule-first:served', `route=${matchedRouteKey} chatAction=${reply.chat_action}`, ctx.reqId)
      return reply
    } catch (e: any) {
      this.logger.warn(
        `[rule-first] direct query failed route=${matchedRouteKey} err=${e?.message ?? String(e)}; fallback to pipeline`,
      )
      this.stageLog('rule-first:error', `route=${matchedRouteKey} err=${e?.message ?? String(e)}`, ctx.reqId)
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
      `[chat] default-llm-api-called commonSystemApplied=${Boolean(commonSystem)} route=${routeKey || '-'} routeHintApplied=${Boolean(routeHint)}`,
    )
    this.logger.log(`[chat] default-llm commonSystemText=${JSON.stringify(commonSystem)}`)

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