import {
  type LinearTaskflowDraftPlan,
  inferLinearStepsFromMessage,
  normalizeNameKey,
} from '../../core'
import {
  includesConfiguredPhrase,
  normalizeForSignalMatch,
  replaceConfiguredPhrases,
  type TaskflowLanguageRules,
} from '../../../taskflow-language-rules'

const CANONICAL_ARROW = '->'

function normalizeSpace(value: string): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function hasRulePhrase(text: string, phrases: string[] | undefined): boolean {
  return includesConfiguredPhrase(text, Array.isArray(phrases) ? phrases : [])
}

function isNumberedPlaceholderByPrefix(key: string, prefixes: string[]): boolean {
  if (!key) return false
  return prefixes.some((prefix) => {
    const head = normalizeNameKey(prefix)
    if (!head) return false
    return key.startsWith(head) && /^\d*$/.test(key.slice(head.length))
  })
}

function parseArrowNamedSteps(message: string, rules?: TaskflowLanguageRules) {
  const replacedArrow = String(message ?? '').replace(/→/g, CANONICAL_ARROW)
  const removedNoise = replaceConfiguredPhrases(replacedArrow, rules?.composeNoisePhrases ?? [], ' ')
  const removedTail = replaceConfiguredPhrases(removedNoise, rules?.requestTailPhrases ?? [], ' ')
  const removedComposeVerbs = replaceConfiguredPhrases(removedTail, rules?.composeVerbPhrases ?? [], ' ')
  const normalized = removedComposeVerbs.trim()

  if (!normalized.includes(CANONICAL_ARROW)) return []

  return normalized
    .split(CANONICAL_ARROW)
    .map((part) =>
      String(part ?? '')
        .replace(/["'`]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .map((label) => ({ label }))
}

function inferLinearDraftPlanFromMessage(value: unknown, rules?: TaskflowLanguageRules): LinearTaskflowDraftPlan {
  const message = String(value ?? '').trim()
  if (!message) return { mode: 'replace', steps: [] }

  const arrowNamedSteps = parseArrowNamedSteps(message, rules)
  if (arrowNamedSteps.length > 0) {
    return {
      mode: 'replace',
      steps: arrowNamedSteps,
    }
  }

  return {
    mode: 'replace',
    steps: inferLinearStepsFromMessage(message, rules),
  }
}

function isNodeLevelEditMessage(message: string, rules?: TaskflowLanguageRules): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false
  return hasRulePhrase(text, rules?.nodeLevelEditPhrases)
}

function isGenericNodePlaceholder(label: unknown, rules?: TaskflowLanguageRules): boolean {
  const key = normalizeNameKey(label)
  if (!key) return true

  const placeholders = Array.isArray(rules?.nodePlaceholderPhrases)
    ? rules.nodePlaceholderPhrases.map((item) => normalizeNameKey(item)).filter(Boolean)
    : []

  if (placeholders.includes(key)) return true

  const prefixes = Array.isArray(rules?.nodePlaceholderPrefixPhrases)
    ? rules.nodePlaceholderPrefixPhrases
    : []
  if (isNumberedPlaceholderByPrefix(key, prefixes)) return true

  return false
}

function isAmbiguousModeChangeMessage(message: string, rules?: TaskflowLanguageRules): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false
  const asksMode = hasRulePhrase(text, rules?.modeRequestPhrases)
  if (!asksMode) return false
  const hasDirection =
    hasRulePhrase(text, rules?.modeDirectionTreePhrases) ||
    hasRulePhrase(text, rules?.modeDirectionDefaultPhrases)
  return !hasDirection
}

function isAmbiguousSaveMessage(message: string, rules?: TaskflowLanguageRules): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false
  const asksSave = hasRulePhrase(text, rules?.saveRequestPhrases)
  if (!asksSave) return false
  const hasDecisionHint = hasRulePhrase(text, rules?.saveDecisionHintPhrases)
  if (!hasDecisionHint) return false
  const hasType =
    hasRulePhrase(text, rules?.saveTypeTempPhrases) ||
    hasRulePhrase(text, rules?.saveTypeFinalPhrases)
  return !hasType
}

function isDeleteAllNodesMessage(message: string, rules?: TaskflowLanguageRules): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  if (hasRulePhrase(text, rules?.resetAllPhrases)) {
    return true
  }

  const asksDelete = hasRulePhrase(text, rules?.deleteRequestPhrases)
  if (!asksDelete) return false

  const allKeyword = hasRulePhrase(text, rules?.deleteAllScopePhrases)
  return allKeyword
}

function detectRequestedFlowMode(message: string, rules?: TaskflowLanguageRules): 'default' | 'tree' | null {
  const text = normalizeSpace(String(message ?? '').toLowerCase())
  if (!text) return null
  if (hasRulePhrase(text, rules?.modeDirectionTreePhrases)) return 'tree'
  if (hasRulePhrase(text, rules?.modeDirectionDefaultPhrases)) return 'default'
  return null
}

function isAlignRequestMessage(message: string, rules?: TaskflowLanguageRules): boolean {
  return hasRulePhrase(String(message ?? '').trim(), rules?.alignRequestPhrases)
}

function detectSaveCommand(message: string, rules?: TaskflowLanguageRules): 'save' | 'temp-save' | null {
  const text = String(message ?? '').trim()
  if (!text) return null
  if (!hasRulePhrase(text, rules?.saveRequestPhrases)) return null
  if (hasRulePhrase(text, rules?.saveTypeTempPhrases)) return 'temp-save'
  return 'save'
}

function isTaskflowComposeRequest(message: string, rules?: TaskflowLanguageRules): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  const composeVerbs = Array.isArray(rules?.composeVerbPhrases) ? rules.composeVerbPhrases : []
  const taskflowKeywords = Array.isArray(rules?.taskflowKeywordPhrases) ? rules.taskflowKeywordPhrases : []
  const composeSignals = Array.isArray(rules?.composeSignalPhrases) ? rules.composeSignalPhrases : []

  const normalizedArrowText = text.replace(/→/g, CANONICAL_ARROW)
  const hasArrowRoute = normalizedArrowText.includes(CANONICAL_ARROW)
  if (hasArrowRoute) {
    if (includesConfiguredPhrase(normalizedArrowText, composeVerbs)) return true
    return true
  }

  if (includesConfiguredPhrase(text, composeVerbs)) {
    if (includesConfiguredPhrase(text, taskflowKeywords)) return true
  }

  const normalized = normalizeForSignalMatch(text)
  if (!normalized) return false

  return composeSignals
    .map((signal) => normalizeForSignalMatch(signal))
    .filter(Boolean)
    .some((signal) => normalized.includes(signal))
}

function isMoveFlowComposeMessage(message: string, rules?: TaskflowLanguageRules): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  const asksCompose = isTaskflowComposeRequest(text, rules)
  if (!asksCompose) return false

  return hasRulePhrase(text, rules?.moveComposeHintPhrases)
}

function isPickUpFlowComposeMessage(message: string, rules?: TaskflowLanguageRules): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  const asksCompose = isTaskflowComposeRequest(text, rules)
  if (!asksCompose) return false

  return hasRulePhrase(text, rules?.pickupComposeHintPhrases)
}

function isPlayMotionFlowComposeMessage(message: string, rules?: TaskflowLanguageRules): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  const asksCompose = isTaskflowComposeRequest(text, rules)
  if (!asksCompose) return false

  return hasRulePhrase(text, rules?.playMotionComposeHintPhrases)
}

function isDocentFlowComposeMessage(message: string, rules?: TaskflowLanguageRules): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  const mentionsDocent = hasRulePhrase(text, rules?.docentHintPhrases)
  if (!mentionsDocent) return false

  const asksCompose =
    isTaskflowComposeRequest(text, rules) ||
    includesConfiguredPhrase(text, rules?.composeVerbPhrases ?? [])

  return asksCompose
}

export {
  detectRequestedFlowMode,
  detectSaveCommand,
  inferLinearDraftPlanFromMessage,
  isDeleteAllNodesMessage,
  isDocentFlowComposeMessage,
  isAlignRequestMessage,
  isAmbiguousModeChangeMessage,
  isAmbiguousSaveMessage,
  isGenericNodePlaceholder,
  isMoveFlowComposeMessage,
  isNodeLevelEditMessage,
  isPickUpFlowComposeMessage,
  isPlayMotionFlowComposeMessage,
}
