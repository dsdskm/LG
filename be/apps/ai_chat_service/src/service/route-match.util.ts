import { getPromptStore } from '../features/chat/service/prompt-store.service'
import { getScreenConfig } from '../pipeline/screen-registry'

/** 요청 경로를 등록된 화면 키로 옮기는 규칙.
 * 화면 키에는 ":taskFlowId" 처럼 파라미터가 들어 있어 문자열 비교만으로는 못 찾는다.
 * ChatService 에서 떼어 내 단독으로 테스트할 수 있게 했다.
 */
export type RouteLogger = { log: (message: string) => void }

export function normalizeRoutePath(value: unknown): string {
  return String(value ?? '').trim().replace(/^\/+/, '')
}

function isRegisteredScreen(routeKey: string, reqId?: string): boolean {
  return Boolean(getScreenConfig(routeKey, reqId))
}

export function matchRouteTemplate(template: string, actual: string): boolean {
  const tpl = String(template ?? '').trim().replace(/^\/+/, '')
  const act = String(actual ?? '').trim().replace(/^\/+/, '')
  if (!tpl || !act) return false

  const tplSeg = tpl.split('/').filter(Boolean)
  const actSeg = act.split('/').filter(Boolean)
  if (tplSeg.length !== actSeg.length) return false

  for (let i = 0; i < tplSeg.length; i += 1) {
    const t = tplSeg[i]
    const a = actSeg[i]
    if (!t || !a) return false
    if (t.startsWith(':')) continue
    if (t !== a) return false
  }

  return true
}

export function findParameterizedRegisteredRouteKey(routeKey: string): string | null {
  const normalized = normalizeRoutePath(routeKey)
  if (!normalized) return null

  const store = getPromptStore()
  const screens = store?.getEnabledScreens() ?? []

  const matched = screens
    .map((screen) => String(screen.screenKey ?? '').trim())
    .filter((key) => key && key.includes('/:'))
    .filter((key) => matchRouteTemplate(key, normalized))
    .sort((a, b) => b.length - a.length)[0]

  return matched || null
}

export function findNearestRegisteredRouteKey(routeKey: string, reqId?: string, logger?: RouteLogger): string | null {
  const normalized = normalizeRoutePath(routeKey)
  if (!normalized) return null

  if (isRegisteredScreen(normalized, reqId)) {
    return normalized
  }

  const parameterized = findParameterizedRegisteredRouteKey(normalized)
  if (parameterized && isRegisteredScreen(parameterized, reqId)) {
    logger?.log(
      `[handleScreenPipeline] param route match original=${normalized} matched=${parameterized}`,
    )
    return parameterized
  }

  const segments = normalized.split('/').filter(Boolean)
  for (let i = segments.length - 1; i > 0; i -= 1) {
    const candidate = segments.slice(0, i).join('/')
    if (isRegisteredScreen(candidate, reqId)) {
      return candidate
    }
  }

  const heuristicCandidates = getHeuristicFallbackCandidates(normalized)
  for (const candidate of heuristicCandidates) {
    if (isRegisteredScreen(candidate, reqId)) {
      logger?.log(
        `[handleScreenPipeline] heuristic route fallback original=${normalized} matched=${candidate}`,
      )
      return candidate
    }
  }

  return null
}

export function getHeuristicFallbackCandidates(routeKey: string): string[] {
  const normalized = normalizeRoutePath(routeKey)
  if (!normalized) return []

  if (normalized.startsWith('robot/ailog/')) {
    return ['robot/ailog/event', 'robot/ailog', 'robot/dashboard']
  }

  if (normalized.startsWith('robot/')) {
    return ['robot/dashboard', 'robot/management']
  }

  if (normalized.startsWith('ota/')) {
    return ['ota']
  }

  if (normalized.startsWith('cms/')) {
    return ['cms']
  }

  if (normalized.startsWith('tms/')) {
    return ['tms']
  }

  return []
}


