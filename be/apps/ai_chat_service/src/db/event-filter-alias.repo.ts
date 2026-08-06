import { Logger } from '@nestjs/common'
import { Pool } from 'pg'

const logger = new Logger('EventFilterAliasRepo')

let pool: Pool | null = null

export type EventAliasType = 'period' | 'severity' | 'status'

export type EventFilterAliasRow = {
  aliasType: EventAliasType
  sourcePattern: string
  normalizedValue: string
  matchMode: 'exact' | 'contains' | 'regex'
  enabled: boolean
  priority: number
}

const EVENT_ALIAS_LEGACY_PREFIX = 'eventFilterAliases'

function getPool(): Pool | null {
  if (pool) return pool

  const connectionString = String(process.env.DB_URL_AI_CHAT_SERVICE ?? '').trim()
  if (!connectionString) {
    logger.warn('[event-filter-alias] DB_URL_AI_CHAT_SERVICE is missing; alias db disabled')
    return null
  }

  pool = new Pool({ connectionString, max: 3 })
  return pool
}

function normalizeScope(scope: unknown): string {
  const normalized = String(scope ?? '').trim()
  return normalized || 'common'
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return fallback
}

function normalizeAliasType(value: unknown): EventAliasType | null {
  const type = String(value ?? '').trim().toLowerCase()
  if (type === 'period' || type === 'severity' || type === 'status') return type
  return null
}

function normalizeMatchMode(value: unknown): 'exact' | 'contains' | 'regex' {
  const mode = String(value ?? '').trim().toLowerCase()
  if (mode === 'exact' || mode === 'contains' || mode === 'regex') return mode
  return 'contains'
}

function normalizeAliasRow(aliasType: EventAliasType, raw: unknown): EventFilterAliasRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>

  const sourcePattern = String(row.sourcePattern ?? '').trim()
  const normalizedValue = String(row.normalizedValue ?? '').trim()
  if (!sourcePattern || !normalizedValue) return null

  return {
    aliasType,
    sourcePattern,
    normalizedValue,
    matchMode: normalizeMatchMode(row.matchMode),
    enabled: toBoolean(row.enabled, true),
    priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : 100,
  }
}

export function parseLegacyEventAliasSettingKey(rawKey: string): { scopeKey: string; aliasType: EventAliasType } | null {
  const key = String(rawKey ?? '').trim()
  if (!key.startsWith(`${EVENT_ALIAS_LEGACY_PREFIX}.`)) return null

  const suffix = key.slice(`${EVENT_ALIAS_LEGACY_PREFIX}.`.length)
  const dotIndex = suffix.lastIndexOf('.')
  if (dotIndex <= 0) return null

  const scopeKey = normalizeScope(suffix.slice(0, dotIndex))
  const aliasType = normalizeAliasType(suffix.slice(dotIndex + 1))
  if (!aliasType) return null

  return { scopeKey, aliasType }
}

export function buildLegacyEventAliasSettingKey(scopeKey: string, aliasType: EventAliasType): string {
  return `${EVENT_ALIAS_LEGACY_PREFIX}.${normalizeScope(scopeKey)}.${aliasType}`
}

export async function listEventFilterAliases(scopeKey: string, aliasType: EventAliasType): Promise<EventFilterAliasRow[]> {
  const db = getPool()
  if (!db) return []

  const normalizedScope = normalizeScope(scopeKey)
  if (!normalizedScope || normalizedScope === 'common') return []
  try {
    const res = await db.query(
      `
      SELECT
        alias_type AS "aliasType",
        source_pattern AS "sourcePattern",
        normalized_value AS "normalizedValue",
        match_mode AS "matchMode",
        enabled,
        priority
      FROM public.chat_event_filter_alias
      WHERE route_key = $1
        AND alias_type = $2
        AND enabled = true
      ORDER BY priority DESC, updated_at DESC, id DESC
      `,
      [normalizedScope, aliasType],
    )

    return res.rows
      .map((row: any) => normalizeAliasRow(aliasType, row))
      .filter((row): row is EventFilterAliasRow => Boolean(row))
  } catch (e: any) {
    logger.warn(`[event-filter-alias] list failed: ${e?.message ?? String(e)}`)
    return []
  }
}

export async function listAllEventFilterAliasesByScope(): Promise<Record<string, Record<EventAliasType, EventFilterAliasRow[]>>> {
  const db = getPool()
  if (!db) return {}

  try {
    const res = await db.query(
      `
      SELECT
        route_key AS "routeKey",
        alias_type AS "aliasType",
        source_pattern AS "sourcePattern",
        normalized_value AS "normalizedValue",
        match_mode AS "matchMode",
        enabled,
        priority
      FROM public.chat_event_filter_alias
      ORDER BY route_key ASC, alias_type ASC, priority DESC, updated_at DESC, id DESC
      `,
    )

    const grouped: Record<string, Record<EventAliasType, EventFilterAliasRow[]>> = {}
    for (const raw of res.rows) {
      const scope = normalizeScope(raw?.routeKey)
      const type = normalizeAliasType(raw?.aliasType)
      if (!type) continue
      const row = normalizeAliasRow(type, raw)
      if (!row) continue

      if (!grouped[scope]) {
        grouped[scope] = {
          period: [],
          severity: [],
          status: [],
        }
      }

      grouped[scope][type].push(row)
    }

    return grouped
  } catch (e: any) {
    logger.warn(`[event-filter-alias] listAll failed: ${e?.message ?? String(e)}`)
    return {}
  }
}

export async function replaceEventFilterAliases(scopeKey: string, aliasType: EventAliasType, rows: unknown): Promise<boolean> {
  const db = getPool()
  if (!db) return false

  const routeKey = normalizeScope(scopeKey)
  const list = Array.isArray(rows)
    ? rows.map((row) => normalizeAliasRow(aliasType, row)).filter((row): row is EventFilterAliasRow => Boolean(row))
    : []

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `
      DELETE FROM public.chat_event_filter_alias
      WHERE route_key = $1
        AND alias_type = $2
      `,
      [routeKey, aliasType],
    )

    for (const row of list) {
      await client.query(
        `
        INSERT INTO public.chat_event_filter_alias (
          route_key,
          alias_type,
          source_pattern,
          normalized_value,
          match_mode,
          enabled,
          priority,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `,
        [routeKey, aliasType, row.sourcePattern, row.normalizedValue, row.matchMode, row.enabled, row.priority],
      )
    }

    await client.query('COMMIT')
    return true
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => undefined)
    logger.warn(`[event-filter-alias] replace failed scope=${routeKey} type=${aliasType}: ${e?.message ?? String(e)}`)
    return false
  } finally {
    client.release()
  }
}