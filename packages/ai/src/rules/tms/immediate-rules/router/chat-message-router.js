import { detectFrontGraphRule } from '../graph/front-graph-detector.js'
import { parseFrontGraphRule } from '../graph/front-graph-parser.js'
import { executeFrontGraphRule } from '../graph/front-graph-executor.js'

export function routeChatMessage(message, context = {}) {
  const { screenKey, pathname, allowFrontGraphRule = true } = context
  const normalizedMessage = String(message ?? '').trim()

  if (!normalizedMessage) {
    return {
      handled: false,
      reason: 'empty-message',
      message: normalizedMessage,
    }
  }

  const isFrontGraphRule = Boolean(detectFrontGraphRule(normalizedMessage, { screenKey, pathname, allowFrontGraphRule }))

  if (isFrontGraphRule) {
    const parsed = parseFrontGraphRule(normalizedMessage)
    const executed = executeFrontGraphRule(parsed)

    return {
      handled: true,
      kind: 'front-graph-rule',
      message: normalizedMessage,
      parsed,
      executed,
      replyText: '그래프 요청을 반영했습니다.',
    }
  }

  return {
    handled: false,
    kind: 'rule-match-required',
    message: normalizedMessage,
  }
}
