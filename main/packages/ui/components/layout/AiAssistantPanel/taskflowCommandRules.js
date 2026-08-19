import { matchChatRule } from '@repo/apis/ai/chatSettings.js'

export const TASKFLOW_CANVAS_RULE_ROUTE_KEY = 'tms/taskflows/:taskFlowId/canvas'
const COMMAND_MATCH_CACHE = new Map()

export const resolveTmsCommandRouteKey = (pathname) => {
  const normalized = String(pathname ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')

  if (!normalized) {
    console.info('[AI_CHAT][TMS_RULE_ROUTE_BOOT]', { pathname, routeKey: null, appKey: 'tms', phase: 'empty' })
    return null
  }
  if (normalized === 'tms/taskflows') {
    console.info('[AI_CHAT][TMS_RULE_ROUTE_BOOT]', { pathname, routeKey: 'tms/taskflows', appKey: 'tms', phase: 'matched' })
    return 'tms/taskflows'
  }
  if (/^tms\/taskflows\/[^/]+\/detail(?:\/.*)?$/.test(normalized)) {
    console.info('[AI_CHAT][TMS_RULE_ROUTE_BOOT]', { pathname, routeKey: 'tms/taskflows/:taskFlowId/detail', appKey: 'tms', phase: 'matched' })
    return 'tms/taskflows/:taskFlowId/detail'
  }
  if (/^tms\/taskflows\/[^/]+\/canvas(?:\/.*)?$/.test(normalized)) {
    console.info('[AI_CHAT][TMS_RULE_ROUTE_BOOT]', { pathname, routeKey: 'tms/taskflows/:taskFlowId/canvas', appKey: 'tms', phase: 'matched' })
    return 'tms/taskflows/:taskFlowId/canvas'
  }
  if (normalized === 'tms/robots') {
    console.info('[AI_CHAT][TMS_RULE_ROUTE_BOOT]', { pathname, routeKey: 'tms/robots', appKey: 'tms', phase: 'matched' })
    return 'tms/robots'
  }
  if (/^tms\/robots\/[^/]+\/detail(?:\/.*)?$/.test(normalized)) {
    console.info('[AI_CHAT][TMS_RULE_ROUTE_BOOT]', { pathname, routeKey: 'tms/robots/:robotId/detail', appKey: 'tms', phase: 'matched' })
    return 'tms/robots/:robotId/detail'
  }

  console.info('[AI_CHAT][TMS_RULE_ROUTE_BOOT]', { pathname, routeKey: null, appKey: 'tms', phase: 'unmatched' })
  return null
}

export const isTmsCanvasPath = (pathname) => Boolean(resolveTmsCommandRouteKey(pathname))

const buildFallbackCommandReplyText = (command) => {
  if (!command || typeof command !== 'object') return '명령을 요청합니다.'

  const type = String(command.type ?? '').trim().toLowerCase()
  const actionMap = {
    'deploy-taskflow': '배포',
    'run-taskflow': '실행',
    'pause-taskflow': '일시정지',
    'resume-taskflow': '재개',
    'stop-taskflow': '정지',
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
  if (!routeKey) return null

  const input = String(message ?? '').trim()
  if (!input) return null

  const cacheKey = `${routeKey}::${input}`
  const cached = COMMAND_MATCH_CACHE.get(cacheKey)

  if (cached) {
    console.info('[AI_CHAT][TMS_RULE_CACHE]', {
      appKey: 'tms',
      screenKey: routeKey,
      routeKey,
      pathname,
      cacheKey,
      cacheHit: true,
      message: input,
      ruleKey: cached?.ruleKey ?? null,
      commandType: cached?.command?.type ?? null,
      replyText: cached?.replyText ?? null,
    })
    return cached
  }

  console.info('[AI_CHAT][TMS_RULE_CACHE]', {
    appKey: 'tms',
    screenKey: routeKey,
    routeKey,
    pathname,
    cacheKey,
    cacheHit: false,
    message: input,
  })

  const response = await matchChatRule({
    appKey: 'tms',
    screenKey: routeKey,
    message: input,
  })
  const matched = response?.data?.match ?? response?.match

  console.info('[AI_CHAT][TMS_RULE_MATCH]', {
    appKey: 'tms',
    screenKey: routeKey,
    routeKey,
    pathname,
    cacheKey,
    message: input,
    matched: Boolean(matched),
    rawMatch: matched ?? null,
  })

  if (!matched || typeof matched !== 'object') {
    return null
  }

  const command = matched.command
  if (!command || typeof command !== 'object' || Array.isArray(command)) {
    console.info('[AI_CHAT][TMS_RULE_MATCH]', {
      appKey: 'tms',
      screenKey: routeKey,
      routeKey,
      pathname,
      cacheKey,
      message: input,
      matched: false,
      reason: 'invalid-command-shape',
      rawMatch: matched,
    })
    return null
  }

  if (!String(command.type ?? '').trim()) {
    console.info('[AI_CHAT][TMS_RULE_MATCH]', {
      appKey: 'tms',
      screenKey: routeKey,
      routeKey,
      pathname,
      cacheKey,
      message: input,
      matched: false,
      reason: 'missing-command-type',
      rawMatch: matched,
    })
    return null
  }

  const result = {
    ruleKey: String(matched.ruleKey ?? '').trim(),
    command,
    replyText: String(matched.replyText ?? '').trim() || buildFallbackCommandReplyText(command),
  }

  COMMAND_MATCH_CACHE.set(cacheKey, result)
  console.info('[AI_CHAT][TMS_RULE_CACHE]', {
    appKey: 'tms',
    screenKey: routeKey,
    routeKey,
    pathname,
    cacheKey,
    cacheHit: false,
    stored: true,
    message: input,
    ruleKey: result.ruleKey,
    commandType: result.command.type,
    replyText: result.replyText,
  })

  return result
}

export const taskflowCommandAdapter = {
  isActive: isTmsCanvasPath,
  match: matchTaskflowCanvasCommand,
}
