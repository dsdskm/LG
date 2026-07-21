export type TaskflowContextSource = 'taskflow' | 'flowContext' | 'none'

export function resolveTaskflowContextSource(context: unknown): {
  source: TaskflowContextSource
  value: unknown
} {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return {
      source: 'none',
      value: undefined,
    }
  }

  const row = context as Record<string, unknown>

  if (row.taskflow && typeof row.taskflow === 'object' && !Array.isArray(row.taskflow)) {
    return {
      source: 'taskflow',
      value: row.taskflow,
    }
  }

  if (row.flowContext && typeof row.flowContext === 'object' && !Array.isArray(row.flowContext)) {
    return {
      source: 'flowContext',
      value: row.flowContext,
    }
  }

  return {
    source: 'none',
    value: undefined,
  }
}