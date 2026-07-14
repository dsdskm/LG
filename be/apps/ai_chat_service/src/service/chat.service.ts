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
import { ChatOrchestrator } from '../pipeline/chat.orchestrator'
import { loadChatPipelineConfig } from '../pipeline/pipeline.config'
import type { ChatReply, ChatTurn } from '../pipeline/pipeline.types'
import { getScreenConfig } from '../pipeline/screen-registry'

type RuntimeEntry = {
  llm: LlmRuntime
  orchestrator: ChatOrchestrator
}

type ChatContext = {
  body: any
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

  async handleChat(body: any): Promise<ChatReply> {
    const runtime = await this.resolveRuntime()
    // this.logger.log(`[handleChat] runtime ${JSON.stringify(runtime)}`)
    // validation check
    runtime.llm.assertConfig()

    const ctx = await this.buildChatContext(body, runtime)
    // this.logger.log(`[handleChat] ctx ${JSON.stringify(ctx)}`)
    const pipelineReply = await this.handleScreenPipeline(ctx)
    this.logger.log(`[handleChat] pipelineReply ${pipelineReply}`)
    if (pipelineReply) {
      return pipelineReply
    }

    // 미등록 화면 또는 pipeline 실패 시 기존 guidance 경로
    return this.handleGuidance(ctx)
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
    const currentApp = this.normalize(body.currentApp)
    const currentPath = this.normalize(body.currentPath)
    const message = this.normalize(body.message)
    const key = this.normalize(body.key)
    const author = this.resolveAuthor(body)
    const conversationId = this.resolveConversationId(body)

    if (!body?.conversationId && conversationId) {
      body.conversationId = conversationId
    }

    const history = await this.chatLog.buildHistoryContext({
      author: author || undefined,
      conversationId: conversationId || undefined,
      currentApp,
      hoursBack: 24,
      maxTurns: 200,
    })

    this.logger.log(
      `[chat] history-context author=${author || '-'} conversationId=${conversationId || '-'} currentApp=${currentApp || '-'} turns=${history.length}`,
    )

    return {
      body,
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
    if (!this.isRegisteredScreen(ctx.key)) {
      this.logger.log(`[handleScreenPipeline] unregistered screen route=${ctx.key}`)
      return null
    }
    this.logger.log(`[handleScreenPipeline] key=${ctx.key}`)
    try {
      if (ctx.key === 'robot/ailog/event') {
        return this.handleRobotAilogEventScreen(ctx)
      }

      if (ctx.key.startsWith('robot/ailog/')) {
        return this.handleRobotAilogChildScreen(ctx)
      }

      if (ctx.key.startsWith('robot/')) {
        return this.handleRobotGenericScreen(ctx)
      }

      return this.handleGenericRegisteredScreen(ctx)
    } catch (e: any) {
      this.logger.error(
        `[chat] screen pipeline error route=${ctx.key} err=${e?.message ?? String(e)}`,
      )
      return null
    }
  }

  private isRegisteredScreen(routeKey: string) {
    return Boolean(getScreenConfig(routeKey))
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
    const pipelineBody = {
      ...ctx.body,
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
    if (out.handled && out.reply) {
      await this.saveLog(ctx.body, out.reply, ctx)
      return out.reply
    }

    return null
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

    const reply: ChatReply = {
      chat_action: routeKey || 'default',
      text: text || '',
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