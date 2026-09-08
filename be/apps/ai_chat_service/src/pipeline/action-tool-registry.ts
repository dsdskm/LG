/** action_tool 표를 플레인 모듈(screen-registry, 도구 구현)에 넘겨주는 등록소.
 * rule-registry 와 같은 이유로 서비스에서 직접 import 하지 않는다.
 */

export type ActionToolRow = {
  toolKey: string
  /** LLM 에 선언되는 함수 이름. */
  llmFunction?: string | null
  /** 그 도구의 결과로 프론트가 실행할 함수 이름. */
  clientFunction?: string | null
  enabled?: boolean
  sortOrder?: number
}

export type ActionToolReader = {
  /** 화면 -> 앱 -> common 순으로 합쳐진, 활성 상태의 도구 목록. */
  listForRoute: (appKey: string, screenKey: string) => ActionToolRow[]
}

let activeReader: ActionToolReader | null = null

export function registerActionToolReader(reader: ActionToolReader | null): void {
  activeReader = reader
}

export function getActionToolReader(): ActionToolReader | null {
  return activeReader
}

/** routeKey 에서 앱 키를 뽑는다. screen_key 첫 세그먼트가 앱 키다. */
export function routeAppKey(routeKey: string): string {
  const normalized = String(routeKey ?? '').trim().replace(/^\/+/, '')
  return normalized.split('/').filter(Boolean)[0] || 'common'
}

/** 해당 화면에 등록된 도구 목록. 등록소가 비어 있으면 빈 배열(=도구 없음)로 본다. */
export function listActionTools(screenKey: string): ActionToolRow[] {
  const reader = getActionToolReader()
  if (!reader) return []

  return reader.listForRoute(routeAppKey(screenKey), String(screenKey ?? '').trim())
}

/** LLM 함수와 짝인 프론트 함수 이름. 등록이 없으면 빈 문자열. */
export function findClientFunctionName(screenKey: string, toolKey: string): string {
  const row = listActionTools(screenKey).find((item) => item.toolKey === toolKey)
  return String(row?.clientFunction ?? '').trim()
}
