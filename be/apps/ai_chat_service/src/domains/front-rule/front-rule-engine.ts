import { Logger } from '@nestjs/common'
import type { ChatRuleEntity } from '../../features/chat-settings/db/chat-rule.entity'

const logger = new Logger('FrontRuleEngine')

export type FrontRuleIntent = 'info' | 'action'

export type FrontRuleMatch = {
  routeKey: string
  ruleKey: string
  ruleType: string
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
  captures: string[]
  direction?: string
  graphOperation?: string
}

type FrontRuleContext = {
  screenKey: string
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

const screenRuleCache = new Map<string, ChatRuleEntity[]>()
let lastRouteKey = ''

function describeRuleNames(rows: ChatRuleEntity[] | undefined | null): string {
  if (!rows || rows.length === 0) return 'none'
  return rows.map((row) => `${row.ruleType ?? 'unknown'}:${row.ruleKey ?? 'unknown'}`).join(', ')
}

function screenCacheKey(appKey: string, screenKey: string): string {
  return `${appKey}::${screenKey}`
}

export function clearScreenRuleCache(screenKey?: string): void {
  if (!screenKey) {
    screenRuleCache.clear()
    return
  }

  const normalizedScreenKey = normalize(screenKey)
  for (const key of screenRuleCache.keys()) {
    if (key.endsWith(`::${normalizedScreenKey}`)) screenRuleCache.delete(key)
  }
}

async function getCachedScreenRules(
  appKey: string,
  screenKey: string,
  loadRules: (appKey: string, screenKey: string) => Promise<ChatRuleEntity[]>,
): Promise<ChatRuleEntity[]> {
  const key = screenCacheKey(appKey, screenKey)
  const rules = await loadRules(appKey, screenKey)
  const names = describeRuleNames(rules)
  screenRuleCache.delete(key)
  logger.log(`[front-rule] fresh-load appKey=${appKey} screenKey=${screenKey} key=${key} loaded=${rules.length} names=[${names}] source=db-read`)
  console.log(`[front-rule] fresh-load appKey=${appKey} screenKey=${screenKey} key=${key} loaded=${rules.length} names=[${names}] source=db-read`)
  return rules
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

function normalizeSparseReplyText(value: string, captures: string[]): string {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  const fallback = captures.filter(Boolean).at(-1) ?? ''

  if (!fallback) return collapsed

  if (/^로봇\s+에서\s+태스크플로우\s+.*$/.test(collapsed)) {
    return collapsed.replace(/^로봇\s+에서\s+태스크플로우\s+/, `태스크플로우 ${fallback} `)
  }

  return collapsed
}

function interpolateTemplateValue(value: unknown, message: string, captures: string[]): unknown {
  if (typeof value === 'string') {
    const interpolated = value.replace(/\$message|\$(\d+)/g, (token, captureIndex: string | undefined) => {
      if (token === '$message') return message

      const index = Number(captureIndex)
      if (!Number.isFinite(index) || index < 1) return ''
      return captures[index - 1] ?? ''
    })

    if (value.includes('$1') || value.includes('$2') || value.includes('$3')) {
      return normalizeSparseReplyText(interpolated, captures)
    }

    return interpolated
  }

  if (Array.isArray(value)) {
    // 매칭되지 않은 캡처 그룹(빈 문자열)은 후보 목록에서 제거한다.
    return value
      .map((item) => interpolateTemplateValue(item, message, captures))
      .filter((item) => !(typeof item === 'string' && item === ''))
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

function inferIntent(rule: ChatRuleEntity, meta: FrontRuleTemplateMeta): FrontRuleIntent {
  if (meta.intent) return meta.intent

  const byIntentKey = parseIntent(ruleValue(rule).intent ?? rule.ruleType)
  if (byIntentKey) return byIntentKey

  if (meta.chunkKeys.length > 0) return 'info'

  if (meta.toolName || Object.keys(meta.remainingArgs).length > 0 || Object.keys(meta.toolArgs ?? {}).length > 0) {
    return 'action'
  }

  return 'action'
}

function buildToolArgs(rule: ChatRuleEntity, meta: FrontRuleTemplateMeta, message: string): Record<string, unknown> {
  const base = {
    ...(Object.keys(meta.toolArgs ?? {}).length > 0 ? meta.toolArgs : meta.remainingArgs),
  }

  if (!hasMainFilter(base) && ruleValue(rule).fallbackKeyword === true) {
    base.keyword = message
  }

  return base
}

function isEmptyObject(value: Record<string, unknown> | undefined): boolean {
  if (!value) return true
  return Object.keys(value).length === 0
}

export async function matchFrontRule(
  ctx: FrontRuleContext,
  loadRules: (appKey: string, screenKey: string) => Promise<ChatRuleEntity[]>,
): Promise<FrontRuleMatch | null> {
  const screenKey = normalize(ctx.screenKey)
  const appKey = screenKey.split('/').filter(Boolean)[0] || ''

  if (lastRouteKey && lastRouteKey !== screenKey) {
    screenRuleCache.clear()
    logger.log(`[front-rule] route changed from ${lastRouteKey} -> ${screenKey}; invalidated screen cache`)
    console.log(`[front-rule] route changed from ${lastRouteKey} -> ${screenKey}; invalidated screen cache`)
  }
  lastRouteKey = screenKey

  let rules = await getCachedScreenRules(appKey, screenKey, loadRules)

  if (appKey && screenKey !== appKey) {
    const appRootRules = await getCachedScreenRules(appKey, appKey, loadRules)
    if (appRootRules.length > 0) {
      const merged = [...rules, ...appRootRules]
      const deduped = Array.from(new Map(merged.map((row) => [`${row.appKey}:${row.screenKey}:${row.ruleType}:${row.ruleKey}`, row])).values())
      rules = deduped
    }
  }

  return matchFrontRuleRows(ctx, rules)
}

export function matchFrontRuleRows(
  ctx: FrontRuleContext,
  rules: ChatRuleEntity[],
): FrontRuleMatch | null {
  const message = normalize(ctx.message)
  if (!message) return null

  const screenKey = normalize(ctx.screenKey)
  const appKey = screenKey.split('/').filter(Boolean)[0] || ''

  logger.log(`[front-rule] 규칙 매칭 시작: appKey=${appKey} screenKey=${screenKey} message="${message}" ruleCount=${rules.length}`)

  if (rules.length === 0) {
    logger.warn(`[front-rule] 규칙 없음: appKey=${appKey} screenKey=${screenKey}`)
    return null
  }

  for (const rule of rules) {
    const pattern = patternForRule(rule)
    const regex = canCompileRegex(pattern)
    if (!regex) {
      logger.warn(`[front-rule] 잘못된 규칙 패턴: ruleKey=${rule.ruleKey}`)
      continue
    }

    const matched = message.match(regex)
    if (!matched) continue

    // 정규식 그룹 위치($1, $2, ...)를 그대로 보존해야 템플릿의 $N 치환이 어긋나지 않는다.
    const rawCaptures = matched.slice(1).map((v) => String(v ?? '').trim())
    const captures = rawCaptures.filter(Boolean)
    const interpolatedTemplate = toRecord(interpolateTemplateValue(templateForRule(rule), message, rawCaptures))
    const meta = parseTemplateMeta(interpolatedTemplate)

    const intent = inferIntent(rule, meta)
    const toolName = inferToolName(meta)
    const toolArgs = buildToolArgs(rule, meta, message)

    logger.log(`[front-rule] 규칙 매칭 성공: ruleKey=${rule.ruleKey} intent=${intent}`)

    const graphOperation = normalize(ruleValue(rule).graphOperation) || undefined
    const normalizedRuleType =
      String(rule.ruleType ?? '').trim() === 'taskflow-graph' || graphOperation === 'separate-arrow-lines'
        ? 'taskflow-graph'
        : String(rule.ruleType ?? '').trim()

    return {
      routeKey: rule.screenKey,
      ruleKey: rule.ruleKey,
      ruleType: normalizedRuleType,
      confidence: Number.isFinite(Number(ruleValue(rule).confidence)) ? Number(ruleValue(rule).confidence) : 0.95,
      reason: `front-rule:${rule.ruleKey}`,
      intent,
      toolName,
      toolArgs: isEmptyObject(toolArgs) ? undefined : toolArgs,
      chunkKeys: meta.chunkKeys,
      answerTemplate: meta.answerTemplate,
      fallbackText: meta.fallbackText,
      chatAction: meta.chatAction,
      chatActionParam: isEmptyObject(meta.chatActionParam) ? undefined : meta.chatActionParam,
      captures,
      direction: normalize(ruleValue(rule).direction) || undefined,
      graphOperation,
    }
  }

  logger.warn(`[front-rule] 규칙 미매칭: screenKey=${screenKey} message="${message}"`)
  return null
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ruleValue(rule: ChatRuleEntity): Record<string, unknown> {
  return toRecord(rule.valueJson)
}

const ARROW_SEPARATOR = '(?:->|=>|→|⇒)'

function taskflowArrowChainPattern(): string {
  return '^\\s*(?:' +
    '[^\\r\\n]+(?:\\s*(?:->|=>|→|⇒)\\s*[^\\r\\n]+)+' +
    '|(?:\\s*(?:->|=>|→|⇒)\\s*[^\\r\\n]+(?:\\s*(?:->|=>|→|⇒)\\s*[^\\r\\n]+)*)' +
    ')\\s*$'
}

function isTaskflowArrowMessage(value: string): boolean {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return false
  return new RegExp(taskflowArrowChainPattern(), 'i').test(trimmed)
}

/** "A->B", "A->B->C" 같은 자리표시자 패턴을 노드명 캡처 정규식으로 바꾼다. */
function buildPatternFromTemplate(template: string): string | null {
  const parts = template
    .split(/->|=>|→|⇒/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 2) return null
  if (!parts.every((part) => /^[A-Z]$/.test(part))) return null

  const capture = '\\s*([^\\s][^-=→⇒]*?)\\s*'
  const chain = Array.from({ length: parts.length - 1 }, () => `${ARROW_SEPARATOR}${capture}`).join('')
  const tail = parts.length === 2 ? `(?!${ARROW_SEPARATOR})` : ''
  return `^${capture}${chain}${tail}\\s*$`
}

function patternForRule(rule: ChatRuleEntity): string {
  const value = ruleValue(rule)

  const explicitRegex = normalize(value.patternRegex ?? value.regex)
  if (explicitRegex) return explicitRegex

  const patternTemplate = normalize(value.pattern)
  if (patternTemplate) {
    const built = buildPatternFromTemplate(patternTemplate)
    if (built) return built
    return escapeRegex(patternTemplate)
  }

  if (normalize(value.graphOperation) === 'separate-arrow-lines' || String(rule.ruleType ?? '').trim() === 'taskflow-graph') {
    return taskflowArrowChainPattern()
  }

  const aliases = toStringArray(value.aliases)
  if (aliases.length > 0) return `^(?:${aliases.map(escapeRegex).join('|')})$`
  return escapeRegex(rule.ruleKey)
}

function templateForRule(rule: ChatRuleEntity): Record<string, unknown> {
  const value = ruleValue(rule)
  return toRecord(value.filtersTemplate ?? value.toolArgs ?? value)
}
