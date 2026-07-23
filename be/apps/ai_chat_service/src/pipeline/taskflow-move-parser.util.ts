export type ParsedMoveStep = {
  label: string
  taskName: 'MoveTo'
  contentName: string
}

const COMPOSE_NOISE_REGEX = /태스크\s*플로우|태스크플로우|taskflow|캔버스|canvas|구성해줘|구성해\s*줘|만들어줘|만들어\s*줘|생성해줘|생성해\s*줘/gi
const REQUEST_TAIL_REGEX = /(해줘|해주세요|부탁해|부탁합니다|해\s*줘)\s*$/gi
const MOVE_VERB_TAIL_REGEX = /\s*(?:으로|로)?\s*(?:이동(?:하는|하기|하고|해서)?|가(?:는|기|고)?|진행(?:하는|하기|하고)?|향(?:해|하는)?)\s*$/gi

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function preprocessMessage(raw: string): string {
  return normalizeSpace(
    raw
      .replace(/["'`]/g, '')
      .replace(COMPOSE_NOISE_REGEX, ' ')
      .replace(/→/g, '->')
      .replace(/\s*(?:을\s*거쳐|를\s*거쳐|거쳐|들러서|들러|들렀다가|다음|그리고|then)\s*/gi, ' -> ')
      .replace(/\s*(?:갔다가|가다가|가서|이동하고|이동해서|이동\s*후|이동후)\s*/gi, ' -> ')
      .replace(/\s*,\s*/g, ' -> '),
  )
}

function normalizeStopToken(value: string): string {
  return normalizeSpace(
    value
      .replace(MOVE_VERB_TAIL_REGEX, ' ')
      .replace(REQUEST_TAIL_REGEX, ' ')
      .replace(MOVE_VERB_TAIL_REGEX, ' ')
      .replace(/\s*(?:으로|로)\s*$/gi, ' ')
      .replace(/[.!?]+$/g, ' '),
  )
}

function splitArrowRoute(text: string): string[] {
  if (!text.includes('->')) return []
  const base = text
    .split('->')
    .map((part) => normalizeStopToken(part))
    .filter(Boolean)

  const expanded: string[] = []
  for (const token of base) {
    const fromBase = token.match(/^(.+?)에서\s+(.+)$/i)
    if (!fromBase) {
      expanded.push(token)
      continue
    }

    const from = normalizeStopToken(String(fromBase[1] ?? ''))
    const to = normalizeStopToken(String(fromBase[2] ?? ''))
    if (from) expanded.push(from)
    if (to) expanded.push(to)
  }

  const deduped: string[] = []
  for (const stop of expanded) {
    if (!stop) continue
    if (deduped.length > 0 && deduped[deduped.length - 1].toLowerCase() === stop.toLowerCase()) continue
    deduped.push(stop)
  }

  return deduped
}

function extractFromToRoute(text: string): string[] {
  const fromTo = text.match(/(.+?)에서\s+(.+?)\s*(?:으로|로)\s*(?:이동|가|가는|진행|향해)?/i)
  if (!fromTo) return []

  const from = normalizeStopToken(String(fromTo[1] ?? ''))
  const to = normalizeStopToken(String(fromTo[2] ?? ''))
  return [from, to].filter(Boolean)
}

function extractFromBaseRoute(text: string): string[] {
  const fromBase = text.match(/^(.+?)에서\s+(.+)$/i)
  if (!fromBase) return []

  const from = normalizeStopToken(String(fromBase[1] ?? ''))
  const rest = normalizeSpace(String(fromBase[2] ?? ''))
  if (!from || !rest) return []

  const restStops = splitFallback(rest)
  if (restStops.length === 0) return []

  const merged = [from, ...restStops]
  const deduped: string[] = []
  const seen = new Set<string>()
  for (const stop of merged) {
    const key = stop.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(stop)
  }

  return deduped
}

function extractSequentialMoveTargets(text: string): string[] {
  return Array.from(
    text.matchAll(/([^,\n]+?)\s*(?:으로|로)\s*(?:갔다가|가다가|가고|가서|가는|가|이동(?:하는|하기|하고|해서)?|향해|진행(?:하는|하기|하고)?)/gi),
  )
    .map((match) => normalizeStopToken(String(match?.[1] ?? '')))
    .map((token) => {
      if (!/에서\s+/i.test(token)) return token
      return normalizeStopToken(token.replace(/^.*에서\s+/i, ' '))
    })
    .filter(Boolean)
}

function splitFallback(text: string): string[] {
  return text
    .split(/(?:->|\s+다음\s+|\s+그리고\s+|,)/)
    .map((part) => normalizeStopToken(part))
    .filter(Boolean)
}

export function parseMoveStopsFromMessage(value: unknown): string[] {
  const message = normalizeSpace(String(value ?? ''))
  if (!message) return []

  const preprocessed = preprocessMessage(message)
  if (!preprocessed) return []

  const byArrow = splitArrowRoute(preprocessed)
  if (byArrow.length > 0) return byArrow

  const byFromTo = extractFromToRoute(preprocessed)
  if (byFromTo.length > 0) return byFromTo

  const byFromBase = extractFromBaseRoute(preprocessed)
  if (byFromBase.length > 0) return byFromBase

  const bySequential = extractSequentialMoveTargets(preprocessed)
  if (bySequential.length > 0) return bySequential

  return splitFallback(preprocessed)
}

export function inferMoveStepsFromMessage(value: unknown): ParsedMoveStep[] {
  return parseMoveStopsFromMessage(value).map((label) => ({
    label,
    taskName: 'MoveTo',
    contentName: label,
  }))
}
