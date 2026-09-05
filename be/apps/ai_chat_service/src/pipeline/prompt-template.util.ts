import { getPromptStore } from '../features/chat/service/prompt-store.service'

/**
 * DB prompt 행을 읽어 {{key}} 자리를 채운다.
 * 행이 없거나 비활성이면 빈 문자열을 돌려주고, 호출부가 기능을 끄거나 건너뛴다.
 */
export function renderPromptTemplate(
  scopeKey: string,
  promptType: string,
  vars: Record<string, string> = {},
): string {
  const template = String(getPromptStore()?.getPromptContent(scopeKey, promptType) ?? '').trim()
  if (!template) return ''

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => vars[name] ?? '')
}
