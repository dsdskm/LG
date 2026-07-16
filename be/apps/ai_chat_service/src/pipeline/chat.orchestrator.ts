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

  private async generateDefaultLlmReply(
    screen: ScreenConfig,
    message: string,
    history: ChatTurn[],
    reason: string,
  ): Promise<string | undefined> {
    const baseSystemPrompt =
      screen.dataSystemPrompt ||
      screen.actionSystemPrompt ||
      [
        `너는 "${screen.screenName}" 화면의 도우미다.`,
        '사용자 질문에 대해 가능한 범위에서 정확하고 간결하게 답한다.',
      ].join('\n')

    const systemPrompt = [
      baseSystemPrompt,
      '도구 실행 또는 문서 근거가 부족하더라도, 추측하지 말고 가능한 범위에서 기본 LLM 응답을 생성한다.',
    ].join('\n\n')

    this.logger.warn(
      `[prompt-apply] route=${screen.key} default-llm-fallback reason=${reason} systemPromptLen=${systemPrompt.length}`,
    )

    const res = await this.client.generateContent({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: message },
      ],
      maxOutputTokens: this.maxOutputTokens,
    })

    const text = (res?.text ?? '').trim()
    return text || undefined
  }

  private decideFallbackIntent(message: string, canRunAction: boolean): ChatIntent {
    const text = String(message ?? '').toLowerCase()
    const actionKeywords = ['실행', '수행', '처리', '조치', '액션', '이동', '열어', 'navigate', 'action', 'run']
    const actionRequested = actionKeywords.some((keyword) => text.includes(keyword))

    if (canRunAction && actionRequested) {
      return 'action'
    }

    return 'info'
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
    const screen = getScreenConfig(routeKey)
    this.logger.log(`[handle] screen=${screen}`)
    if (!screen) {
      return { handled: false }
    }

    const history = normalizeHistory(body?.history)
    const screenTask = this.normalizeScreenTask(body?.screenTask)
    this.logger.log(`[handle] screenTask=${screenTask}`)
    const previousFilters =
      body?.previousFilters && typeof body.previousFilters === 'object'
        ? (body.previousFilters as Record<string, unknown>)
        : undefined
    this.logger.log(`[handle] previousFilters=${previousFilters}`)
    const pipelineIntentResult = await this.classifier.classify(
      message,
      screen.screenName,
      screen.intentHints,
      history,
    )
    this.logger.log(`[handle] pipelineIntentResult=${pipelineIntentResult}`)

    let pipelineIntent: ChatIntent = pipelineIntentResult.intent
    let ragCollections = this.uniqueCollections([screen.ragCollection, COMMON_COLLECTION])
    this.logger.log(`[handle] pipelineIntent=${pipelineIntent}`)
    // 의도 분석 실패(저신뢰도) 시 common action 또는 common RAG로 우선 복구한다.
    if (pipelineIntentResult.confidence < this.pipeline.intentMinConfidence) {
      pipelineIntent = this.decideFallbackIntent(message, screen.actionTools.length > 0)
      ragCollections = this.uniqueCollections([COMMON_COLLECTION, screen.ragCollection])
    }

    // 해당 tool이 없는 화면이면 RAG(info)로 처리한다.
    if (pipelineIntent === 'data' && screen.dataTools.length === 0) {
      pipelineIntent = 'info'
    }

    if (pipelineIntent === 'action' && screen.actionTools.length === 0) {
      pipelineIntent = 'info'
    }

    this.logger.log(
      [
        `[handle] route=${routeKey}`,
        `screenTask=${screenTask}`,
        `pipelineIntent=${pipelineIntent}`,
        `conf=${pipelineIntentResult.confidence}`,
        `reason=${pipelineIntentResult.reason}`,
      ].join(' '),
    )

    const toolCtx = this.buildToolCtx(body)

    switch (pipelineIntent) {
      case 'data':
        return this.handleData(
          screen,
          message,
          toolCtx,
          pipelineIntentResult,
          history,
          screenTask,
          previousFilters,
          ragCollections,
        )

      case 'action':
        return this.handleAction(
          screen,
          message,
          toolCtx,
          pipelineIntentResult,
          history,
          screenTask,
          ragCollections,
        )

      case 'info':
      default:
        return this.handleInfo(
          screen,
          message,
          pipelineIntentResult,
          history,
          screenTask,
          ragCollections,
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

  private buildToolCtx(body: any): ToolContext {
    return {
      accessToken: body?.accessToken,
      apiBaseUrl: body?.apiBaseUrl,
      eventAnalyzerUrl: body?.eventAnalyzerUrl,
      configManagerUrl: body?.configManagerUrl,
      actionRunnerUrl: this.pipeline.actionRunnerUrl,
      context: body?.context,
      log: {
        log: (m) => this.logger.log(m),
        error: (m) => this.logger.error(m),
      },
    }
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

  private async handleInfo(
    screen: ScreenConfig,
    message: string,
    pipelineIntentResult: unknown,
    history: ChatTurn[],
    screenTask: ScreenTask,
    ragCollections: string[],
  ): Promise<OrchestrationOutput> {
    this.logger.log(
      `[prompt-apply] route=${screen.key} intent=info ragCollections=${ragCollections.join(',')}`,
    )

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
        ? await this.generateDefaultLlmReply(screen, message, history, usedChunks.length === 0 ? 'no-rag-hit' : 'rag-empty-text')
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

    this.logger.log(
      `[prompt-apply] route=${screen.key} intent=data dataSystemPromptLen=${screen.dataSystemPrompt.length} finalSystemPromptLen=${systemPrompt.length}`,
    )

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
      ? await this.generateDefaultLlmReply(screen, message, history, noExecution ? 'data-no-execution-and-no-rag-hit' : 'data-empty-text')
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
  ): Promise<OrchestrationOutput> {
    this.logger.log(
      `[prompt-apply] route=${screen.key} intent=action actionSystemPromptLen=${screen.actionSystemPrompt.length}`,
    )

    const { text, executed } = await this.agent.run(
      screen.actionSystemPrompt,
      message,
      screen.actionTools,
      toolCtx,
      history,
    )

    const noExecution = executed.length === 0 || executed.every((call) => Boolean(call.error))
    const inferredNavigation = noExecution
      ? this.inferNavigationFromScreenName(message, screen.appKey)
      : undefined

    if (inferredNavigation) {
      this.logger.log(
        `[prompt-apply] route=${screen.key} inferred-navigation path=${inferredNavigation.path} screenName=${inferredNavigation.screenName ?? ''}`,
      )
    }

    const ragFallback = noExecution
      ? inferredNavigation
        ? { text: undefined, usedCollection: undefined, usedChunks: [] }
        : await this.tryRagFallback(ragCollections ?? [COMMON_COLLECTION, screen.ragCollection], message, history)
      : { text: undefined, usedCollection: undefined, usedChunks: [] }
    const defaultLlmText = (noExecution || !text?.trim())
      ? inferredNavigation
        ? undefined
        : await this.generateDefaultLlmReply(screen, message, history, noExecution ? 'action-no-execution-and-no-rag-hit' : 'action-empty-text')
      : undefined
    const finalText =
      text?.trim() ||
      (inferredNavigation ? `${inferredNavigation.screenName ?? inferredNavigation.path} 화면으로 이동하겠습니다.` : '') ||
      ragFallback.text ||
      defaultLlmText ||
      ''

    const ran = executed.find((c) => c.name === 'run_action')
    const navigation = this.findNavigationResult(executed) ?? inferredNavigation
    const navigationText = navigation ? `${navigation.path} 화면으로 이동하겠습니다.` : undefined

    return {
      handled: true,
      reply: {
        chat_action: navigation ? 'navigation' : screen.chatActions.action,
        chat_action_param: navigation
          ? { path: navigation.path, app: navigation.app }
          : ran
            ? { executed: ran.result }
            : undefined,
        text: finalText || navigationText || '요청을 처리했습니다.',
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