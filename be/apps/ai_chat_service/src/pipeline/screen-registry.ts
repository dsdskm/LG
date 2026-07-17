import type { ToolDefinition } from './tool.type'
import { queryEvents } from '../screens/robot/ailog-event.datatools'
import { navigateToScreen } from '../screens/common/navigation.actiontools'
import { getPromptStore } from '../db/prompt-store.service'
import { Logger } from '@nestjs/common'
import { ChatScreenToolEntity } from '../db/chat-screen-tool.entity'
import { fetchWithTimeout, safeJsonParse } from '../utils/utils'

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
}

const DATA_TOOL_NAMES = new Set(['query_events'])

const TOOL_REGISTRY_BY_API_METHOD: Record<string, ToolDefinition> = {
  'query_events::GET': queryEvents,
}

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const HTTP_TIMEOUT_MS = 10_000

type ContextParamRule = {
  argKey: string
  sourcePath: string
  required?: boolean
  defaultValue?: unknown
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function normalizeContextParamRules(value: unknown): ContextParamRule[] {
  if (!Array.isArray(value)) return []

  return value
    .map<ContextParamRule | null>((item) => {
      if (typeof item === 'string') {
        const key = item.trim()
        if (!key) return null
        return {
          argKey: key,
          sourcePath: key,
        }
      }

      if (!item || typeof item !== 'object') return null

      const row = item as Record<string, unknown>
      const argKey = String(row.argKey ?? row.arg ?? row.name ?? row.key ?? '').trim()
      const sourcePath = String(row.sourcePath ?? row.from ?? row.contextKey ?? row.path ?? '').trim()
      if (!argKey || !sourcePath) return null

      return {
        argKey,
        sourcePath,
        required: Boolean(row.required),
        defaultValue: row.defaultValue ?? row.default,
      }
    })
    .filter((rule): rule is ContextParamRule => Boolean(rule))
}

function pickByPath(source: Record<string, unknown>, rawPath: string): unknown {
  const normalized = String(rawPath ?? '').trim().replace(/^context\./, '')
  if (!normalized) return undefined

  const segments = normalized.split('.').filter(Boolean)
  let cursor: unknown = source

  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }

  return cursor
}

function buildToolFromRow(row: ChatScreenToolEntity): ToolDefinition | undefined {
  const baseTool = resolveToolDefinition(row)
  if (!baseTool) return undefined

  const contextRules = normalizeContextParamRules(row.contextParams)
  const staticPayload = toObject(row.staticPayload)

  const wrapped: ToolDefinition = {
    declaration: baseTool.declaration,
    async execute(args, ctx) {
      const nextArgs: Record<string, unknown> = {
        ...(args ?? {}),
      }

      const contextData = toObject(ctx.context)
      for (const rule of contextRules) {
        const current = nextArgs[rule.argKey]
        if (current !== undefined && current !== null && String(current).trim() !== '') continue

        let resolved = pickByPath(contextData, rule.sourcePath)
        if (resolved === undefined || resolved === null || String(resolved).trim() === '') {
          resolved = rule.defaultValue
        }

        if (resolved === undefined || resolved === null || String(resolved).trim() === '') {
          if (rule.required) {
            throw new Error(`context param missing: ${rule.sourcePath}`)
          }
          continue
        }

        nextArgs[rule.argKey] = resolved
      }

      const mergedArgs = {
        ...nextArgs,
        ...staticPayload,
      }

      return baseTool.execute(mergedArgs, ctx)
    },
  }

  return wrapped
}

function normalizePath(value: unknown): string {
  return String(value ?? '').trim().replace(/^\/+/, '')
}

function trimBase(url?: string): string {
  return String(url ?? '').trim().replace(/\/+$/, '')
}

type RequestParamLocation = 'query' | 'body' | 'header'

type RequestParamRule = {
  name: string
  location: RequestParamLocation
  required: boolean
  defaultValue?: unknown
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}

function toStringRecord(value: unknown): Record<string, string> {
  const source = toObject(value)
  const out: Record<string, string> = {}

  for (const [k, v] of Object.entries(source)) {
    if (!k || isBlank(v)) continue
    out[k] = String(v)
  }

  return out
}

function hasHeader(headers: Record<string, string>, key: string): boolean {
  const target = String(key ?? '').trim().toLowerCase()
  if (!target) return false
  return Object.keys(headers).some((k) => k.toLowerCase() === target)
}

function normalizeRequestSchema(value: unknown, defaultLocation: RequestParamLocation = 'body'): {
  properties: Record<string, unknown>
  required: string[]
  rules: RequestParamRule[]
} {
  if (!Array.isArray(value)) return { properties: {}, required: [], rules: [] }

  const properties: Record<string, unknown> = {}
  const required: string[] = []
  const rules: RequestParamRule[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>

    const name = String(row.name ?? row.key ?? row.argKey ?? '').trim()
    if (!name) continue

    const type = String(row.type ?? '').trim().toLowerCase()
    const schemaType = (['string', 'number', 'integer', 'boolean', 'object', 'array'].includes(type)
      ? type
      : 'string') as 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'

    const prop: Record<string, unknown> = {
      type: schemaType,
    }

    const description = String(row.description ?? '').trim()
    if (description) prop.description = description

    if (Array.isArray(row.enum) && row.enum.length > 0) {
      prop.enum = row.enum
    }

    const rawIn = String(row.in ?? row.location ?? row.target ?? '').trim().toLowerCase()
    const location: RequestParamLocation = rawIn === 'header' || rawIn === 'query' || rawIn === 'body'
      ? rawIn
      : defaultLocation
    const isRequired = Boolean(row.required)

    properties[name] = prop
    if (isRequired) required.push(name)
    rules.push({
      name,
      location,
      required: isRequired,
      defaultValue: row.defaultValue ?? row.default,
    })
  }

  return { properties, required, rules }
}

function buildHttpUrl(baseUrl: string, endpoint: string, queryParams: Record<string, unknown>): string {
  const absolute = /^https?:\/\//i.test(endpoint)
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const base = absolute ? '' : baseUrl
  const url = `${base}${path}`

  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(queryParams ?? {})) {
    if (v === undefined || v === null || String(v).trim() === '') continue
    query.set(k, String(v))
  }

  const qs = query.toString()
  return qs ? `${url}?${qs}` : url
}

function getDynamicHttpTool(row: ChatScreenToolEntity): ToolDefinition | undefined {
  const method = String(row.method ?? '').trim().toUpperCase()
  if (!HTTP_METHODS.has(method)) return undefined

  const endpoint = String(row.endpoint ?? '').trim()
  if (!endpoint) return undefined

  const toolName = String(row.toolName ?? '').trim()
  if (!toolName) return undefined

  const defaultLocation: RequestParamLocation = method === 'GET' || method === 'DELETE' ? 'query' : 'body'
  const { properties, required, rules } = normalizeRequestSchema(row.requestParams, defaultLocation)

  return {
    declaration: {
      name: toolName,
      description: String(row.description ?? '').trim() || `${method} ${endpoint} API를 호출한다.`,
      parameters: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    },
    async execute(args, ctx) {
      const payload = toObject(args)
      const staticPayload = toObject(row.staticPayload)
      const baseUrlOverride = String(row.baseUrl ?? staticPayload.baseUrl ?? '').trim()
      const staticHeaders = {
        ...toStringRecord(staticPayload.headers),
        ...toStringRecord(row.requestHeaders),
      }
      const staticQuery = {
        ...toObject(staticPayload.query),
        ...toObject(row.requestQuery),
      }
      const reserved = new Set(['baseUrl', 'headers', 'query', 'body', 'useAccessToken'])
      const legacyStaticBody = Object.fromEntries(
        Object.entries(staticPayload).filter(([k]) => !reserved.has(k)),
      )
      const staticBody = {
        ...toObject(legacyStaticBody),
        ...toObject(staticPayload.body),
        ...toObject(row.requestBody),
      }

      const queryPayload: Record<string, unknown> = { ...staticQuery }
      const bodyPayload: Record<string, unknown> = { ...staticBody }
      const headerPayload: Record<string, string> = { ...staticHeaders }

      const consumed = new Set<string>()
      for (const rule of rules) {
        consumed.add(rule.name)
        let value = payload[rule.name]
        if (isBlank(value)) value = rule.defaultValue

        if (isBlank(value)) {
          if (rule.required) {
            throw new Error(`request param missing: ${rule.name}`)
          }
          continue
        }

        if (rule.location === 'header') {
          headerPayload[rule.name] = String(value)
          continue
        }

        if (rule.location === 'query') {
          queryPayload[rule.name] = value
          continue
        }

        bodyPayload[rule.name] = value
      }

      if (rules.length === 0) {
        if (method === 'GET' || method === 'DELETE') {
          Object.assign(queryPayload, payload)
        } else {
          Object.assign(bodyPayload, payload)
        }
      } else {
        for (const [k, v] of Object.entries(payload)) {
          if (consumed.has(k)) continue
          if (method === 'GET' || method === 'DELETE') {
            queryPayload[k] = v
          } else {
            bodyPayload[k] = v
          }
        }
      }

      const baseUrl = trimBase(baseUrlOverride)
      const url = buildHttpUrl(baseUrl, endpoint, queryPayload)

      if (!/^https?:\/\//i.test(url)) {
        throw new Error(`base_url is required unless endpoint is absolute URL. tool=${String(row.toolName ?? '')}`)
      }

      const headers: Record<string, string> = { ...headerPayload }
      if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && !hasHeader(headers, 'content-type')) {
        headers['Content-Type'] = 'application/json'
      }

      const useAccessToken = staticPayload.useAccessToken === true
      if (useAccessToken && ctx.accessToken && !hasHeader(headers, 'authorization')) {
        headers.authorization = `Bearer ${ctx.accessToken}`
      }

      const res = await fetchWithTimeout(
        url,
        {
          method,
          headers,
          ...(method === 'GET' || method === 'DELETE' ? {} : { body: JSON.stringify(bodyPayload) }),
        },
        HTTP_TIMEOUT_MS,
      )

      const text = await res.text().catch(() => '')
      const json = safeJsonParse(text)

      if (!res.ok) {
        throw new Error(`dynamic tool ${res.status}: ${text.slice(0, 300)}`)
      }

      return json?.data ?? json ?? { ok: true }
    },
  }
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
  const dynamicNavigationTool = getDynamicNavigationTool(row)
  if (dynamicNavigationTool) {
    return dynamicNavigationTool
  }

  // query_events 처럼 도메인 정규화가 필요한 툴은
  // 동적 HTTP보다 전용 구현을 우선 적용한다.
  const toolName = String(row.toolName ?? '').trim()
  if (toolName && TOOL_REGISTRY[toolName]) {
    return TOOL_REGISTRY[toolName]
  }

  const dynamicHttpTool = getDynamicHttpTool(row)
  if (dynamicHttpTool) {
    return dynamicHttpTool
  }

  const apiName = String(row.apiName ?? '').trim()
  const method = String(row.method ?? '').trim().toUpperCase()
  const apiMethodKey = `${apiName}::${method}`

  if (TOOL_REGISTRY_BY_API_METHOD[apiMethodKey]) {
    return TOOL_REGISTRY_BY_API_METHOD[apiMethodKey]
  }

  if (apiName && TOOL_REGISTRY[apiName]) {
    return TOOL_REGISTRY[apiName]
  }

  return undefined
}

function resolveToolKind(row: ChatScreenToolEntity, tool: ToolDefinition): 'data' | 'action' | undefined {
  const declared = String(tool?.declaration?.name ?? '').trim()
  if (DATA_TOOL_NAMES.has(declared)) return 'data'

  const kind = String(row.kind ?? '').trim().toLowerCase()
  if (kind === 'data' || kind === 'action') return kind
  return undefined
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

  const screenToolRows = store?.getScreenTools(normalizedRouteKey) ?? []
  const resolvedTools = screenToolRows
    .map((row) => {
      const tool = buildToolFromRow(row)
      if (!tool) return undefined

      const kind = resolveToolKind(row, tool)
      if (!kind) return undefined

      return { kind, tool }
    })
    .filter((item): item is { kind: 'data' | 'action'; tool: ToolDefinition } => Boolean(item))

  const dataTools = resolvedTools
    .filter((item) => item.kind === 'data')
    .map((item) => item.tool)

  const actionTools = resolvedTools
    .filter((item) => item.kind === 'action')
    .map((item) => item.tool)

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
