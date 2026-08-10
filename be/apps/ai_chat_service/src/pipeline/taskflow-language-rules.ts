import { listTaskflowRuleRows, type TaskflowRuleType } from '../db/taskflow-rule.repo'

export type TaskflowLanguageRules = {
  composeNoisePhrases: string[]
  requestTailPhrases: string[]
  composeVerbPhrases: string[]
  taskflowKeywordPhrases: string[]
  composeSignalPhrases: string[]
  nodeLevelEditPhrases: string[]
  nodePlaceholderPhrases: string[]
  nodePlaceholderPrefixPhrases: string[]
  modeRequestPhrases: string[]
  modeDirectionTreePhrases: string[]
  modeDirectionDefaultPhrases: string[]
  saveRequestPhrases: string[]
  saveDecisionHintPhrases: string[]
  saveTypeTempPhrases: string[]
  saveTypeFinalPhrases: string[]
  resetAllPhrases: string[]
  deleteRequestPhrases: string[]
  deleteAllScopePhrases: string[]
  alignRequestPhrases: string[]
  moveComposeHintPhrases: string[]
  pickupComposeHintPhrases: string[]
  playMotionComposeHintPhrases: string[]
  docentHintPhrases: string[]
  connectIntentPhrases: string[]
  connectPairSeparatorPhrases: string[]
  connectLeftPairSeparatorPhrases: string[]
}

export type TaskflowClassifierRules = {
  explanationKeywords: string[]
  composeRequestKeywords: string[]
  composeMoveHintKeywords: string[]
  editSubjectKeywords: string[]
  editVerbKeywords: string[]
  explanationBlockKeywords: string[]
  arrowSequenceEnabled: boolean
  explanationImageMinScore: number
  explanationImageMinScoreAlways: number
}

export type TaskflowOrchestratorRules = {
  nodeClarificationPhrases: string[]
  nodeDeleteClarificationPhrases: string[]
  modeClarificationPhrases: string[]
  saveClarificationPhrases: string[]
  nodeNameBlockedPhrases: string[]
  nodeNameOnlyMaxLength: number
  nodeAppendSuffix: string
  nodeAppendWithNodeSuffix: string
  deleteAppendSuffix: string
  deleteAppendWithNodeSuffix: string
  modeAppendSuffix: string
  saveTempMessage: string
  saveFinalMessage: string
  guideInfoCuePhrases: string[]
  guideActionCuePhrases: string[]
  nodeGuideSubjectPhrases: string[]
  nodeGuideRequestPhrases: string[]
  ruleFirstIntentConfidence: number
  actionRetryDeleteExample: string
  actionRetryConnectExample: string
  actionRetryComposeExample: string
  actionRetryDefaultExample: string
  actionRetryRunActionExample: string
}

const CACHE_TTL_MS = 10_000

type CachedRules = {
  at: number
  data: TaskflowLanguageRules
}

type ScopeRuleMaps = {
  scoped: Record<string, unknown>
}

const rulesCache = new Map<string, CachedRules>()
const classifierRulesCache = new Map<string, { at: number; data: TaskflowClassifierRules }>()
const orchestratorRulesCache = new Map<string, { at: number; data: TaskflowOrchestratorRules }>()

function normalizePhraseList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const list = value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
  return Array.from(new Set(list))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function phraseToPattern(value: string): string {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''

  const tokens = trimmed.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ''

  return tokens.map((token) => escapeRegExp(token)).join('\\s*')
}

export function buildConfiguredPhraseRegex(phrases: string[], flags = 'gi'): RegExp | null {
  const parts = (Array.isArray(phrases) ? phrases : [])
    .map((phrase) => phraseToPattern(phrase))
    .filter(Boolean)

  if (parts.length === 0) return null
  return new RegExp(parts.join('|'), flags)
}

export function replaceConfiguredPhrases(text: string, phrases: string[], replacement = ' '): string {
  const compiled = buildConfiguredPhraseRegex(phrases)
  if (!compiled) return text
  return text.replace(compiled, replacement)
}

export function includesConfiguredPhrase(text: string, phrases: string[]): boolean {
  const compiled = buildConfiguredPhraseRegex(phrases, 'i')
  if (!compiled) return false
  return compiled.test(String(text ?? ''))
}

export function normalizeForSignalMatch(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function keyFor(routeKey: string): string {
  return String(routeKey ?? '').trim() || '__common__'
}

function scopeForRules(routeKey: string): string {
  return String(routeKey ?? '').trim()
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return fallback
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toStringValue(value: unknown, fallback = ''): string {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function buildScopeRuleMaps(routeScope: string, rows: Array<{ scopeKey: string; ruleKey: string; valueJson: unknown }>): ScopeRuleMaps {
  const scoped: Record<string, unknown> = {}

  for (const row of rows) {
    const key = String(row?.ruleKey ?? '').trim()
    if (!key) continue

    const scopeKey = String(row?.scopeKey ?? '').trim() || 'common'
    if (scopeKey === routeScope) {
      if (scoped[key] === undefined) {
        scoped[key] = row.valueJson
      }
    }
  }

  return { scoped }
}

async function readScopeRuleMaps(ruleType: TaskflowRuleType, routeKey: string): Promise<ScopeRuleMaps> {
  const routeScope = scopeForRules(routeKey)
  if (!routeScope) return { scoped: {} }
  const rows = await listTaskflowRuleRows(ruleType, [routeScope])
  return buildScopeRuleMaps(routeScope, rows)
}

function readMergedList(ruleMaps: ScopeRuleMaps, ruleName: string): string[] {
  return normalizePhraseList(ruleMaps.scoped[ruleName])
}

function readMergedString(ruleMaps: ScopeRuleMaps, ruleName: string, fallback = ''): string {
  return toStringValue(ruleMaps.scoped[ruleName], fallback)
}

function readMergedBoolean(ruleMaps: ScopeRuleMaps, ruleName: string, fallback = false): boolean {
  return toBoolean(ruleMaps.scoped[ruleName], fallback)
}

function readMergedNumber(ruleMaps: ScopeRuleMaps, ruleName: string, fallback: number): number {
  return toNumber(ruleMaps.scoped[ruleName], fallback)
}

async function readRules(routeKey: string): Promise<TaskflowLanguageRules> {
  const ruleMaps = await readScopeRuleMaps('language', routeKey)

  return {
    composeNoisePhrases: readMergedList(ruleMaps, 'composeNoisePhrases'),
    requestTailPhrases: readMergedList(ruleMaps, 'requestTailPhrases'),
    composeVerbPhrases: readMergedList(ruleMaps, 'composeVerbPhrases'),
    taskflowKeywordPhrases: readMergedList(ruleMaps, 'taskflowKeywordPhrases'),
    composeSignalPhrases: readMergedList(ruleMaps, 'composeSignalPhrases'),
    nodeLevelEditPhrases: readMergedList(ruleMaps, 'nodeLevelEditPhrases'),
    nodePlaceholderPhrases: readMergedList(ruleMaps, 'nodePlaceholderPhrases'),
    nodePlaceholderPrefixPhrases: readMergedList(ruleMaps, 'nodePlaceholderPrefixPhrases'),
    modeRequestPhrases: readMergedList(ruleMaps, 'modeRequestPhrases'),
    modeDirectionTreePhrases: readMergedList(ruleMaps, 'modeDirectionTreePhrases'),
    modeDirectionDefaultPhrases: readMergedList(ruleMaps, 'modeDirectionDefaultPhrases'),
    saveRequestPhrases: readMergedList(ruleMaps, 'saveRequestPhrases'),
    saveDecisionHintPhrases: readMergedList(ruleMaps, 'saveDecisionHintPhrases'),
    saveTypeTempPhrases: readMergedList(ruleMaps, 'saveTypeTempPhrases'),
    saveTypeFinalPhrases: readMergedList(ruleMaps, 'saveTypeFinalPhrases'),
    resetAllPhrases: readMergedList(ruleMaps, 'resetAllPhrases'),
    deleteRequestPhrases: readMergedList(ruleMaps, 'deleteRequestPhrases'),
    deleteAllScopePhrases: readMergedList(ruleMaps, 'deleteAllScopePhrases'),
    alignRequestPhrases: readMergedList(ruleMaps, 'alignRequestPhrases'),
    moveComposeHintPhrases: readMergedList(ruleMaps, 'moveComposeHintPhrases'),
    pickupComposeHintPhrases: readMergedList(ruleMaps, 'pickupComposeHintPhrases'),
    playMotionComposeHintPhrases: readMergedList(ruleMaps, 'playMotionComposeHintPhrases'),
    docentHintPhrases: readMergedList(ruleMaps, 'docentHintPhrases'),
    connectIntentPhrases: readMergedList(ruleMaps, 'connectIntentPhrases'),
    connectPairSeparatorPhrases: readMergedList(ruleMaps, 'connectPairSeparatorPhrases'),
    connectLeftPairSeparatorPhrases: readMergedList(ruleMaps, 'connectLeftPairSeparatorPhrases'),
  }
}

export async function loadTaskflowLanguageRules(routeKey: string): Promise<TaskflowLanguageRules> {
  const cacheKey = keyFor(routeKey)
  const cached = rulesCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data
  }

  const data = await readRules(routeKey)
  rulesCache.set(cacheKey, { at: Date.now(), data })
  return data
}

async function readClassifierRules(routeKey: string): Promise<TaskflowClassifierRules> {
  const ruleMaps = await readScopeRuleMaps('classifier', routeKey)

  return {
    explanationKeywords: readMergedList(ruleMaps, 'explanationKeywords'),
    composeRequestKeywords: readMergedList(ruleMaps, 'composeRequestKeywords'),
    composeMoveHintKeywords: readMergedList(ruleMaps, 'composeMoveHintKeywords'),
    editSubjectKeywords: readMergedList(ruleMaps, 'editSubjectKeywords'),
    editVerbKeywords: readMergedList(ruleMaps, 'editVerbKeywords'),
    explanationBlockKeywords: readMergedList(ruleMaps, 'explanationBlockKeywords'),
    arrowSequenceEnabled: readMergedBoolean(ruleMaps, 'arrowSequenceEnabled', false),
    explanationImageMinScore: readMergedNumber(ruleMaps, 'explanationImageMinScore', 5),
    explanationImageMinScoreAlways: readMergedNumber(ruleMaps, 'explanationImageMinScoreAlways', 1),
  }
}

export async function loadTaskflowClassifierRules(routeKey: string): Promise<TaskflowClassifierRules> {
  const cacheKey = `classifier:${keyFor(routeKey)}`
  const cached = classifierRulesCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data
  }

  const data = await readClassifierRules(routeKey)
  classifierRulesCache.set(cacheKey, { at: Date.now(), data })
  return data
}

async function readOrchestratorRules(routeKey: string): Promise<TaskflowOrchestratorRules> {
  const ruleMaps = await readScopeRuleMaps('orchestrator', routeKey)

  return {
    nodeClarificationPhrases: readMergedList(ruleMaps, 'nodeClarificationPhrases'),
    nodeDeleteClarificationPhrases: readMergedList(ruleMaps, 'nodeDeleteClarificationPhrases'),
    modeClarificationPhrases: readMergedList(ruleMaps, 'modeClarificationPhrases'),
    saveClarificationPhrases: readMergedList(ruleMaps, 'saveClarificationPhrases'),
    nodeNameBlockedPhrases: readMergedList(ruleMaps, 'nodeNameBlockedPhrases'),
    nodeNameOnlyMaxLength: readMergedNumber(ruleMaps, 'nodeNameOnlyMaxLength', 40),
    nodeAppendSuffix: readMergedString(ruleMaps, 'nodeAppendSuffix'),
    nodeAppendWithNodeSuffix: readMergedString(ruleMaps, 'nodeAppendWithNodeSuffix'),
    deleteAppendSuffix: readMergedString(ruleMaps, 'deleteAppendSuffix'),
    deleteAppendWithNodeSuffix: readMergedString(ruleMaps, 'deleteAppendWithNodeSuffix'),
    modeAppendSuffix: readMergedString(ruleMaps, 'modeAppendSuffix'),
    saveTempMessage: readMergedString(ruleMaps, 'saveTempMessage'),
    saveFinalMessage: readMergedString(ruleMaps, 'saveFinalMessage'),
    guideInfoCuePhrases: readMergedList(ruleMaps, 'guideInfoCuePhrases'),
    guideActionCuePhrases: readMergedList(ruleMaps, 'guideActionCuePhrases'),
    nodeGuideSubjectPhrases: readMergedList(ruleMaps, 'nodeGuideSubjectPhrases'),
    nodeGuideRequestPhrases: readMergedList(ruleMaps, 'nodeGuideRequestPhrases'),
    ruleFirstIntentConfidence: readMergedNumber(ruleMaps, 'ruleFirstIntentConfidence', 0.97),
    actionRetryDeleteExample: readMergedString(ruleMaps, 'actionRetryDeleteExample', '"검사" 노드 삭제해줘'),
    actionRetryConnectExample: readMergedString(ruleMaps, 'actionRetryConnectExample', '입고 -> 검사 -> 적재 연결해줘'),
    actionRetryComposeExample: readMergedString(ruleMaps, 'actionRetryComposeExample', 'Start -> PickUp(창고) -> MoveTo(검사장) -> PutDown 구성해줘'),
    actionRetryDefaultExample: readMergedString(ruleMaps, 'actionRetryDefaultExample', '입고 -> 검사 -> 적재 구성해줘'),
    actionRetryRunActionExample: readMergedString(ruleMaps, 'actionRetryRunActionExample', '대상과 작업을 함께 적어주세요. 예: "로봇 A를 점검 실행해줘"'),
  }
}

export async function loadTaskflowOrchestratorRules(routeKey: string): Promise<TaskflowOrchestratorRules> {
  const cacheKey = `orchestrator:${keyFor(routeKey)}`
  const cached = orchestratorRulesCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data
  }

  const data = await readOrchestratorRules(routeKey)
  orchestratorRulesCache.set(cacheKey, { at: Date.now(), data })
  return data
}
