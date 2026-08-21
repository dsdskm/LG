export type AssistantCommandMatch = {
  ruleKey: string
  command: Record<string, unknown>
  replyText: string
}

export declare const TASKFLOW_CANVAS_RULE_ROUTE_KEY: string
export declare const isTmsCanvasPath: (pathname: unknown) => boolean
export declare const loadTmsAppRules: (options?: { forceRefresh?: boolean }) => Promise<unknown[]>
export declare const matchTaskflowCanvasCommand: (
  message: unknown,
  pathname: unknown,
) => Promise<AssistantCommandMatch | null>
export declare const taskflowCommandAdapter: {
  isActive: typeof isTmsCanvasPath
  match: typeof matchTaskflowCanvasCommand
}