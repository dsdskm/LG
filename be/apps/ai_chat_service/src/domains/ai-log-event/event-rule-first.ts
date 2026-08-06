import { listEventRules, type EventRuleRow } from '../../db/event-rule.repo'
import type { PhraseMapMatch } from '../../db/query-phrase-map.repo'

export type EventRuleType =
  | 'db-rule'
  | 'phrase-map'

export type EventRuleMatch = {
  type: EventRuleType
  confidence: number
  normalizedMessage: string
  reason: string
  toolArgs: {
    period?: string
    start?: string
    end?: string
    func?: string
    keyword?: string
  }
}

type EventRuleContext = {
  routeKey: string
  message: string
  phraseMatch: PhraseMapMatch | null
}

function normalize(value: unknown): string {
  return String(value ?? '').trim()
}

function toStringRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function hasMainFilter(toolArgs: Record<string, unknown>): boolean {
  const keys = ['period', 'start', 'end', 'severity', 'func', 'status']
  return keys.some((key) => {
    const value = toolArgs[key]
    if (value === undefined || value === null) return false
    return String(value).trim() !== ''
  })
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

function buildToolArgsByRule(rule: EventRuleRow, message: string, captures: string[]): Record<string, unknown> {
  const template = toStringRecord(interpolateTemplateValue(rule.filtersTemplate, message, captures))
  const toolArgs: Record<string, unknown> = {
    ...template,
  }

  if (!hasMainFilter(toolArgs) && rule.fallbackKeyword) {
    toolArgs.keyword = message
  }

  return toolArgs
}

export async function matchAiLogEventRule(ctx: EventRuleContext): Promise<EventRuleMatch | null> {
  const message = normalize(ctx.message)
  if (!message) return null

  if (ctx.phraseMatch) {
    const phraseToolArgs = toStringRecord(ctx.phraseMatch.filtersTemplate)

    return {
      type: 'phrase-map',
      confidence: 0.99,
      normalizedMessage: message,
      reason: `phrase-map:${ctx.phraseMatch.matchType ?? 'exact'}`,
      toolArgs: phraseToolArgs as EventRuleMatch['toolArgs'],
    }
  }

  const rules = await listEventRules(ctx.routeKey)
  if (rules.length === 0) return null

  const matchedCandidates: Array<{ rule: EventRuleRow; captures: string[] }> = []

  for (const rule of rules) {
    const regex = canCompileRegex(rule.patternRegex)
    if (!regex) continue
    const matched = message.match(regex)
    if (!matched) continue
    const captures = matched.slice(1).map((v) => String(v ?? '').trim())
    matchedCandidates.push({ rule, captures })
  }

  if (matchedCandidates.length === 0) return null

  matchedCandidates.sort((left, right) => {
    const byPriority = Number(right.rule.priority) - Number(left.rule.priority)
    if (byPriority !== 0) return byPriority

    const byConfidence = Number(right.rule.confidence) - Number(left.rule.confidence)
    if (byConfidence !== 0) return byConfidence

    return String(right.rule.patternRegex).length - String(left.rule.patternRegex).length
  })

  const selected = matchedCandidates[0]
  const toolArgs = buildToolArgsByRule(selected.rule, message, selected.captures)

  return {
    type: 'db-rule',
    confidence: Number.isFinite(Number(selected.rule.confidence)) ? Number(selected.rule.confidence) : 0.95,
    normalizedMessage: message,
    reason: `db-rule:${selected.rule.ruleKey}`,
    toolArgs: toolArgs as EventRuleMatch['toolArgs'],
  }
}
