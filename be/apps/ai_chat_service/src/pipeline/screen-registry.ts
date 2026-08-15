import type { ToolDefinition } from './tool.type'
import { getPromptStore } from '../features/chat/service/prompt-store.service'

export type ScreenConfig = {
  /** currentApp::currentPath. handleXxx 의 routeKey 와 동일. */
  key: string
  /** 앱 키(예: robot, ota, cms, tms). */
  appKey: string
  /** 화면 표시명(프롬프트/로그용). */
  screenName: string
  /** 인텐트 분류기에 주는 화면별 추가 힌트. */
  intentHints?: string
  /** intent-hint 적용 방식. default | screen | merge */
  intentHintMode?: 'default' | 'screen' | 'merge'
  /** RAG 컬렉션 키(chat_rag_doc.key). info 인텐트에서 사용. */
  ragCollection: string
  /** data 인텐트 tool 목록. */
  dataTools: ToolDefinition[]
  /** action 인텐트 tool 목록. */
  actionTools: ToolDefinition[]
  /** data/action agent 의 system 프롬프트. */
  dataSystemPrompt: string
  actionSystemPrompt: string
  /** 공통 key(common)에서만 온 action tool 목록. 실패 시 재시도용. */
  commonActionTools: ToolDefinition[]
  /** 인텐트별 chat_action 값(프론트 분기용). */
  chatActions: { info: string; data: string; action: string }
  /** 근거/데이터가 없을 때 공통 폴백 문구. */
  fallbackText: string
  /** 현재 screen_key의 screen_guidance.examples. */
  guidanceExamples: string[]
}

function normalizeGuidanceExamples(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(new Set(value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (!item || typeof item !== 'object') return ''
      return String((item as Record<string, unknown>).q ?? '').trim()
    })
    .filter(Boolean)))
}

function toChatAction(routeKey: string) {
  const normalized = String(routeKey || '').replace(/^\//, '').replace(/^robot\//, '')
  return normalized || 'default'
}

function resolveIntentHintMode(routeKey: string): 'default' | 'screen' | 'merge' {
  const normalizedRouteKey = String(routeKey || '').replace(/^\//, '')
  const store = getPromptStore()
  const rawMode = String(store?.getPromptContent(normalizedRouteKey, 'intent-hint-mode') ?? 'merge').trim().toLowerCase()
  if (rawMode === 'default' || rawMode === 'screen' || rawMode === 'merge') {
    return rawMode
  }
  return 'merge'
}

export function getScreenConfig(routeKey: string, reqId?: string): ScreenConfig | undefined {
  const normalizedRouteKey = String(routeKey || '').replace(/^\//, '')
  if (!normalizedRouteKey) return undefined
  const appKey = normalizedRouteKey.split('/').filter(Boolean)[0] || normalizedRouteKey

  const store = getPromptStore()
  const screen = store?.getScreen(normalizedRouteKey)
  if (!screen || screen.enabled === false) {
    return undefined
  }

  const commonSystem = store?.getPromptContent('common', 'system') ?? ''
  const commonIntentHint = store?.getPromptContent('common', 'intent-hint') ?? ''
  const screenIntentHint = store?.getPromptContent(normalizedRouteKey, 'intent-hint') ?? ''
  const screenDataSystem = store?.getPromptContent(normalizedRouteKey, 'data-system') ?? ''
  const screenActionSystem = store?.getPromptContent(normalizedRouteKey, 'action-system') ?? ''
  const screenFallback = store?.getPromptContent(normalizedRouteKey, 'fallback') ?? ''
  const guidanceExamples = normalizeGuidanceExamples(store?.getGuidance(normalizedRouteKey)?.examples)

  const appIntentHint = store?.getPromptContent(appKey, 'intent-hint') ?? ''
  const appDataSystem = store?.getPromptContent(appKey, 'data-system') ?? ''
  const appActionSystem = store?.getPromptContent(appKey, 'action-system') ?? ''
  const appFallback = store?.getPromptContent(appKey, 'fallback') ?? ''

  const resolvedIntentHintMode = resolveIntentHintMode(normalizedRouteKey)
  const resolvedIntentHint = (() => {
    if (resolvedIntentHintMode === 'default') {
      return commonIntentHint || appIntentHint || screenIntentHint
    }
    if (resolvedIntentHintMode === 'screen') {
      return screenIntentHint || commonIntentHint || appIntentHint
    }
    return [commonIntentHint, appIntentHint, screenIntentHint].filter(Boolean).join('\n\n')
  })()
  const resolvedDataSystem = screenDataSystem || appDataSystem
  const resolvedActionSystem = screenActionSystem || appActionSystem
  const resolvedFallback = screenFallback || appFallback

  const mergedDataSystemPrompt = [commonSystem, resolvedDataSystem].filter(Boolean).join('\n\n')
  const mergedActionSystemPrompt = [commonSystem, resolvedActionSystem].filter(Boolean).join('\n\n')

  const dataTools: ToolDefinition[] = []

  const actionTools: ToolDefinition[] = []

  const commonActionTools: ToolDefinition[] = []

  const baseAction = toChatAction(normalizedRouteKey)
  return {
    key: normalizedRouteKey,
    appKey,
    screenName: screen.screenName,
    intentHints: resolvedIntentHint,
    intentHintMode: resolvedIntentHintMode,
    ragCollection: normalizedRouteKey,
    dataTools,
    actionTools,
    dataSystemPrompt: mergedDataSystemPrompt,
    actionSystemPrompt: mergedActionSystemPrompt,
    commonActionTools,
    chatActions: {
      info: baseAction,
      data: `${baseAction}/filter`,
      action: `${baseAction}/action`,
    },
    fallbackText: resolvedFallback,
    guidanceExamples,
  }
}
