import { FRONT_GRAPH_RULE_TYPE } from '@repo/constants'

const GRAPH_ARROW_RE = /(?:->|=>|→|⇒)/
const GRAPH_UNDERSCORE_RE = /^[A-Za-z0-9가-힣]+(?:\s*_[\s_]*[A-Za-z0-9가-힣]+)+$/

function isCompleteArrowChain(line) {
  const parts = line.split(GRAPH_ARROW_RE).map((part) => part.trim())
  return parts.length > 1 && parts.every(Boolean)
}

export function normalizeFrontGraphMessage(message) {
  return String(message ?? '')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

export { FRONT_GRAPH_RULE_TYPE }

export function detectFrontGraphRule(message, options = {}) {
  const { screenKey, pathname, allowFrontGraphRule = true } = options
  if (!allowFrontGraphRule) return false

  const input = normalizeFrontGraphMessage(message)
  if (!input) return false

  const graphLike =
    input.includes('->') || input.includes('=>') || input.includes('→') || input.includes('⇒') || input.includes('_')
  if (!graphLike) return false

  const lines = input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return false

  if (lines.every((line) => isCompleteArrowChain(line) || GRAPH_UNDERSCORE_RE.test(line))) return true

  if (screenKey || pathname) {
    const target = String(screenKey ?? pathname ?? '').trim()
    if (!target) return false
  }

  return false
}
