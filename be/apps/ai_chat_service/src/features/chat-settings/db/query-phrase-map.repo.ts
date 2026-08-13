import { Logger } from '@nestjs/common'
import { Pool } from 'pg'

const logger = new Logger('QueryPhraseMapRepo')

let pool: Pool | null = null

function getPool(): Pool | null {
  if (pool) return pool

  const connectionString = String(process.env.DB_URL_AI_CHAT_SERVICE ?? '').trim()
  if (!connectionString) {
    logger.warn('[phrase-map] DB_URL_AI_CHAT_SERVICE is missing; phrase map disabled')
    return null
  }

  pool = new Pool({ connectionString, max: 3 })
  return pool
}

export function normalizePhrase(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

export type PhraseMapMatch = {
  routeKey: string
  phrase: string
  phraseNorm: string
  intentKey: string
  filtersTemplate: Record<string, unknown>
  matchType?: 'exact' | 'contains'
}

export async function findPhraseMapMatch(
  routeKey: string,
  rawMessage: string,
): Promise<PhraseMapMatch | null> {
  const db = getPool()
  if (!db) return null

  const normalized = normalizePhrase(rawMessage)
  if (!normalized) return null

  try {
    const exactRes = await db.query(
      `
      SELECT
        route_key AS "routeKey",
        phrase,
        phrase_norm AS "phraseNorm",
        intent_key AS "intentKey",
        filters_template AS "filtersTemplate"
      FROM chat_query_phrase_map
      WHERE route_key = $1
        AND phrase_norm = $2
        AND enabled = true
      ORDER BY priority ASC, id ASC
      LIMIT 1
      `,
      [routeKey, normalized],
    )

    const toMatch = (row: any, matchType: 'exact' | 'contains'): PhraseMapMatch => ({
      routeKey: String(row?.routeKey ?? '').trim(),
      phrase: String(row?.phrase ?? '').trim(),
      phraseNorm: String(row?.phraseNorm ?? '').trim(),
      intentKey: String(row?.intentKey ?? '').trim(),
      filtersTemplate:
        row?.filtersTemplate && typeof row.filtersTemplate === 'object' && !Array.isArray(row.filtersTemplate)
          ? (row.filtersTemplate as Record<string, unknown>)
          : {},
      matchType,
    })

    if (exactRes.rows.length > 0) {
      return toMatch(exactRes.rows[0], 'exact')
    }

    // exact 매칭 실패 시 포함 매칭으로 보완.
    // 1) phrase_norm 이 사용자 입력에 포함되는 경우
    // 2) 사용자 입력이 phrase_norm 에 포함되는 경우
    const containsRes = await db.query(
      `
      SELECT
        route_key AS "routeKey",
        phrase,
        phrase_norm AS "phraseNorm",
        intent_key AS "intentKey",
        filters_template AS "filtersTemplate"
      FROM chat_query_phrase_map
      WHERE route_key = $1
        AND enabled = true
        AND ($2 LIKE '%' || phrase_norm || '%' OR phrase_norm LIKE '%' || $2 || '%')
      ORDER BY priority ASC, length(phrase_norm) DESC, id ASC
      LIMIT 1
      `,
      [routeKey, normalized],
    )

    if (containsRes.rows.length > 0) {
      return toMatch(containsRes.rows[0], 'contains')
    }

    return null
  } catch (e: any) {
    logger.warn(`[phrase-map] lookup failed: ${e?.message ?? String(e)}`)
    return null
  }
}
