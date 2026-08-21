import { listChatRules, matchChatRule } from '@repo/apis/ai/chatSettings.js'

export const TASKFLOW_CANVAS_RULE_ROUTE_KEY = 'tms/taskflows/:taskFlowId/canvas'
const COMMAND_MATCH_CACHE = new Map()
const TMS_RULES_CACHE = new Map()

const normalizeRoute = (value) => String(value ?? '')
  .trim()
  .replace(/^\/+/, '')
  .replace(/[?#].*$/, '')
  .replace(/\/+$/, '')

export const resolveTmsCommandRouteKey = (pathname) => {
  const normalized = normalizeRoute(pathname)

  if (!normalized) return null
  if (normalized === 'tms/taskflows') return 'tms/taskflows'
  if (/^tms\/taskflows\/[^/]+\/detail(?:\/.*)?$/.test(normalized)) return 'tms/taskflows/:taskFlowId/detail'
  if (/^tms\/taskflows\/[^/]+\/canvas(?:\/.*)?$/.test(normalized)) return 'tms/taskflows/:taskFlowId/canvas'
  if (normalized === 'tms/robots') return 'tms/robots'
  if (/^tms\/robots\/[^/]+\/detail(?:\/.*)?$/.test(normalized)) return 'tms/robots/:robotId/detail'

  return null
}

export const isTmsCanvasPath = (pathname) => {
  const routeKey = resolveTmsCommandRouteKey(pathname)
  return routeKey === TASKFLOW_CANVAS_RULE_ROUTE_KEY
}

export const isTmsCommandRoutePath = (pathname) => {
  const routeKey = resolveTmsCommandRouteKey(pathname)
  return Boolean(routeKey && routeKey.startsWith('tms'))
}

export const loadTmsAppRules = async ({ forceRefresh = false } = {}) => {
  const cacheKey = 'tms'

  if (!forceRefresh) {
    const cached = TMS_RULES_CACHE.get(cacheKey)
    if (cached) return cached
  }

  try {
    const response = await listChatRules({ appKey: 'tms', forceRefresh })
    const items = Array.isArray(response?.data?.items)
      ? response.data.items
      : Array.isArray(response?.items)
        ? response.items
        : []

    TMS_RULES_CACHE.set(cacheKey, items)
    return items
  } catch (error) {
    console.warn('[AI_CHAT][TMS_RULES]', error)
    const fallback = TMS_RULES_CACHE.get(cacheKey) ?? []
    TMS_RULES_CACHE.set(cacheKey, fallback)
    return fallback
  }
}

const hasCanvasDraftPayload = (value) => {
  if (!value || typeof value !== 'object') return false

  const wrappedPayload = value.chat_action_param ?? value.chatActionParam ?? null
  const target = wrappedPayload && typeof wrappedPayload === 'object' ? wrappedPayload : value

  const directDraft = target.canvasDraft ?? target.taskflowDraft ?? target.draft ?? target.canvas ?? target.flowDefinition
  if (directDraft && typeof directDraft === 'object') return true

  if (target.toolResult && typeof target.toolResult === 'object' && hasCanvasDraftPayload(target.toolResult)) return true
  if (target.executed && typeof target.executed === 'object' && hasCanvasDraftPayload(target.executed)) return true

  return false
}

const sanitizeTaskflowReplyText = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return '요청을 반영해보겠습니다.'

  const lower = raw.toLowerCase()
  const tutorialPatterns = [
    'right-to-left',
    'left-to-right',
    'same pattern as',
    '현재 flow',
    '별도 chain',
    '연결',
    '추가하고',
    '추가',
    'node',
    '노드',
    'pattern',
    '시나리오',
    '세부',
    '설명',
    '체인',
    'flow',
  ]

  const looksLikeVerboseRuleGuide = lower.includes('right-to-left')
    || lower.includes('left-to-right')
    || lower.includes('same pattern as')
    || lower.includes('현재 flow')
    || lower.includes('별도 chain')
    || /(?:->|=>|→|⇒)/.test(raw)

  if (looksLikeVerboseRuleGuide && tutorialPatterns.some((pattern) => lower.includes(pattern))) {
    return '요청을 반영해보겠습니다.'
  }

  if (raw.length > 180) return '요청을 반영해보겠습니다.'

  return raw
}

const buildFallbackCommandReplyText = (command) => {
  if (!command || typeof command !== 'object') return '명령을 요청합니다.'

  const type = String(command.type ?? '').trim().toLowerCase()
  const actionMap = {
    'deploy-taskflow': '배포',
    'run-taskflow': '실행',
    'pause-taskflow': '일시정지',
    'resume-taskflow': '재개',
    'stop-taskflow': '정지',
    'copy-taskflow': '복제',
    'delete-taskflow': '삭제',
    'create-taskflow': '생성',
    'modify-taskflow': '수정',
  }

  const robotValue = Array.isArray(command.robotId)
    ? command.robotId.filter(Boolean).map((item) => String(item ?? '').trim()).filter(Boolean).at(-1) ?? ''
    : String(command.robotId ?? '').trim()

  const taskFlowValue = Array.isArray(command.taskFlowId)
    ? command.taskFlowId.filter(Boolean).map((item) => String(item ?? '').trim()).filter(Boolean).at(-1) ?? ''
    : String(command.taskFlowId ?? '').trim()

  const actionText = actionMap[type] ?? '처리'
  const robotText = robotValue ? `로봇 ${robotValue} 에서 ` : ''
  const taskText = taskFlowValue ? `태스크플로우 ${taskFlowValue}` : '태스크플로우'

  return `${robotText}${taskText} ${actionText}를 요청합니다.`
}

export const matchTaskflowCanvasCommand = async (message, pathname) => {
  const routeKey = resolveTmsCommandRouteKey(pathname)
  const input = String(message ?? '').trim()

  if (!routeKey || !input) return null

  const cacheKey = `${routeKey}::${input}`
  const cached = COMMAND_MATCH_CACHE.get(cacheKey)
  if (cached) {
    console.info('[AI_CHAT][TMS_RULE]', {
      phase: '캐시 사용',
      routeKey,
      message: input,
      ruleKey: cached?.ruleKey ?? null,
    })
    return cached
  }

  const response = await matchChatRule({
    appKey: 'tms',
    screenKey: routeKey,
    message: input,
  })

  const matched = response?.data?.match ?? response?.match
  if (!matched || typeof matched !== 'object') {
    console.info('[AI_CHAT][TMS_RULE]', {
      phase: '규칙 미매칭',
      routeKey,
      message: input,
    })
    return null
  }

  const backendCommand = matched.command && typeof matched.command === 'object' && !Array.isArray(matched.command)
    ? matched.command
    : undefined
  const normalizedChatActionParam = matched.chatActionParam && typeof matched.chatActionParam === 'object'
    ? matched.chatActionParam
    : matched.chat_action_param && typeof matched.chat_action_param === 'object'
      ? matched.chat_action_param
      : undefined
  const hasDraftAction = Boolean(hasCanvasDraftPayload(normalizedChatActionParam))
  const normalizedChatAction = String(matched.chatAction ?? matched.chat_action ?? '').trim() || (hasDraftAction ? 'action' : undefined)

  if (!backendCommand && !hasDraftAction) {
    console.info('[AI_CHAT][TMS_RULE]', {
      phase: '규칙 미매칭',
      routeKey,
      message: input,
    })
    return null
  }

  const baseReplyText = String(matched.replyText ?? matched.text ?? '').trim()
  const result = {
    ruleKey: String(matched.ruleKey ?? matched.matchedRule?.ruleKey ?? '').trim(),
    command: backendCommand,
    chatAction: normalizedChatAction,
    chatActionParam: normalizedChatActionParam,
    replyText: sanitizeTaskflowReplyText(baseReplyText || (backendCommand ? buildFallbackCommandReplyText(backendCommand) : '요청을 반영해보겠습니다.')),
  }

  COMMAND_MATCH_CACHE.set(cacheKey, result)
  console.info('[AI_CHAT][TMS_RULE]', {
    phase: '백엔드 규칙 매칭',
    routeKey,
    message: input,
    ruleKey: result.ruleKey,
    commandType: result.command?.type ?? null,
  })

  return result
}

export const taskflowCommandAdapter = {
  isActive: isTmsCommandRoutePath,
  match: matchTaskflowCanvasCommand,
}
