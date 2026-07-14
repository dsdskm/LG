import type { ToolContext, ToolDefinition } from '../../pipeline/tool.type'

function normalizePath(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
}

function inferApp(path: string): string | undefined {
  const [app] = path.split('/')
  return app || undefined
}

export const navigateToScreen: ToolDefinition = {
  declaration: {
    name: 'navigate_to_screen',
    description:
      '사용자를 다른 화면으로 이동시킨다. 화면 이동 요청일 때만 호출한다. ' +
      'path에는 앱 prefix를 포함한 상대 경로를 넣는다. 예: robot/management, robot/ailog/event, tms',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '이동할 화면 경로. 슬래시 없이 app prefix 포함 경로를 사용한다.',
        },
        reason: {
          type: 'string',
          description: '왜 이 화면으로 이동하는지에 대한 짧은 설명.',
        },
      },
      required: ['path'],
    },
  },
  async execute(args: Record<string, any>, _ctx: ToolContext) {
    const path = normalizePath(args.path)

    if (!path) {
      return { ok: false, error: '이동할 path가 필요합니다.' }
    }

    return {
      ok: true,
      path,
      app: inferApp(path),
      reason: String(args.reason ?? '').trim() || undefined,
    }
  },
}