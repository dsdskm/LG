import { FRONT_GRAPH_RULE_TYPE } from '@repo/constants'

const GRAPH_ARROW_RE = /(?:->|=>|→|⇒)/
const GRAPH_DELETE_RE = /^!\s*[^\n]+$/
const GRAPH_UNDERSCORE_RE = /^[A-Za-z0-9가-힣]+(?:\s*_[\s_]*[A-Za-z0-9가-힣]+)+$/

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

  const graphLike = input.includes('->') || input.includes('=>') || input.includes('→') || input.includes('⇒') || input.includes('!') || input.includes('_')
  if (!graphLike) return false

  if (GRAPH_DELETE_RE.test(input)) return true

  const lines = input.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return false

  if (lines.some((line) => GRAPH_ARROW_RE.test(line))) return true
  if (lines.some((line) => GRAPH_UNDERSCORE_RE.test(line))) return true

  if (/^\s*(?:->|=>|→|⇒)\s*[^\n]+$/.test(input)) return true

  if (screenKey || pathname) {
    const target = String(screenKey ?? pathname ?? '').trim()
    if (!target) return false
  }

  return false
}
