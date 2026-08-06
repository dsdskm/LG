import { Logger } from '@nestjs/common'
import { Pool } from 'pg'

const logger = new Logger('EventRuleAdminRepo')

let pool: Pool | null = null

export type EventRuleAdminRow = {
  ruleKey: string
  intentKey: string
  patternRegex: string
  filtersTemplate: Record<string, unknown>
  fallbackKeyword: boolean
  enabled: boolean
  priority: number
  confidence: number
}

const EVENT_RULE_LEGACY_PREFIX = 'eventRules'

function getPool(): Pool | null {
  if (pool) return pool

  const connectionString = String(process.env.DB_URL_AI_CHAT_SERVICE ?? '').trim()
  if (!connectionString) {
    logger.warn('[event-rule-admin] DB_URL_AI_CHAT_SERVICE is missing; event rule db disabled')
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

function normalizeScope(scope: unknown): string {
  const normalized = String(scope ?? '').trim()
  return normalized || 'common'
}

function normalizeRuleRow(raw: unknown): EventRuleAdminRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>

  const ruleKey = String(row.ruleKey ?? '').trim()
  const patternRegex = String(row.patternRegex ?? '').trim()
  if (!ruleKey || !patternRegex) return null

  const confidenceRaw = Number(row.confidence)
  const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : 0.95

  return {
    ruleKey,
    intentKey: String(row.intentKey ?? 'ailog-event-query').trim() || 'ailog-event-query',
    patternRegex,
    filtersTemplate: toRecord(row.filtersTemplate),
    fallbackKeyword: toBoolean(row.fallbackKeyword, false),
    enabled: toBoolean(row.enabled, true),
    priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : 100,
    confidence,
  }
}

export function parseLegacyEventRuleSettingKey(rawKey: string): { scopeKey: string } | null {
  const key = String(rawKey ?? '').trim()
  if (!key.startsWith(`${EVENT_RULE_LEGACY_PREFIX}.`)) return null
  const scopeKey = normalizeScope(key.slice(`${EVENT_RULE_LEGACY_PREFIX}.`.length))
  return { scopeKey }
}

export function buildLegacyEventRuleSettingKey(scopeKey: string): string {
  return `${EVENT_RULE_LEGACY_PREFIX}.${normalizeScope(scopeKey)}`
}

export async function listAllEventRuleRowsByScope(): Promise<Record<string, EventRuleAdminRow[]>> {
  const db = getPool()
  if (!db) return {}

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
      ORDER BY route_key ASC, priority DESC, updated_at DESC, id DESC
      `,
    )

    const grouped: Record<string, EventRuleAdminRow[]> = {}
    for (const raw of res.rows) {
      const routeKey = normalizeScope(raw?.routeKey)
      const row = normalizeRuleRow(raw)
      if (!row) continue
      if (!grouped[routeKey]) grouped[routeKey] = []
      grouped[routeKey].push(row)
    }

    return grouped
  } catch (e: any) {
    logger.warn(`[event-rule-admin] list failed: ${e?.message ?? String(e)}`)
    return {}
  }
}

export async function replaceEventRulesByScope(scopeKey: string, rows: unknown): Promise<boolean> {
  const db = getPool()
  if (!db) return false

  const routeKey = normalizeScope(scopeKey)
  const list = Array.isArray(rows)
    ? rows.map((row) => normalizeRuleRow(row)).filter((row): row is EventRuleAdminRow => Boolean(row))
    : []

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `
      DELETE FROM public.chat_event_rule
      WHERE route_key = $1
      `,
      [routeKey],
    )

    for (const row of list) {
      await client.query(
        `
        INSERT INTO public.chat_event_rule (
          route_key,
          rule_key,
          intent_key,
          pattern_regex,
          filters_template,
          parse_date_range,
          parse_period,
          parse_severity,
          parse_func,
          parse_status,
          fallback_keyword,
          enabled,
          priority,
          confidence,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, false, false, false, false, false, $6, $7, $8, $9, NOW(), NOW())
        `,
        [
          routeKey,
          row.ruleKey,
          row.intentKey,
          row.patternRegex,
          JSON.stringify(row.filtersTemplate ?? {}),
          row.fallbackKeyword,
          row.enabled,
          row.priority,
          row.confidence,
        ],
      )
    }

    await client.query('COMMIT')
    return true
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => undefined)
    logger.warn(`[event-rule-admin] replace failed scope=${routeKey}: ${e?.message ?? String(e)}`)
    return false
  } finally {
    client.release()
  }
}