import { Logger } from '@nestjs/common'
import { getPromptStore } from '../features/chat/service/prompt-store.service'

const logger = new Logger('message-bundle')

// 파싱 비용을 줄이기 위한 본문 기준 캐시. prompt 를 수정하면 본문이 달라져 자동으로 무효화된다.
const bundleCache = new Map<string, Record<string, unknown>>()

function readBundle(scopeKey: string, promptType: string): Record<string, unknown> {
  const content = String(getPromptStore()?.getPromptContent(scopeKey, promptType) ?? '').trim()
  if (!content) return {}

  const cached = bundleCache.get(content)
  if (cached) return cached

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    bundleCache.set(content, parsed)
    return parsed
  } catch {
    logger.error(`[${promptType}] JSON 형식이 아닙니다. scopeKey=${scopeKey}`)
    return {}
  }
}

/**
 * prompt 행 하나에 JSON 으로 담아 둔 문구 묶음에서 key 를 찾아 {{var}} 자리를 채운다.
 * 행이나 키가 없으면 빈 문자열을 돌려주고, 호출부가 그 문장을 통째로 건너뛴다.
 */
export function renderMessage(
  scopeKey: string,
  promptType: string,
  key: string,
  vars: Record<string, string> = {},
): string {
  const template = String(readBundle(scopeKey, promptType)[key] ?? '').trim()
  if (!template) return ''

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => vars[name] ?? '')
}

/** 묶음에 실제로 들어 있는 키 목록. 어떤 도구를 등록할지 DB 가 정하게 하는 데 쓴다. */
export function listMessageKeys(scopeKey: string, promptType: string): string[] {
  return Object.keys(readBundle(scopeKey, promptType))
}

/** 문구 묶음에 같이 담아 둔 수치 설정. 값이 없으면 0 이라 설정 누락이 화면에 드러난다. */
export function readMessageNumber(scopeKey: string, promptType: string, key: string): number {
  const value = Number(readBundle(scopeKey, promptType)[key])
  return Number.isFinite(value) ? value : 0
}
