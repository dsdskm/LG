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
    apiBaseUrl: body?.apiBaseUrl || process.env.URL_EVENT_RECEIVER || process.env.API_BASE_URL,
    eventAnalyzerUrl: body?.eventAnalyzerUrl || process.env.URL_EVENT_ANALYZER || process.env.EVENT_ANALYZER_URL,
    configManagerUrl: body?.configManagerUrl || process.env.URL_CONFIG_MANAGER || process.env.CONFIG_MANAGER_URL,
    ...(actionRunnerUrl ? { actionRunnerUrl } : {}),
    context: userMessage
      ? {
        ...baseContext,
        ...(reqId ? { __reqId: reqId } : {}),
        __userMessage: userMessage,
      }
      : {
        ...baseContext,
        ...(reqId ? { __reqId: reqId } : {}),
      },
    log,
  }
}