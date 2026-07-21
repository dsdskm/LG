/**
 * 탭 챗봇 오케스트레이터.
 *
 * 화면(routeKey)에 등록된 ScreenConfig 기준으로 pipeline intent를 분류하고,
 * info(RAG) / data(조회 tool) / action(실행 tool) 핸들러로 분기한다.
 *
 * 주의:
 * - screenTask: ChatService에서 화면별로 먼저 분류한 사용자 작업 단위
 *   예) list, analyze, recommend_action, run_action, create, update
 *
 * - pipelineIntent: Orchestrator 내부에서 처리 경로를 정하기 위한 분기 단위
 *   예) info, data, action
 */

import { Logger } from '@nestjs/common'

import type { LlmClient } from '../llm/llm.types'
import type { ToolContext } from './tool.type'
import { IntentClassifier } from './intent.classifier'
import { RagService } from './rag/rag.service'
import { ToolAgent, type ExecutedCall } from './agent/tool-agent'
import { getScreenConfig, type ScreenConfig } from './screen-registry'
import { COMMON_COLLECTION } from './rag/rag.docs'
import type { ChatIntent, ChatReply, ChatTurn } from './pipeline.types'
import type { ChatPipelineConfig } from './pipeline.config'
import { getPromptStore } from '../db/prompt-store.service'
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

export class ChatOrchestrator {
  /**
   * pipeline intent 분류기.
   *
   * 여기서 말하는 intent는 화면별 세부 작업이 아니라,
   * 최종 처리 경로인 info/data/action을 의미한다.
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
      `================= [5단계:기본LLM_폴백] [reqId=${reqId}] route=${screen.key} reason=${reason} systemPromptLen=${systemPrompt.length}`,
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

  private decideFallbackIntent(message: string, canRunAction: boolean, screenTask?: ScreenTask): ChatIntent {
    const text = String(message ?? '').toLowerCase()
    const actionKeywords = [
      '실행', '수행', '처리', '조치', '액션', '이동', '열어', 'navigate', 'action', 'run',
      '추가', '생성', '수정', '변경', '삭제', '제거', '편집', '노드', '태스크플로우', 'taskflow',
      '저장', '임시저장', '정렬', '가로모드', '세로모드', '컨트롤', 'control', '예시',
      'or', 'parallel', 'ifthenelse', 'ifthen', 'repeat', '병렬', '반복',
    ]
    const actionRequested = actionKeywords.some((keyword) => text.includes(keyword))

    const actionScreenTask = new Set<ScreenTask>(['create', 'update', 'delete', 'run_action', 'recommend_action'])
    if (canRunAction && screenTask && actionScreenTask.has(screenTask)) {
      return 'action'
    }

    if (canRunAction && actionRequested) {
      return 'action'
    }

    return 'info'
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
      `original=${raw} effective=${merged}`,
    )
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

  private async tryRagFallback(
    collections: string[],
    message: string,
    history: ChatTurn[],
  ): Promise<{ text?: string; usedCollection?: string; usedChunks: string[] }> {
    const ordered = this.uniqueCollections(collections)
    if (ordered.length === 0) {
      return { text: undefined, usedCollection: undefined, usedChunks: [] }
    }

    const result = await this.rag.answer(ordered, message, history)
    const text = (result.text ?? '').trim()

    if (result.usedChunks.length === 0 || !text) {
      return { text: undefined, usedCollection: undefined, usedChunks: [] }
    }

    return {
      text,
      usedCollection: result.usedCollection,
      usedChunks: result.usedChunks,
    }
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
      `route=${routeKey} screenFound=${Boolean(screen)} screen=${screen ? JSON.stringify({ key: screen.key, appKey: screen.appKey, screenName: screen.screenName, dataTools: screen.dataTools.length, actionTools: screen.actionTools.length, ragCollection: screen.ragCollection }) : '-'}`,
    )
    if (!screen) {
      return { handled: false }
    }

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
    this.stageLog('2-1단계:화면작업_입력', reqId, `screenTask=${screenTask}`)
    const previousFilters =
      body?.previousFilters && typeof body.previousFilters === 'object'
        ? (body.previousFilters as Record<string, unknown>)
        : undefined
    this.stageLog('2-2단계:이전필터_입력', reqId, `hasPreviousFilters=${Boolean(previousFilters)}`)
    const pipelineIntentResult = await this.classifier.classify(
      effectiveMessage,
      screen.screenName,
      screen.intentHints,
      history,
    )
    this.stageLog('2-3단계:의도분류_원결과', reqId, `result=${JSON.stringify(pipelineIntentResult)}`)

    let pipelineIntent: ChatIntent = pipelineIntentResult.intent
    let ragCollections = this.uniqueCollections([screen.ragCollection, screen.appKey, COMMON_COLLECTION])
    this.stageLog('2-4단계:의도분류_초안', reqId, `intent=${pipelineIntent}`)
    // 의도 분석 실패(저신뢰도) 시 common action 또는 common RAG로 우선 복구한다.
    if (pipelineIntentResult.confidence < this.pipeline.intentMinConfidence) {
      pipelineIntent = this.decideFallbackIntent(effectiveMessage, screen.actionTools.length > 0, screenTask)
      ragCollections = this.uniqueCollections([COMMON_COLLECTION, screen.ragCollection, screen.appKey])
      this.stageLog(
        '2-5단계:저신뢰도_보정',
        reqId,
        `conf=${pipelineIntentResult.confidence} minConf=${this.pipeline.intentMinConfidence} fallbackIntent=${pipelineIntent}`,
      )
    }

    // 해당 tool이 없는 화면이면 RAG(info)로 처리한다.
    if (pipelineIntent === 'data' && screen.dataTools.length === 0) {
      pipelineIntent = 'info'
    }

    if (pipelineIntent === 'action' && screen.actionTools.length === 0) {
      pipelineIntent = 'info'
    }

    this.stageLog(
      '2-6단계:최종의도_확정',
      reqId,
      [
        `route=${routeKey}`,
        `screenTask=${screenTask}`,
        `pipelineIntent=${pipelineIntent}`,
        `conf=${pipelineIntentResult.confidence}`,
        `reason=${pipelineIntentResult.reason}`,
        `ragCollections=${ragCollections.join(',')}`,
      ].join(' '),
    )

    const toolCtx = this.buildToolCtx(body, effectiveMessage)

    switch (pipelineIntent) {
      case 'data':
        return this.handleData(
          screen,
          effectiveMessage,
          toolCtx,
          pipelineIntentResult,
          history,
          screenTask,
          previousFilters,
          ragCollections,
          reqId,
        )

      case 'action':
        return this.handleAction(
          screen,
          effectiveMessage,
          toolCtx,
          pipelineIntentResult,
          history,
          screenTask,
          ragCollections,
          reqId,
        )

      case 'info':
      default:
        return this.handleInfo(
          screen,
          effectiveMessage,
          pipelineIntentResult,
          history,
          screenTask,
          ragCollections,
          reqId,
        )
    }
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

    return /(태스크플로우|taskflow|노드|이후에|추가|삭제|지워|제거|에서\s+.+\s+로\s*(이동|가|가는)?|수정|바꿔|저장|임시\s*저장|정렬|가로|세로|컨트롤|control|or\s*노드|parallel|ifthenelse|ifthen|repeat|병렬|반복|예시)/i.test(text)
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
      if (!objectResult.canvasDraft || typeof objectResult.canvasDraft !== 'object') return undefined

      this.logger.log(`[prompt-apply] route=${screen.key} deterministic-taskflow-draft-applied=true`)
      return {
        toolName: 'compose_linear_taskflow',
        toolResult: objectResult,
      }
    } catch (e: any) {
      this.logger.warn(
        `[prompt-apply] route=${screen.key} deterministic-taskflow-draft-failed err=${e?.message ?? String(e)}`,
      )
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
    this.stageLog('3단계:INFO처리_RAG조회', reqId, `route=${screen.key} ragCollections=${ragCollections.join(',')}`)

    // response chain:
    // 1. app/common RAG collection
    // 2. default LLM
    const { text, usedCollection, usedChunks } = await this.rag.answer(
      ragCollections,
      message,
      history,
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

  private async handleData(
    screen: ScreenConfig,
    message: string,
    toolCtx: ToolContext,
    pipelineIntentResult: unknown,
    history: ChatTurn[],
    screenTask: ScreenTask,
    previousFilters?: Record<string, unknown>,
    ragCollections?: string[],
    reqId = '-',
  ): Promise<OrchestrationOutput> {
    // 직전 필터를 시스템 프롬프트에 실어,
    // 후속 발화가 이를 이어받아 병합하도록 한다.
    const systemPrompt = previousFilters
      ? [
        screen.dataSystemPrompt,
        `직전에 적용된 필터(JSON): ${JSON.stringify(previousFilters)}`,
        '사용자가 조건 추가/좁히기/변경을 요청하면 위 필터를 기준으로 병합하되, 유지할 값도 tool 인자로 다시 명시한다. 완전히 새로운 조회면 무시한다.',
      ].join('\n')
      : screen.dataSystemPrompt

    this.stageLog('3단계:DATA처리_툴실행', reqId, `route=${screen.key} dataSystemPromptLen=${screen.dataSystemPrompt.length} finalSystemPromptLen=${systemPrompt.length}`)

    const { text, executed } = await this.agent.run(
      systemPrompt,
      message,
      screen.dataTools,
      toolCtx,
      history,
    )

    const noExecution = executed.length === 0 || executed.every((call) => Boolean(call.error))
    const ragFallback = noExecution
      ? await this.tryRagFallback(ragCollections ?? [COMMON_COLLECTION, screen.ragCollection], message, history)
      : { text: undefined, usedCollection: undefined, usedChunks: [] }
    const defaultLlmText = (noExecution || !text?.trim())
      ? await this.generateDefaultLlmReply(screen, message, history, noExecution ? 'data-no-execution-and-no-rag-hit' : 'data-empty-text', reqId)
      : undefined
    const finalText = text?.trim() || ragFallback.text || defaultLlmText || ''

    const resolvedFilters = pickResolvedFilters(executed)

    return {
      handled: true,
      reply: {
        chat_action: screen.chatActions.data,
        chat_action_param: resolvedFilters ? { filters: resolvedFilters } : undefined,
        text: finalText,
      },
      meta: {
        screenTask,
        pipelineIntent: 'data',
        pipelineIntentResult,
        executed: summarizeCalls(executed),
        ragFallbackUsed: Boolean(ragFallback.text),
        ragFallbackCollection: ragFallback.usedCollection,
        ragFallbackChunks: ragFallback.usedChunks,
        defaultLlmFallback: Boolean(defaultLlmText),
      },
    }
  }

  private async handleAction(
    screen: ScreenConfig,
    message: string,
    toolCtx: ToolContext,
    pipelineIntentResult: unknown,
    history: ChatTurn[],
    screenTask: ScreenTask,
    ragCollections?: string[],
    reqId = '-',
  ): Promise<OrchestrationOutput> {
    this.stageLog('3단계:ACTION처리_툴실행', reqId, `route=${screen.key} actionSystemPromptLen=${screen.actionSystemPrompt.length}`)

    const { text, executed } = await this.agent.run(
      screen.actionSystemPrompt,
      message,
      screen.actionTools,
      toolCtx,
      history,
    )

    const noExecution = executed.length === 0 || executed.every((call) => Boolean(call.error))
    const deterministicTaskflowParam = noExecution
      ? await this.tryDeterministicTaskflowDraft(screen, message, toolCtx)
      : undefined
    const deterministicApplied = Boolean(deterministicTaskflowParam)
    const inferredNavigation = noExecution
      ? this.inferNavigationFromScreenName(message, screen.appKey)
      : undefined

    if (inferredNavigation) {
      this.stageLog('4단계:네비게이션_추론', reqId, `route=${screen.key} path=${inferredNavigation.path} screenName=${inferredNavigation.screenName ?? ''}`)
    }

    const ragFallback = noExecution && !deterministicApplied
      ? inferredNavigation
        ? { text: undefined, usedCollection: undefined, usedChunks: [] }
        : await this.tryRagFallback(ragCollections ?? [COMMON_COLLECTION, screen.ragCollection], message, history)
      : { text: undefined, usedCollection: undefined, usedChunks: [] }
    const defaultLlmText = (noExecution || !text?.trim()) && !deterministicApplied
      ? inferredNavigation
        ? undefined
        : await this.generateDefaultLlmReply(screen, message, history, noExecution ? 'action-no-execution-and-no-rag-hit' : 'action-empty-text', reqId)
      : undefined
    const finalText =
      text?.trim() ||
      (deterministicApplied ? '요청을 캔버스에 반영했습니다.' : '') ||
      (inferredNavigation ? `${inferredNavigation.screenName ?? inferredNavigation.path} 화면으로 이동하겠습니다.` : '') ||
      ragFallback.text ||
      defaultLlmText ||
      ''

    const ran = executed.find((c) => c.name === 'run_action')
    const navigation = this.findNavigationResult(executed) ?? inferredNavigation
    const navigationText = navigation ? `${navigation.path} 화면으로 이동하겠습니다.` : undefined
    const actionParam = deterministicTaskflowParam ?? this.buildActionParam(executed, ran)
    const clarificationText = this.extractActionClarification(actionParam)
    const assistantToolText = this.extractActionAssistantText(actionParam)
    const actionText = clarificationText || assistantToolText || text?.trim()

    if (clarificationText) {
      this.stageLog('3-1단계:ACTION_사용자추가입력요청', reqId, `route=${screen.key} clarification=${clarificationText}`)
    }

    return {
      handled: true,
      reply: {
        chat_action: navigation ? 'navigation' : screen.chatActions.action,
        chat_action_param: navigation
          ? { path: navigation.path, app: navigation.app }
          : actionParam,
        text: actionText || finalText || navigationText || '요청을 처리했습니다.',
      },
      meta: {
        screenTask,
        pipelineIntent: 'action',
        pipelineIntentResult,
        executed: summarizeCalls(executed),
        ragFallbackUsed: Boolean(ragFallback.text),
        ragFallbackCollection: ragFallback.usedCollection,
        ragFallbackChunks: ragFallback.usedChunks,
        defaultLlmFallback: Boolean(defaultLlmText),
      },
    }
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