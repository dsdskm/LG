import type { ToolDefinition } from './tool.type'
import { queryEvents } from '../screens/robot/ailog-event.datatools'
import { listRecommendedActions, runAction } from '../screens/robot/ailog-event.actiontools'
import { navigateToScreen } from '../screens/common/navigation.actiontools'
import { getPromptStore } from '../db/prompt-store.service'
import { Logger } from '@nestjs/common'
import { ChatScreenToolEntity } from '../db/chat-screen-tool.entity'

const logger = new Logger('ScreenRegistry')

export type ScreenConfig = {
  /** currentApp::currentPath. handleXxx 의 routeKey 와 동일. */
  key: string
  /** 앱 키(예: robot, ota, cms, tms). */
  appKey: string
  /** 화면 표시명(프롬프트/로그용). */
  screenName: string
  /** 인텐트 분류기에 주는 화면별 추가 힌트. */
  intentHints?: string
  /** RAG 컬렉션 키(rag.docs). info 인텐트에서 사용. */
  ragCollection: string
  /** data 인텐트 tool 목록. */
  dataTools: ToolDefinition[]
  /** action 인텐트 tool 목록. */
  actionTools: ToolDefinition[]
  /** data/action agent 의 system 프롬프트. */
  dataSystemPrompt: string
  actionSystemPrompt: string
  /** 인텐트별 chat_action 값(프론트 분기용). */
  chatActions: { info: string; data: string; action: string }
  /** 근거/데이터가 없을 때 공통 폴백 문구. */
  fallbackText: string
}

const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  query_events: queryEvents,
  list_recommended_actions: listRecommendedActions,
  run_action: runAction,
  navigate_to_screen: navigateToScreen,
}

function normalizePath(value: unknown): string {
  return String(value ?? '').trim().replace(/^\/+/, '')
}

function getDynamicNavigationTool(row: ChatScreenToolEntity): ToolDefinition | undefined {
  const method = String(row.method ?? '').trim().toUpperCase()
  if (method !== 'NAVIGATE') return undefined

  const staticPayload = row.staticPayload as Record<string, unknown> | null
  const targetPath = normalizePath(staticPayload?.path ?? row.endpoint)
  if (!targetPath) return undefined

  const name = String(row.toolName ?? '').trim()
  if (!name) return undefined

  return {
    declaration: {
      name,
      description:
        String(row.description ?? '').trim() ||
        `${targetPath} 화면으로 이동시킨다. 화면 이동 요청일 때만 호출한다.`,
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: '왜 이 화면으로 이동하는지에 대한 짧은 설명.',
          },
        },
      },
    },
    async execute(args: Record<string, any>) {
      return {
        ok: true,
        path: targetPath,
        app: targetPath.split('/')[0] || undefined,
        reason: String(args?.reason ?? '').trim() || undefined,
      }
    },
  }
}

function resolveToolDefinition(row: ChatScreenToolEntity): ToolDefinition | undefined {
  return TOOL_REGISTRY[row.toolName] ?? getDynamicNavigationTool(row)
}

function toChatAction(routeKey: string) {
  const normalized = String(routeKey || '').replace(/^\//, '').replace(/^robot\//, '')
  return normalized || 'default'
}

export function getScreenConfig(routeKey: string): ScreenConfig | undefined {
  const normalizedRouteKey = String(routeKey || '').replace(/^\//, '')
  if (!normalizedRouteKey) return undefined
  const appKey = normalizedRouteKey.split('/').filter(Boolean)[0] || normalizedRouteKey

  const store = getPromptStore()
  const screen = store?.getScreen(normalizedRouteKey)
  if (!screen || screen.enabled === false) {
    return undefined
  }

  const commonSystem = store?.getPromptContent('common', 'system') ?? ''
  const appIntentHint = store?.getPromptContent(appKey, 'intent-hint') ?? ''
  const appDataSystem = store?.getPromptContent(appKey, 'data-system') ?? ''
  const appActionSystem = store?.getPromptContent(appKey, 'action-system') ?? ''
  const appFallback = store?.getPromptContent(appKey, 'fallback') ?? ''

  const mergedDataSystemPrompt = [commonSystem, appDataSystem].filter(Boolean).join('\n\n')
  const mergedActionSystemPrompt = [commonSystem, appActionSystem].filter(Boolean).join('\n\n')

  const dataTools = (store?.getScreenTools(normalizedRouteKey, 'data') ?? [])
    .map((row) => resolveToolDefinition(row))
    .filter((tool): tool is ToolDefinition => Boolean(tool))

  const actionTools = (store?.getScreenTools(normalizedRouteKey, 'action') ?? [])
    .map((row) => resolveToolDefinition(row))
    .filter((tool): tool is ToolDefinition => Boolean(tool))

  const baseAction = toChatAction(normalizedRouteKey)

  logger.log(
    [
      '[prompt-apply]',
      `route=${normalizedRouteKey}`,
      `app=${appKey}`,
      `commonSystemApplied=${Boolean(commonSystem)}`,
      `dataPromptLen=${mergedDataSystemPrompt.length}`,
      `actionPromptLen=${mergedActionSystemPrompt.length}`,
      `dataTools=${dataTools.length}`,
      `actionTools=${actionTools.length}`,
    ].join(' '),
  )
  logger.log(`[prompt-apply] route=${normalizedRouteKey} commonSystemText=${JSON.stringify(commonSystem)}`)

  return {
    key: normalizedRouteKey,
    appKey,
    screenName: screen.screenName,
    intentHints: appIntentHint,
    ragCollection: appKey,
    dataTools,
    actionTools,
    dataSystemPrompt: mergedDataSystemPrompt,
    actionSystemPrompt: mergedActionSystemPrompt,
    chatActions: {
      info: baseAction,
      data: `${baseAction}/filter`,
      action: `${baseAction}/action`,
    },
    fallbackText: appFallback,
  }
}
