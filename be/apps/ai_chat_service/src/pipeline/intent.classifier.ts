/**
 * 인텐트 분류기. 사용자 발화를 info | action 두 가지로 분류한다.
 *
 *  - info   : 개념/사용법/의미에 대한 정보 문의 (매뉴얼·문서로 답할 수 있는 것)
 *  - action : 액션 명령 또는 데이터 조회 요청(실행/이동/필터/조회 요구 등)
 *
 *  NOTE:
 *  - 기존 data 분류는 action으로 통합 처리한다.
 *  - LLM은 JSON 하나만 반환하고, 다른 텍스트는 금지한다.
 */
import type { LlmClient } from '../llm/llm.types'
import { getPromptStore } from '../features/chat/service/prompt-store.service'
import { logLlmPromptMeta, safeJsonParse } from '../utils/utils'
import type { ChatIntent, ChatTurn, IntentResult } from './pipeline.types'

function buildSystemPrompt(screenName: string, hints?: string): string {
  const commonInstruction = getPromptStore()?.getPromptContent('common', 'instruction')?.trim() ?? ''
  const extras = [
    commonInstruction,
    screenName ? `screen=${String(screenName)}` : '',
    hints ? String(hints) : '',
  ].filter(Boolean)

  return extras.join('\n')
}

export class IntentClassifier {
  constructor(
    private readonly client: LlmClient,
    private readonly maxOutputTokens: number,
  ) {}

  async classify(
    message: string,
    screenName: string,
    hints?: string,
    history: ChatTurn[] = [],
  ): Promise<IntentResult> {
    const commonInstructionMeta = getPromptStore()?.getPromptMeta('common', 'instruction')
    const systemPrompt = buildSystemPrompt(screenName, hints)
    logLlmPromptMeta({
      stage: 'intent-classifier',
      promptType: 'intent-classifier',
      route: screenName,
      appKey: screenName?.split('/')?.[0] ?? null,
      promptId: commonInstructionMeta?.id ?? null,
      systemPromptLen: systemPrompt.length,
      messageLen: String(message ?? '').length,
      historyTurns: history.length,
      toolCount: 0,
      isToolCall: false,
    })

    // 히스토리를 함께 넣어 "응", "그거 좁혀줘" 같은 문맥 의존 발화도 분류되게 한다.
    const res = await this.client.generateContent({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: message },
      ],
      maxOutputTokens: this.maxOutputTokens,
    })

    const parsed = parseIntent(res.text)
    return parsed
  }
}

const VALID: ChatIntent[] = ['info', 'action']

function parseIntent(text?: string): IntentResult {
  const raw = String(text ?? '').trim()
  const stripped = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, '$1').trim()
  const obj = safeJsonParse(stripped) as any

  if (obj && typeof obj === 'object') {
    const candidateIntent = String(obj?.intent ?? obj?.classification ?? '').trim().toLowerCase()
    const normalizedIntent = candidateIntent === 'data' ? 'action' : candidateIntent
    const intent: ChatIntent = VALID.includes(normalizedIntent as ChatIntent)
      ? (normalizedIntent as ChatIntent)
      : 'info'
    const rawConf = Number(obj?.confidence ?? obj?.score)
    const confidence = Number.isFinite(rawConf)
      ? Math.min(1, Math.max(0, rawConf))
      : 0
    const reason = String(obj?.reason ?? '').trim()
    return { intent, confidence, reason }
  }

  const direct = stripped.match(/\b(info|data|action)\b/i)
  if (direct) {
    const normalizedIntent = direct[1].toLowerCase() === 'data' ? 'action' : direct[1].toLowerCase()
    const confidenceMatch = stripped.match(/(?:confidence|신뢰도|score)\s*[:=]\s*([0-9]*\.?[0-9]+)/i)
    const confidence = confidenceMatch ? Math.min(1, Math.max(0, Number(confidenceMatch[1]))) : 0.8
    return { intent: VALID.includes(normalizedIntent as ChatIntent) ? (normalizedIntent as ChatIntent) : 'info', confidence, reason: stripped }
  }

  const intentByPattern = stripped.match(/(?:intent|의도)\s*[:=]\s*(info|data|action)/i)
  if (intentByPattern) {
    const normalizedIntent = intentByPattern[1].toLowerCase() === 'data' ? 'action' : intentByPattern[1].toLowerCase()
    const confidenceMatch = stripped.match(/(?:confidence|신뢰도|score)\s*[:=]\s*([0-9]*\.?[0-9]+)/i)
    const confidence = confidenceMatch ? Math.min(1, Math.max(0, Number(confidenceMatch[1]))) : 0.8
    return { intent: VALID.includes(normalizedIntent as ChatIntent) ? (normalizedIntent as ChatIntent) : 'info', confidence, reason: stripped }
  }

  return { intent: 'info', confidence: 0, reason: stripped }
}
