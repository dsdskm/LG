import { safeJsonParse } from '../utils/utils'
import type { ChatReply } from '../pipeline/pipeline.types'

/** 사용자에게 보여 줄 문장을 다듬는 함수들.
 * LLM 이 JSON 이나 디버그 문자열을 그대로 뱉는 경우가 있어 채팅 응답 직전에 한 번 걸러 준다.
 * ChatService 에서 떼어 내 단독으로 테스트할 수 있게 했다.
 */
export function toDisplayText(value: unknown): string {
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


export function normalizeUserFacingText(rawText: string): string {
  const text = String(rawText ?? '').trim()
  if (!text) return ''

  const stripCodeBlock = text.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim()
  const parsed = safeJsonParse(stripCodeBlock) as Record<string, unknown> | null
  if (parsed && typeof parsed === 'object') {
    const preferred = [
      parsed.text,
      parsed.answer,
      parsed.content,
      parsed.summary,
      parsed.message,
      parsed.reason,
    ]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
      .find((value) => !/^\s*\{/.test(value))

    if (preferred) return preferred
  }

  const reasonMatch = stripCodeBlock.match(/"reason"\s*:\s*"((?:\\.|[^"\\])*)"/i)
  if (reasonMatch?.[1]) {
    return reasonMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
  }

  const singleQuoteReasonMatch = stripCodeBlock.match(/'reason'\s*:\s*'((?:\\.|[^'\\])*)'/i)
  if (singleQuoteReasonMatch?.[1]) {
    return singleQuoteReasonMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
  }

  return text
}


export function summarizeRagDebugText(text: string): string {
  const raw = String(text ?? '').trim()
  if (!raw) return ''

  const isRagDebugText = /(?:matchScore=|adjustedScore=|thresholdScore=|selected=|selectedChunks=|comparison=|common=|screen\()/i.test(raw)
  if (!isRagDebugText) return raw

  return '질문과 관련된 내용을 확인해서 답변을 정리해봤어요.'
}


export function isInfoPipelineReply(reply: ChatReply | null | undefined): boolean {
  const trace = String(reply?.pipelineTrace ?? '').trim()
  if (!trace) return false

  return trace.includes('rag(') || trace.includes('llm(정보 프롬프트)')
}


export function sanitizeLeadingAssistantPreface(text: string): string {
  const raw = String(text ?? '').trim()
  if (!raw) return ''

  const hasStructuredBody = (value: string): boolean => {
    const v = String(value ?? '').trim()
    if (v.length < 20) return false
    return /\n/.test(v) || /(^#|^[-*]\s|^\d+\)|!\[|```|Taskflow|태스크\s*플로우|태스크플로우)/im.test(v)
  }

  // 1) "죄송합니다. 제공된 문서에는 ... 정보가 없습니다." + 실제 본문 형태
  const noDocLead = /^죄송합니다\.\s*제공된\s*문서에는\s*[^\n.!?]*정보가\s*없습니다\.?\s*/i
  if (noDocLead.test(raw)) {
    const stripped = raw.replace(noDocLead, '').trim()
    if (stripped.length >= 12) {
      return stripped
    }
  }

  // 2) "저는 ... 처리할 수 있습니다." 같은 소개성 선행 문구
  const capabilityLead = /^저는\s+[^\n]{0,140}?(?:할\s*수\s*있습니다|해드릴\s*수\s*있습니다|지원합니다|가능합니다)\.?\s*/i
  if (capabilityLead.test(raw)) {
    const stripped = raw.replace(capabilityLead, '').trim()
    if (hasStructuredBody(stripped)) {
      return stripped
    }
  }

  return raw
}


export function ensureUserFacingReply(reply: ChatReply): ChatReply {
  const text = String(reply?.text ?? '').trim()
  if (text) {
    const normalizedText = normalizeUserFacingText(text)
    const ragFriendlyText = summarizeRagDebugText(normalizedText)
    const finalTextCandidate = sanitizeLeadingAssistantPreface(ragFriendlyText)
    const finalText = finalTextCandidate || ragFriendlyText || normalizedText

    if (finalText !== text) {
      return {
        ...reply,
        text: finalText,
      }
    }

    if (normalizedText !== text) {
      return {
        ...reply,
        text: normalizedText,
      }
    }

    return reply
  }

  if (isInfoPipelineReply(reply)) {
    return {
      ...reply,
      text: '정보 응답 생성에 실패했습니다.',
    }
  }

  const chatAction = String(reply?.chat_action ?? '').trim()
  const actionParam = reply?.chat_action_param && typeof reply.chat_action_param === 'object'
    ? (reply.chat_action_param as Record<string, unknown>)
    : undefined

  let fallbackText = '요청을 처리했지만 답변 문장을 만들지 못했습니다. 다시 질문해 주세요.'

  if (chatAction === 'navigation') {
    const path = String(actionParam?.path ?? '').trim().replace(/^\/+/, '')
    fallbackText = path ? `${path} 화면으로 이동을 준비했어요.` : '화면 이동을 준비했어요.'
  } else if (Array.isArray(actionParam?.suggested_actions) && actionParam.suggested_actions.length > 0) {
    fallbackText = '요청을 처리했지만 답변 문장을 만들지 못했습니다. 같은 내용을 한 번 더 질문해 주세요.'
  }

  return {
    ...reply,
    text: fallbackText,
  }
}


export function ensurePeriodInEventReply(reply: ChatReply): ChatReply {
  const action = String(reply?.chat_action ?? '').trim().toLowerCase()
  if (action !== 'ailog/event/filter') return reply

  const actionParam = reply?.chat_action_param && typeof reply.chat_action_param === 'object'
    ? (reply.chat_action_param as Record<string, unknown>)
    : undefined
  const filters = actionParam?.filters && typeof actionParam.filters === 'object'
    ? (actionParam.filters as Record<string, unknown>)
    : undefined

  const startDate = String(filters?.startDate ?? '').trim()
  const endDate = String(filters?.endDate ?? '').trim()
  if (!startDate || !endDate) return reply

  const periodText = `조회 기간은 ${startDate} ~ ${endDate}입니다.`
  const rawText = String(reply?.text ?? '').trim()
  if (!rawText) {
    return {
      ...reply,
      text: periodText,
    }
  }

  // 이미 기간 안내가 있으면 중복 삽입하지 않는다.
  const normalized = rawText.replace(/\s+/g, '')
  const hasPeriod =
    normalized.includes(startDate.replace(/\s+/g, ''))
    && normalized.includes(endDate.replace(/\s+/g, ''))
  if (hasPeriod) return reply

  return {
    ...reply,
    text: `${periodText} ${rawText}`,
  }
}
