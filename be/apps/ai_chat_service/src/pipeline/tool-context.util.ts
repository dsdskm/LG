import type { ToolContext } from './tool.type'

type ToolLog = {
  log: (msg: string) => void
  error: (msg: string) => void
}

type BuildToolContextParams = {
  body: any
  message?: unknown
  actionRunnerUrl?: string
  log: ToolLog
}

export function normalizeBodyContext(body: any): Record<string, unknown> {
  if (!body?.context || typeof body.context !== 'object' || Array.isArray(body.context)) {
    return {}
  }

  return body.context as Record<string, unknown>
}

export function buildToolContextFromBody({
  body,
  message,
  actionRunnerUrl,
  log,
}: BuildToolContextParams): ToolContext {
  const baseContext = normalizeBodyContext(body)
  const userMessage = String(message ?? '').trim()
  const reqId = String(body?.reqId ?? body?.requestId ?? '').trim()

  return {
    accessToken: body?.accessToken,
    ...(actionRunnerUrl ? { actionRunnerUrl } : {}),
    context: {
      ...baseContext,
      ...(body?.groupId ? { groupId: body.groupId } : {}),
      ...(body?.siteId ? { siteId: body.siteId } : {}),
      ...(reqId ? { __reqId: reqId } : {}),
      ...(userMessage ? { __userMessage: userMessage } : {}),
    },
    log,
  }
}