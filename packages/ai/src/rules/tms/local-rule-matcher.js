import {
  AI_TASKFLOW_CANVAS_CLARIFY_EVENT,
  AI_TASKFLOW_CANVAS_DRAFT_EVENT,
  AI_TASKFLOW_CANVAS_RESULT_EVENT,
  TASKFLOW_CANVAS_RULE_ROUTE_KEY
} from '@repo/constants'

const ARROW_PATTERN = /(->|=>)/g
const CANVAS_ROUTE_PATTERN = /^\/?tms\/taskflows\/[^/?#]+\/canvas\/?(?:[?#].*)?$/

function isCanvasScreen(screenKey) {
  const route = String(screenKey ?? '').trim()
  return route === TASKFLOW_CANVAS_RULE_ROUTE_KEY || CANVAS_ROUTE_PATTERN.test(route)
}

function resolveHandles(arrow) {
  return arrow === '=>'
    ? { sourceHandle: 'left', targetHandle: 'left' }
    : { sourceHandle: 'right', targetHandle: 'left' }
}

function parseChain(line) {
  const input = String(line ?? '').trim()
  if (!input) return null

  const leadingMatch = input.match(/^(->|=>)\s*/)
  const leadingArrow = leadingMatch?.[1] ?? ''
  const body = leadingArrow ? input.slice(leadingMatch[0].length).trim() : input
  if (!body || /(?:->|=>)\s*$/.test(body)) return null

  const nodes = body
    .split(ARROW_PATTERN)
    .filter((_, index) => index % 2 === 0)
    .map((node) => node.trim())
  const arrows = Array.from(body.matchAll(ARROW_PATTERN), (match) => match[1])

  if (nodes.some((node) => !node) || (!leadingArrow && arrows.length === 0) || arrows.length !== nodes.length - 1) {
    return null
  }

  return { leadingArrow, nodes, arrows }
}

export function parseLocalCanvasRule(message) {
  const lines = String(message ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return null

  const chains = lines.map(parseChain)
  if (chains.some((chain) => !chain)) return null

  const insertAfter = []
  for (const chain of chains) {
    const { leadingArrow, nodes, arrows } = chain

    nodes.forEach((nodeName, index) => {
      const arrow = index === 0 ? leadingArrow : arrows[index - 1]
      const handles = resolveHandles(arrow)

      insertAfter.push({
        after: index === 0 ? '' : nodes[index - 1],
        step: {
          label: nodeName,
          taskName: nodeName,
          contentName: nodeName
        },
        appendOnly: Boolean(leadingArrow) || index > 0,
        isolated: !leadingArrow && index === 0,
        ...handles
      })
    })
  }

  return {
    mode: 'edit',
    insertAfter
  }
}

export function matchLocalRule(screenKey, message, options = {}) {
  if (!isCanvasScreen(screenKey)) return null
  if (options.signal?.aborted) return null

  const draft = parseLocalCanvasRule(message)
  if (!draft) return null

  const matchedRule = {
    ok: true,
    ruleKey: String(options.ruleKey || '').trim() || 'local-taskflow-graph',
    replyText: String(options.replyText || '').trim() || '노드 작업을 반영했습니다.',
    draft
  }

  if (options.dispatch === false || typeof window === 'undefined') return matchedRule

  const assistantMessageId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return new Promise((resolve) => {
    const cleanup = () => {
      window.removeEventListener(AI_TASKFLOW_CANVAS_CLARIFY_EVENT, handleClarification)
      window.removeEventListener(AI_TASKFLOW_CANVAS_RESULT_EVENT, handleResult)
      options.signal?.removeEventListener('abort', handleAbort)
      clearTimeout(timeoutId)
    }

    const finish = (replyText) => {
      cleanup()
      resolve({
        ...matchedRule,
        replyText
      })
    }

    const handleClarification = (event) => {
      const detail = event.detail
      if (String(detail?.assistantMessageId ?? '') !== assistantMessageId) return
      finish(String(detail?.message ?? '').trim() || '노드 이름을 다시 확인해주세요.')
    }

    const handleResult = (event) => {
      const detail = event.detail
      if (detail?.kind !== 'draft') return
      if (String(detail?.assistantMessageId ?? '') !== assistantMessageId) return
      finish(String(detail?.message ?? '').trim() || matchedRule.replyText)
    }

    const handleAbort = () => {
      cleanup()
      resolve(null)
    }

    const timeoutId = window.setTimeout(() => {
      finish('캔버스 작업 결과를 확인하지 못했습니다.')
    }, 15000)

    window.addEventListener(AI_TASKFLOW_CANVAS_CLARIFY_EVENT, handleClarification)
    window.addEventListener(AI_TASKFLOW_CANVAS_RESULT_EVENT, handleResult)
    options.signal?.addEventListener('abort', handleAbort, { once: true })
    window.dispatchEvent(
      new CustomEvent(AI_TASKFLOW_CANVAS_DRAFT_EVENT, {
        detail: {
          ...draft,
          message: String(options.originalMessage ?? message ?? ''),
          assistantMessageId
        }
      })
    )
  })
}
