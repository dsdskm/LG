import type { ToolDefinition } from './tool.type'
import { getPromptStore } from '../features/chat/service/prompt-store.service'

export type ScreenConfig = {
  /** currentApp::currentPath. handleXxx 의 routeKey 와 동일. */
  key: string
  /** 앱 키(예: robot, ota, cms, tms). */
  appKey: string
  /** 화면 표시명(프롬프트/로그용). */
  screenName: string
  /** 인텐트 분류기에 주는 공통/앱/화면별 지침. */
  intentClassifierPrompt?: string
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

function logPromptMeta(routeKey: string, appKey: string, details: Record<string, { source: string; length: number; enabled: boolean; promptId?: number | null }>) {
  const promptEntries = Object.entries(details)
    .map(([key, value]) => `${key}:len=${value.enabled ? value.length : 0}:src=${value.source}:promptId=${value.promptId ?? 'none'}`)
    .join(', ')

}

function matchRouteTemplate(template: string, actual: string): boolean {
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

function findParameterizedScreenKey(routeKey: string): string | null {
  const normalized = String(routeKey || '').trim().replace(/^\/+/, '')
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

function toChatAction(routeKey: string) {
  const normalized = String(routeKey || '').replace(/^\//, '').replace(/^robot\//, '')
  return normalized || 'default'
}

export function getScreenConfig(routeKey: string, reqId?: string): ScreenConfig | undefined {
  const normalizedRouteKey = String(routeKey || '').replace(/^\//, '')
  if (!normalizedRouteKey) return undefined
  const appKey = normalizedRouteKey.split('/').filter(Boolean)[0] || normalizedRouteKey

  const store = getPromptStore()
  let screen = store?.getScreen(normalizedRouteKey)
  if (!screen || screen.enabled === false) {
    const matchedTemplate = findParameterizedScreenKey(normalizedRouteKey)
    if (matchedTemplate) {
      screen = store?.getScreen(matchedTemplate)
    }
  }

  if (!screen || screen.enabled === false) {
    return undefined
  }

  const effectiveRouteKey = screen.screenKey
  const commonInstructionMeta = store?.getPromptMeta('common', 'instruction')
  const commonIntentClassifierMeta = store?.getPromptMeta('common', 'intent-classifier')
  const screenIntentClassifierMeta = store?.getPromptMeta(effectiveRouteKey, 'intent-classifier')
  const screenDataSystemMeta = store?.getPromptMeta(effectiveRouteKey, 'data-system')
  const screenActionSystemMeta = store?.getPromptMeta(effectiveRouteKey, 'action-system')
  const screenFallbackMeta = store?.getPromptMeta(effectiveRouteKey, 'fallback')
  const guidanceExamples = normalizeGuidanceExamples(store?.getGuidance(effectiveRouteKey)?.examples)

  const appIntentClassifierMeta = store?.getPromptMeta(appKey, 'intent-classifier')
  const appDataSystemMeta = store?.getPromptMeta(appKey, 'data-system')
  const appActionSystemMeta = store?.getPromptMeta(appKey, 'action-system')
  const appFallbackMeta = store?.getPromptMeta(appKey, 'fallback')

  const commonInstruction = commonInstructionMeta?.prompt ?? ''
  const commonIntentClassifier = commonIntentClassifierMeta?.prompt ?? ''
  const screenIntentClassifier = screenIntentClassifierMeta?.prompt ?? ''
  const screenDataSystem = screenDataSystemMeta?.prompt ?? ''
  const screenActionSystem = screenActionSystemMeta?.prompt ?? ''
  const screenFallback = screenFallbackMeta?.prompt ?? ''

  const appIntentClassifier = appIntentClassifierMeta?.prompt ?? ''
  const appDataSystem = appDataSystemMeta?.prompt ?? ''
  const appActionSystem = appActionSystemMeta?.prompt ?? ''
  const appFallback = appFallbackMeta?.prompt ?? ''

  const intentClassifierPrompt = [commonIntentClassifier, appIntentClassifier, screenIntentClassifier].filter(Boolean).join('\n\n')
  const resolvedDataSystem = screenDataSystem || appDataSystem
  const resolvedActionSystem = screenActionSystem || appActionSystem
  const resolvedFallback = screenFallback || appFallback

  const mergedDataSystemPrompt = [commonInstruction, resolvedDataSystem].filter(Boolean).join('\n\n')
  const mergedActionSystemPrompt = [commonInstruction, resolvedActionSystem].filter(Boolean).join('\n\n')

  logPromptMeta(effectiveRouteKey, appKey, {
    'common:instruction': { source: 'common', length: commonInstruction.length, enabled: Boolean(commonInstruction), promptId: commonInstructionMeta?.id ?? null },
    'app:intent-classifier': { source: appIntentClassifier ? 'app' : 'missing', length: appIntentClassifier.length, enabled: Boolean(appIntentClassifier), promptId: appIntentClassifierMeta?.id ?? null },
    'screen:intent-classifier': { source: screenIntentClassifier ? 'screen' : 'missing', length: screenIntentClassifier.length, enabled: Boolean(screenIntentClassifier), promptId: screenIntentClassifierMeta?.id ?? null },
    'resolved:intent-classifier': { source: 'merge', length: intentClassifierPrompt.length, enabled: Boolean(intentClassifierPrompt), promptId: null },
    'resolved:data-system': { source: resolvedDataSystem ? 'screen-or-app' : 'missing', length: mergedDataSystemPrompt.length, enabled: Boolean(mergedDataSystemPrompt), promptId: screenDataSystemMeta?.id ?? appDataSystemMeta?.id ?? null },
    'resolved:action-system': { source: resolvedActionSystem ? 'screen-or-app' : 'missing', length: mergedActionSystemPrompt.length, enabled: Boolean(mergedActionSystemPrompt), promptId: screenActionSystemMeta?.id ?? appActionSystemMeta?.id ?? null },
  })

  const dataTools: ToolDefinition[] = []

  const actionTools: ToolDefinition[] = []

  const commonActionTools: ToolDefinition[] = []

  const baseAction = toChatAction(effectiveRouteKey)
  return {
    key: effectiveRouteKey,
    appKey,
    screenName: screen.screenName,
    intentClassifierPrompt,
    ragCollection: effectiveRouteKey,
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
