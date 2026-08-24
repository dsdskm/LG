import { normalizeFrontGraphMessage } from './front-graph-detector.js'

const ARROW_TOKENS = ['->', '=>', '→', '⇒']

function splitArrowChain(line) {
  const pattern = /(?:->|=>|→|⇒)/g
  return line.split(pattern).map((piece) => piece.trim()).filter(Boolean)
}

function tokenizeLine(line) {
  const trimmed = normalizeFrontGraphMessage(line)
  if (!trimmed) return []

  if (/^!\s*.+$/.test(trimmed)) {
    const node = trimmed.replace(/^!\s*/, '').trim()
    return [{ type: 'delete', value: node }]
  }

  if (trimmed.includes('_') && !ARROW_TOKENS.some((token) => trimmed.includes(token))) {
    const parts = trimmed.split('_').map((piece) => piece.trim()).filter(Boolean)
    if (parts.length > 1) {
      return parts.map((value) => ({ type: 'node', value }))
    }
  }

  const parts = splitArrowChain(trimmed)
  if (parts.length < 2) return []

  const edges = []
  for (let index = 0; index < parts.length - 1; index += 1) {
    edges.push({ type: 'edge', from: parts[index], to: parts[index + 1] })
  }

  return [{ type: 'chain', values: parts, edges }]
}

export function parseFrontGraphRule(message) {
  const input = normalizeFrontGraphMessage(message)
  if (!input) {
    return {
      kind: 'front-graph-rule',
      nodes: [],
      edges: [],
      operations: [],
      invalid: [],
      normalized: '',
    }
  }

  const lines = input.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const nodes = new Map()
  const edges = []
  const operations = []
  const invalid = []

  for (const line of lines) {
    const tokens = tokenizeLine(line)
    if (tokens.length === 0) {
      invalid.push(line)
      continue
    }

    for (const token of tokens) {
      if (token.type === 'delete') {
        operations.push({ type: 'delete', node: token.value })
        nodes.set(token.value, { id: token.value, label: token.value, kind: 'node' })
        continue
      }

      if (token.type === 'node') {
        nodes.set(token.value, { id: token.value, label: token.value, kind: 'node' })
        continue
      }

      if (token.type === 'chain') {
        for (const value of token.values) {
          nodes.set(value, { id: value, label: value, kind: 'node' })
        }

        for (const edge of token.edges) {
          edges.push({
            id: `${edge.from}->${edge.to}`,
            source: edge.from,
            target: edge.to,
            kind: 'edge',
          })
        }
      }
    }
  }

  const normalizedParts = lines.flatMap((line) => splitArrowChain(line)).filter(Boolean)
  const normalized = normalizedParts.join(' -> ')

  return {
    kind: 'front-graph-rule',
    nodes: Array.from(nodes.values()),
    edges,
    operations,
    invalid,
    normalized,
  }
}
