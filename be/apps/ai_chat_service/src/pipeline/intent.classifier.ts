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
  return [
    `너는 로봇 관제 사이트의 "${screenName}" 화면 챗봇의 인텐트 분류기다.`,
    '사용자 발화를 아래 3가지 중 하나로 분류한다.',
    '',
    '- "info": 개념/용어/사용법/의미에 대한 질문. 매뉴얼·문서로 답할 수 있는 것. (예: "Critical 등급 기준이 뭐야?", "이 화면 어떻게 써?")',
    '- "data": 실제 데이터를 조회해야 답할 수 있는 것. 건수/목록/통계/필터 조회. ("이슈"는 "이벤트"와 같은 의미다.) (예: "오늘 Critical 이벤트 몇 건?", "최근 일주일 주행 실패 로그 보여줘", "주행 이슈 보여줘", "주행 기능 이슈 보여줘")',
    '- "action": 즉시 수행해야 하는 명령/조치. (예: "이 이벤트 재부팅 조치 실행해줘", "1번 이벤트 조치 완료 처리해줘")',
    hints ? `\n화면 추가 정보:\n${hints}` : '',
    '',
    '반드시 아래 JSON 만 출력한다(코드블록 금지):',
    '{"intent":"info|data|action","confidence":0.0~1.0,"reason":"간단한 근거"}',
  ].join('\n')
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

  const intent: ChatIntent = VALID.includes(obj?.intent) ? obj.intent : 'info'
  const rawConf = Number(obj?.confidence)
  const confidence = Number.isFinite(rawConf)
    ? Math.min(1, Math.max(0, rawConf))
    : 0
  const reason = String(obj?.reason ?? '').trim()
  return { intent, confidence, reason }
}
