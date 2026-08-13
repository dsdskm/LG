import { Logger } from '@nestjs/common'
import { Pool } from 'pg'

const logger = new Logger('EventRuleRepo')

let pool: Pool | null = null

export type EventRuleRow = {
  routeKey: string
  ruleKey: string
  intentKey: string
  patternRegex: string
  filtersTemplate: Record<string, unknown>
  fallbackKeyword: boolean
  enabled: boolean
  priority: number
  confidence: number
}

function getPool(): Pool | null {
  if (pool) return pool

  const connectionString = String(process.env.DB_URL_AI_CHAT_SERVICE ?? '').trim()
  if (!connectionString) {
    logger.warn('[event-rule] DB_URL_AI_CHAT_SERVICE is missing; event rule db disabled')
    return null
  }

  pool = new Pool({ connectionString, max: 3 })
  return pool
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return fallback
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export async function listEventRules(routeKey: string): Promise<EventRuleRow[]> {
  const db = getPool()
  if (!db) return []

  const normalizedRouteKey = String(routeKey ?? '').trim()
  if (!normalizedRouteKey) return []

  try {
    const res = await db.query(
      `
      SELECT
        route_key AS "routeKey",
        rule_key AS "ruleKey",
        intent_key AS "intentKey",
        pattern_regex AS "patternRegex",
        filters_template AS "filtersTemplate",
        fallback_keyword AS "fallbackKeyword",
        enabled,
        priority,
        confidence
      FROM public.chat_event_rule
      WHERE route_key = $1
        AND enabled = true
      ORDER BY priority DESC, updated_at DESC, id DESC
      `,
      [normalizedRouteKey],
    )

    return res.rows
      .map((row: any) => ({
        routeKey: String(row?.routeKey ?? '').trim(),
        ruleKey: String(row?.ruleKey ?? '').trim(),
        intentKey: String(row?.intentKey ?? '').trim(),
        patternRegex: String(row?.patternRegex ?? '').trim(),
        filtersTemplate: toRecord(row?.filtersTemplate),
        fallbackKeyword: toBoolean(row?.fallbackKeyword),
        enabled: toBoolean(row?.enabled, true),
        priority: Number(row?.priority ?? 0),
        confidence: Number.isFinite(Number(row?.confidence)) ? Number(row?.confidence) : 0.95,
      }))
      .filter((row) => row.ruleKey && row.patternRegex)
      .sort((a, b) => {
        const byPriority = Number(b.priority) - Number(a.priority)
        if (byPriority !== 0) return byPriority
        const byConfidence = Number(b.confidence) - Number(a.confidence)
        if (byConfidence !== 0) return byConfidence
        return String(b.patternRegex).length - String(a.patternRegex).length
      })
  } catch (e: any) {
    logger.warn(`[event-rule] list failed: ${e?.message ?? String(e)}`)
    return []
  }
}