import type { ToolDefinition } from './tool.type'
import { getPromptStore } from '../features/chat/service/prompt-store.service'
import { CHAT_PROMPT_TYPE } from '../features/chat/prompt-types'

export type ScreenConfig = {
  /** currentApp::currentPath. handleXxx 의 routeKey 와 동일. */
  key: string
  /** 앱 키(예: robot, ota, cms, tms). */
  appKey: string
  /** 화면 표시명(프롬프트/로그용). */
  screenName: string
  /** RAG 컬렉션 키(chat_rag_doc.key). info 인텐트에서 사용. */
  ragCollection: string
  /** data 인텐트 tool 목록. */
  dataTools: ToolDefinition[]
  /** action 인텐트 tool 목록. */
  actionTools: ToolDefinition[]
  /** legacy action agent system prompts. */
  dataSystemPrompt: string
  actionSystemPrompt: string
  /** 공통 key(common)에서만 온 action tool 목록. 실패 시 재시도용. */
  commonActionTools: ToolDefinition[]
  /** 인텐트별 chat_action 값(프론트 분기용). */
  chatActions: { info: string; data: string; action: string }
  /** intent classifier 에 전달할 화면별 프롬프트. */
  intentClassifierPrompt: string
  /** legacy fallback text. */
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

function logPromptMeta(routeKey: string, appKey: string, details: Record<string, { source: string; length: number; enabled: boolean }>) {
  const promptEntries = Object.entries(details)
    .map(([key, value]) => `${key}:${value.enabled ? value.length : 0}:${value.source}`)
    .join(', ')

  console.log(
    `[prompt-meta] route=${routeKey} appKey=${appKey} promptInfo={${promptEntries}} mode=${details.intentHintMode?.source ?? 'unknown'}`,
  )
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
  const commonInstruction = store?.getPromptContent('common', CHAT_PROMPT_TYPE.instruction) ?? ''
  const commonIntentClassifierPrompt = store?.getPromptContent('common', CHAT_PROMPT_TYPE.intentClassifier) ?? ''
  const screenIntentClassifierPrompt = store?.getPromptContent(effectiveRouteKey, CHAT_PROMPT_TYPE.intentClassifier) ?? ''
  const guidanceExamples = normalizeGuidanceExamples(store?.getGuidance(effectiveRouteKey)?.examples)

  const appIntentClassifierPrompt = store?.getPromptContent(appKey, CHAT_PROMPT_TYPE.intentClassifier) ?? ''
  const intentClassifierPrompt = [commonIntentClassifierPrompt, appIntentClassifierPrompt, screenIntentClassifierPrompt]
    .filter(Boolean)
    .join('\n\n')

  logPromptMeta(effectiveRouteKey, appKey, {
    'common:instruction': { source: 'common', length: commonInstruction.length, enabled: Boolean(commonInstruction) },
    'common:intent-classifier': { source: commonIntentClassifierPrompt ? 'common' : 'missing', length: commonIntentClassifierPrompt.length, enabled: Boolean(commonIntentClassifierPrompt) },
    'app:intent-classifier': { source: appIntentClassifierPrompt ? 'app' : 'missing', length: appIntentClassifierPrompt.length, enabled: Boolean(appIntentClassifierPrompt) },
    'screen:intent-classifier': { source: screenIntentClassifierPrompt ? 'screen' : 'missing', length: screenIntentClassifierPrompt.length, enabled: Boolean(screenIntentClassifierPrompt) },
    'resolved:intent-classifier': { source: 'common+app+screen', length: intentClassifierPrompt.length, enabled: Boolean(intentClassifierPrompt) },
  })

  const dataTools: ToolDefinition[] = []

  const actionTools: ToolDefinition[] = []

  const commonActionTools: ToolDefinition[] = []

  const baseAction = toChatAction(effectiveRouteKey)
  return {
    key: effectiveRouteKey,
    appKey,
    screenName: screen.screenName,
    ragCollection: effectiveRouteKey,
    dataTools,
    actionTools,
    dataSystemPrompt: '',
    actionSystemPrompt: '',
    commonActionTools,
    chatActions: {
      info: baseAction,
      data: `${baseAction}/filter`,
      action: `${baseAction}/action`,
    },
    intentClassifierPrompt,
    fallbackText: '',
    guidanceExamples,
  }
}
