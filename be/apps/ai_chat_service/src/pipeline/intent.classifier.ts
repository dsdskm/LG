/**
 * 인텐트 분류기. 사용자 발화를 info | data | action 중 하나로 분류한다.
 *
 *  - info   : 개념/사용법/의미에 대한 정보 문의 (매뉴얼·문서로 답할 수 있는 것)
 *  - data   : 데이터 조회 (건수/목록/통계 등 실제 값을 가져와야 하는 것)
 *  - action : 액션 명령 (재부팅/조치 실행 등 즉시 수행해야 하는 것)
 */
import type { LlmClient } from '../llm/llm.types'
import { safeJsonParse } from '../utils/utils'
import type { ChatIntent, ChatTurn, IntentResult } from './pipeline.types'

function buildSystemPrompt(screenName: string, hints?: string): string {
  return [hints ? String(hints) : ''].filter(Boolean).join('\n')
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
    // 히스토리를 함께 넣어 "응", "그거 좁혀줘" 같은 문맥 의존 발화도 분류되게 한다.
    const res = await this.client.generateContent({
      messages: [
        { role: 'system', content: buildSystemPrompt(screenName, hints) },
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: message },
      ],
      maxOutputTokens: this.maxOutputTokens,
    })

    const parsed = parseIntent(res.text)
    return parsed
  }
}

const VALID: ChatIntent[] = ['info', 'data', 'action']

function parseIntent(text?: string): IntentResult {
  const raw = String(text ?? '').trim()
  const stripped = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, '$1').trim()
  const obj = safeJsonParse(stripped) as any

  if (obj && typeof obj === 'object') {
    const candidateIntent = String(obj?.intent ?? obj?.classification ?? '').trim().toLowerCase()
    const intent: ChatIntent = VALID.includes(candidateIntent as ChatIntent) ? candidateIntent as ChatIntent : 'info'
    const rawConf = Number(obj?.confidence ?? obj?.score)
    const confidence = Number.isFinite(rawConf)
      ? Math.min(1, Math.max(0, rawConf))
      : 0
    const reason = String(obj?.reason ?? '').trim()
    return { intent, confidence, reason }
  }

  const direct = stripped.match(/\b(info|data|action)\b/i)
  if (direct) {
    const intent = direct[1].toLowerCase() as ChatIntent
    const confidenceMatch = stripped.match(/(?:confidence|신뢰도|score)\s*[:=]\s*([0-9]*\.?[0-9]+)/i)
    const confidence = confidenceMatch ? Math.min(1, Math.max(0, Number(confidenceMatch[1]))) : 0.8
    return { intent: VALID.includes(intent) ? intent : 'info', confidence, reason: stripped }
  }

  const intentByPattern = stripped.match(/(?:intent|의도)\s*[:=]\s*(info|data|action)/i)
  if (intentByPattern) {
    const intent = intentByPattern[1].toLowerCase() as ChatIntent
    const confidenceMatch = stripped.match(/(?:confidence|신뢰도|score)\s*[:=]\s*([0-9]*\.?[0-9]+)/i)
    const confidence = confidenceMatch ? Math.min(1, Math.max(0, Number(confidenceMatch[1]))) : 0.8
    return { intent: VALID.includes(intent) ? intent : 'info', confidence, reason: stripped }
  }

  return { intent: 'info', confidence: 0, reason: stripped }
}
