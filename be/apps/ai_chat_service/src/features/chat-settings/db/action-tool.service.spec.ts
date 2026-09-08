import { ActionToolService } from './action-tool.service'

const buildService = (rows: any[]) => {
  const service = new ActionToolService({} as any)
  ;(service as any).rows = rows

  return service
}

const row = (over: Record<string, unknown>) => ({
  appKey: 'tms',
  screenKey: 'tms/taskflows/:taskFlowId/canvas',
  toolKey: 'tool.compose',
  llmFunction: 'compose_linear_taskflow',
  clientFunction: 'taskflow.canvas.applyDraft',
  enabled: true,
  sortOrder: 0,
  ...over,
})

describe('ActionToolService.listForRoute', () => {
  it('matches parameterized screen keys against the actual route', () => {
    const service = buildService([row({})])

    const tools = service.listForRoute('tms', 'tms/taskflows/42/canvas')
    expect(tools.map((tool) => tool.toolKey)).toEqual(['tool.compose'])
    expect(tools[0].llmFunction).toBe('compose_linear_taskflow')
    expect(tools[0].clientFunction).toBe('taskflow.canvas.applyDraft')
  })

  it('returns nothing for a screen with no rows so the screen falls back to action RAG', () => {
    const service = buildService([row({})])
    expect(service.listForRoute('tms', 'tms/taskflows/42/detail')).toEqual([])
  })

  it('skips disabled rows', () => {
    const service = buildService([row({ enabled: false })])
    expect(service.listForRoute('tms', 'tms/taskflows/42/canvas')).toEqual([])
  })

  it('orders by sortOrder and lets the screen row win over app and common rows', () => {
    const service = buildService([
      row({ toolKey: 'tool.edit', sortOrder: 2 }),
      row({ toolKey: 'tool.readGraph', sortOrder: 1 }),
      row({ appKey: 'tms', screenKey: 'tms', toolKey: 'tool.edit', clientFunction: 'app.level', sortOrder: 0 }),
      row({ appKey: 'common', screenKey: 'common', toolKey: 'tool.compose', clientFunction: 'common.level', sortOrder: 5 }),
    ])

    const tools = service.listForRoute('tms', 'tms/taskflows/42/canvas')
    expect(tools.map((tool) => tool.toolKey)).toEqual(['tool.readGraph', 'tool.edit', 'tool.compose'])
    // 화면 행이 앱 행보다 우선한다.
    expect(tools.find((tool) => tool.toolKey === 'tool.edit')?.clientFunction).toBe('taskflow.canvas.applyDraft')
    // 화면·앱에 없는 도구는 common 행에서 채운다.
    expect(tools.find((tool) => tool.toolKey === 'tool.compose')?.clientFunction).toBe('common.level')
  })
})
