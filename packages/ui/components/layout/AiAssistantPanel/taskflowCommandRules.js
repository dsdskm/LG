import { matchChatRule } from '@repo/apis/ai/chatSettings.js'

export const TASKFLOW_CANVAS_RULE_ROUTE_KEY = 'tms/taskflows/:taskFlowId/canvas'

export const isTmsCanvasPath = (pathname) =>
  /^\/tms\/taskflows\/[^/]+\/canvas(?:\/|$)/.test(String(pathname ?? '').trim())

export const matchTaskflowCanvasCommand = async (message, pathname) => {
  if (!isTmsCanvasPath(pathname)) return null

  const input = String(message ?? '').trim()
  if (!input) return null

  const response = await matchChatRule({
    appKey: 'tms',
    screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
    message: input
  })
  const matched = response?.data?.match ?? response?.match
  if (!matched || typeof matched !== 'object') return null

  const command = matched.command
  if (!command || typeof command !== 'object' || Array.isArray(command)) return null
  if (!String(command.type ?? '').trim()) return null

  return {
    ruleKey: String(matched.ruleKey ?? '').trim(),
    command,
    replyText: String(matched.replyText ?? '').trim()
  }
}

export const taskflowCommandAdapter = {
  isActive: isTmsCanvasPath,
  match: matchTaskflowCanvasCommand
}
