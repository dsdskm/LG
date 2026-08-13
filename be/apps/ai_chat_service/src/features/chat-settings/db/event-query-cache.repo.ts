import { createHash } from 'crypto'
import { Logger } from '@nestjs/common'
import { Pool } from 'pg'

const logger = new Logger('EventQueryCacheRepo')
const CACHE_TABLE = 'chat_event_query_cache'

let pool: Pool | null = null

function getPool(): Pool | null {
  if (pool) return pool

  const connectionString = String(process.env.DB_URL_AI_CHAT_SERVICE ?? '').trim()
  if (!connectionString) {
    logger.warn('[cache] DB_URL_AI_CHAT_SERVICE is missing; event query cache disabled')
    return null
  }

  pool = new Pool({ connectionString, max: 3 })
  return pool
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return `[${value.map((v) => stableSerialize(v)).join(',')}]`
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b))
    const inner = keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(',')
    return `{${inner}}`
  }
  return JSON.stringify(value)
}

export function buildEventQueryCacheKey(input: {
  routeKey: string
  eventAnalyzerUrl?: string
  scope?: Record<string, unknown>
  filters: {
    start: string
    end: string
    severity?: string
    func?: string
    status?: string
    keyword?: string
  }
  accessToken?: string
}): string {
  const tokenDigest = input.accessToken
    ? createHash('sha1').update(String(input.accessToken)).digest('hex').slice(0, 16)
    : undefined

  const raw = stableSerialize({
    routeKey: input.routeKey,
    eventAnalyzerUrl: input.eventAnalyzerUrl ?? '',
    scope: input.scope ?? {},
    filters: input.filters,
    tokenDigest,
  })

  return createHash('sha1').update(raw).digest('hex')
}

export async function getEventQueryCache<T>(cacheKey: string): Promise<T | null> {
  const db = getPool()
  if (!db) return null

  try {
    const hit = await db.query(
      `SELECT payload FROM ${CACHE_TABLE} WHERE cache_key = $1 AND expires_at > NOW() LIMIT 1`,
      [cacheKey],
    )

    if (!hit.rows.length) return null

    void db.query(
      `UPDATE ${CACHE_TABLE} SET hit_count = hit_count + 1, last_hit_at = NOW(), updated_at = NOW() WHERE cache_key = $1`,
      [cacheKey],
    ).catch((e) => logger.warn(`[cache] update hit_count failed: ${String((e as Error)?.message ?? e)}`))

    return (hit.rows[0]?.payload ?? null) as T | null
  } catch (e: any) {
    logger.warn(`[cache] read failed: ${e?.message ?? String(e)}`)
    return null
  }
}

export async function setEventQueryCache(
  cacheKey: string,
  routeKey: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  const db = getPool()
  if (!db) return

  const normalizedTtl = Number.isFinite(ttlSeconds) ? Math.max(10, Math.min(3600, Math.floor(ttlSeconds))) : 60

  try {
    await db.query(
      `
      INSERT INTO ${CACHE_TABLE} (cache_key, route_key, payload, expires_at, hit_count, last_hit_at, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW() + ($4 || ' seconds')::interval, 0, NULL, NOW(), NOW())
      ON CONFLICT (cache_key) DO UPDATE
      SET
        route_key = EXCLUDED.route_key,
        payload = EXCLUDED.payload,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      `,
      [cacheKey, routeKey, JSON.stringify(payload ?? {}), String(normalizedTtl)],
    )
  } catch (e: any) {
    logger.warn(`[cache] write failed: ${e?.message ?? String(e)}`)
  }
}
