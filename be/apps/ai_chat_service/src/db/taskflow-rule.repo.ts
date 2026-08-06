import { Logger } from '@nestjs/common'
import { Pool } from 'pg'

const logger = new Logger('TaskflowRuleRepo')

let pool: Pool | null = null

export type TaskflowRuleType = 'language' | 'classifier' | 'orchestrator'

export type TaskflowRuleRow = {
  ruleType: TaskflowRuleType
  scopeKey: string
  ruleKey: string
  valueJson: unknown
  enabled: boolean
  priority: number
}

const LEGACY_PREFIX_TO_RULE_TYPE: Record<string, TaskflowRuleType> = {
  taskflowLanguageRules: 'language',
  taskflowClassifierRules: 'classifier',
  taskflowOrchestratorRules: 'orchestrator',
}

const RULE_TYPE_TO_LEGACY_PREFIX: Record<TaskflowRuleType, string> = {
  language: 'taskflowLanguageRules',
  classifier: 'taskflowClassifierRules',
  orchestrator: 'taskflowOrchestratorRules',
}

function getPool(): Pool | null {
  if (pool) return pool

  const connectionString = String(process.env.DB_URL_AI_CHAT_SERVICE ?? '').trim()
  if (!connectionString) {
    logger.warn('[taskflow-rule] DB_URL_AI_CHAT_SERVICE is missing; taskflow rule db disabled')
    return null
  }

  pool = new Pool({ connectionString, max: 3 })
  return pool
}

function normalizeScopeKey(value: unknown): string {
  const normalized = String(value ?? '').trim()
  return normalized || 'common'
}

function normalizeRuleKey(value: unknown): string {
  return String(value ?? '').trim()
}

export function parseLegacyTaskflowSettingKey(rawKey: string): {
  ruleType: TaskflowRuleType
  scopeKey: string
  ruleKey: string
} | null {
  const key = String(rawKey ?? '').trim()
  if (!key) return null

  const tokens = key.split('.')
  if (tokens.length < 3) return null

  const prefix = tokens[0]
  const ruleType = LEGACY_PREFIX_TO_RULE_TYPE[prefix]
  if (!ruleType) return null

  const ruleKey = normalizeRuleKey(tokens[tokens.length - 1])
  const scopeKey = normalizeScopeKey(tokens.slice(1, -1).join('.'))
  if (!ruleKey || !scopeKey) return null

  return {
    ruleType,
    scopeKey,
    ruleKey,
  }
}

export function buildLegacyTaskflowSettingKey(ruleType: TaskflowRuleType, scopeKey: string, ruleKey: string): string {
  const prefix = RULE_TYPE_TO_LEGACY_PREFIX[ruleType]
  return `${prefix}.${normalizeScopeKey(scopeKey)}.${normalizeRuleKey(ruleKey)}`
}

export async function listTaskflowRuleRows(ruleType: TaskflowRuleType, scopes: string[]): Promise<TaskflowRuleRow[]> {
  const db = getPool()
  if (!db) return []

  const normalizedScopes = Array.from(new Set(scopes.map((scope) => normalizeScopeKey(scope)).filter(Boolean)))
  if (normalizedScopes.length === 0) return []

  try {
    const res = await db.query(
      `
      SELECT
        rule_type AS "ruleType",
        scope_key AS "scopeKey",
        rule_key AS "ruleKey",
        value_json AS "valueJson",
        enabled,
        priority
      FROM public.chat_taskflow_rule
      WHERE rule_type = $1
        AND scope_key = ANY($2)
        AND enabled = true
      ORDER BY priority DESC, updated_at DESC, id DESC
      `,
      [ruleType, normalizedScopes],
    )

    return res.rows.map((row: any) => ({
      ruleType,
      scopeKey: normalizeScopeKey(row?.scopeKey),
      ruleKey: normalizeRuleKey(row?.ruleKey),
      valueJson: row?.valueJson,
      enabled: Boolean(row?.enabled),
      priority: Number(row?.priority ?? 0),
    }))
  } catch (e: any) {
    logger.warn(`[taskflow-rule] list failed: ${e?.message ?? String(e)}`)
    return []
  }
}

export async function listAllTaskflowRuleRows(): Promise<TaskflowRuleRow[]> {
  const db = getPool()
  if (!db) return []

  try {
    const res = await db.query(
      `
      SELECT
        rule_type AS "ruleType",
        scope_key AS "scopeKey",
        rule_key AS "ruleKey",
        value_json AS "valueJson",
        enabled,
        priority
      FROM public.chat_taskflow_rule
      WHERE enabled = true
      ORDER BY rule_type ASC, scope_key ASC, priority DESC, updated_at DESC, id DESC
      `,
    )

    return res.rows
      .map((row: any) => {
        const ruleType = String(row?.ruleType ?? '').trim() as TaskflowRuleType
        if (!ruleType || !(ruleType in RULE_TYPE_TO_LEGACY_PREFIX)) return null

        return {
          ruleType,
          scopeKey: normalizeScopeKey(row?.scopeKey),
          ruleKey: normalizeRuleKey(row?.ruleKey),
          valueJson: row?.valueJson,
          enabled: Boolean(row?.enabled),
          priority: Number(row?.priority ?? 0),
        } satisfies TaskflowRuleRow
      })
      .filter((row): row is TaskflowRuleRow => Boolean(row))
  } catch (e: any) {
    logger.warn(`[taskflow-rule] listAll failed: ${e?.message ?? String(e)}`)
    return []
  }
}

export async function upsertTaskflowRuleFromLegacyKey(key: string, value: unknown): Promise<boolean> {
  const db = getPool()
  if (!db) return false

  const parsed = parseLegacyTaskflowSettingKey(key)
  if (!parsed) return false

  try {
    await db.query(
      `
      INSERT INTO public.chat_taskflow_rule (
        rule_type,
        scope_key,
        rule_key,
        value_json,
        enabled,
        priority,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4::jsonb, true, 100, NOW(), NOW())
      ON CONFLICT (rule_type, scope_key, rule_key)
      DO UPDATE SET
        value_json = EXCLUDED.value_json,
        enabled = true,
        updated_at = NOW()
      `,
      [parsed.ruleType, parsed.scopeKey, parsed.ruleKey, JSON.stringify(value ?? null)],
    )
    return true
  } catch (e: any) {
    logger.warn(`[taskflow-rule] upsert failed key=${key}: ${e?.message ?? String(e)}`)
    return false
  }
}
