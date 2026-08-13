import { listEventRules, type EventRuleRow } from '../../features/chat-settings/db/event-rule.repo'

export type FrontRuleIntent = 'info' | 'action'

export type FrontRuleMatch = {
  routeKey: string
  ruleKey: string
  confidence: number
  reason: string
  intent: FrontRuleIntent
  toolName?: string
  toolArgs?: Record<string, unknown>
  chunkKeys: string[]
  answerTemplate?: string
  fallbackText?: string
  chatAction?: string
  chatActionParam?: Record<string, unknown>
}

type FrontRuleContext = {
  routeKey: string
  message: string
}

type FrontRuleTemplateMeta = {
  intent?: FrontRuleIntent
  toolName?: string
  toolArgs?: Record<string, unknown>
  chunkKeys: string[]
  answerTemplate?: string
  fallbackText?: string
  chatAction?: string
  chatActionParam?: Record<string, unknown>
  remainingArgs: Record<string, unknown>
}

const META_KEYS = new Set([
  'intent',
  'toolName',
  'toolArgs',
  'ragChunkKeys',
  'chunkKeys',
  'answerTemplate',
  'fallbackText',
  'chatAction',
  'chatActionParam',
])

function normalize(value: unknown): string {
  return String(value ?? '').trim()
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean)))
  }

  const single = String(value ?? '').trim()
  return single ? [single] : []
}

function canCompileRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, 'i')
  } catch {
    return null
  }
}

function interpolateTemplateValue(value: unknown, message: string, captures: string[]): unknown {
  if (typeof value === 'string') {
    if (value === '$message') return message

    const captureMatch = value.match(/^\$(\d+)$/)
    if (captureMatch) {
      const index = Number(captureMatch[1])
      return captures[index - 1] ?? ''
    }

    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateTemplateValue(item, message, captures))
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(source)) {
      out[k] = interpolateTemplateValue(v, message, captures)
    }
    return out
  }

  return value
}

function hasMainFilter(toolArgs: Record<string, unknown>): boolean {
  const keys = ['period', 'start', 'end', 'severity', 'func', 'status']
  return keys.some((key) => {
    const value = toolArgs[key]
    if (value === undefined || value === null) return false
    return String(value).trim() !== ''
  })
}

function inferToolName(meta: FrontRuleTemplateMeta): string | undefined {
  if (meta.toolName) return meta.toolName

  if (hasMainFilter(meta.toolArgs ?? {}) || hasMainFilter(meta.remainingArgs)) {
    return 'query_events'
  }

  return undefined
}

function parseIntent(rawIntent: unknown): FrontRuleIntent | undefined {
  const normalized = String(rawIntent ?? '').trim().toLowerCase()
  if (normalized === 'info' || normalized === 'action') return normalized
  return undefined
}

function parseTemplateMeta(template: Record<string, unknown>): FrontRuleTemplateMeta {
  const chunkKeys = [
    ...toStringArray(template.chunkKeys),
    ...toStringArray(template.ragChunkKeys),
  ]

  const remainingArgs: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(template)) {
    if (META_KEYS.has(k)) continue
    remainingArgs[k] = v
  }

  return {
    intent: parseIntent(template.intent),
    toolName: normalize(template.toolName) || undefined,
    toolArgs: toRecord(template.toolArgs),
    chunkKeys: Array.from(new Set(chunkKeys)),
    answerTemplate: normalize(template.answerTemplate) || undefined,
    fallbackText: normalize(template.fallbackText) || undefined,
    chatAction: normalize(template.chatAction) || undefined,
    chatActionParam: toRecord(template.chatActionParam),
    remainingArgs,
  }
}

function inferIntent(rule: EventRuleRow, meta: FrontRuleTemplateMeta): FrontRuleIntent {
  if (meta.intent) return meta.intent

  const byIntentKey = parseIntent(rule.intentKey)
  if (byIntentKey) return byIntentKey

  if (meta.chunkKeys.length > 0) return 'info'

  if (meta.toolName || Object.keys(meta.remainingArgs).length > 0 || Object.keys(meta.toolArgs ?? {}).length > 0) {
    return 'action'
  }

  return 'action'
}

function buildToolArgs(rule: EventRuleRow, meta: FrontRuleTemplateMeta, message: string): Record<string, unknown> {
  const base = {
    ...(Object.keys(meta.toolArgs ?? {}).length > 0 ? meta.toolArgs : meta.remainingArgs),
  }

  if (!hasMainFilter(base) && rule.fallbackKeyword) {
    base.keyword = message
  }

  return base
}

function isEmptyObject(value: Record<string, unknown> | undefined): boolean {
  if (!value) return true
  return Object.keys(value).length === 0
}

export async function matchFrontRule(ctx: FrontRuleContext): Promise<FrontRuleMatch | null> {
  const message = normalize(ctx.message)
  if (!message) return null

  const rules = await listEventRules(ctx.routeKey)
  if (rules.length === 0) return null

  for (const rule of rules) {
    const regex = canCompileRegex(rule.patternRegex)
    if (!regex) continue

    const matched = message.match(regex)
    if (!matched) continue

    const captures = matched.slice(1).map((v) => String(v ?? '').trim())
    const interpolatedTemplate = toRecord(interpolateTemplateValue(rule.filtersTemplate, message, captures))
    const meta = parseTemplateMeta(interpolatedTemplate)

    const intent = inferIntent(rule, meta)
    const toolName = inferToolName(meta)
    const toolArgs = buildToolArgs(rule, meta, message)

    return {
      routeKey: rule.routeKey,
      ruleKey: rule.ruleKey,
      confidence: Number.isFinite(Number(rule.confidence)) ? Number(rule.confidence) : 0.95,
      reason: `front-rule:${rule.ruleKey}`,
      intent,
      toolName,
      toolArgs: isEmptyObject(toolArgs) ? undefined : toolArgs,
      chunkKeys: meta.chunkKeys,
      answerTemplate: meta.answerTemplate,
      fallbackText: meta.fallbackText,
      chatAction: meta.chatAction,
      chatActionParam: isEmptyObject(meta.chatActionParam) ? undefined : meta.chatActionParam,
    }
  }

  return null
}
