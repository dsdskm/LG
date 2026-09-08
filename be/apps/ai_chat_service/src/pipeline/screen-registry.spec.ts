import { resolveActionTools } from './screen-registry'
import { TASKFLOW_MESSAGE_KEY } from './tools/taskflow-message'

const factories = {
  [TASKFLOW_MESSAGE_KEY.toolCompose]: () => ({
    declaration: { name: 'compose_linear_taskflow', description: 'c' },
    execute: async () => ({}),
  }),
  [TASKFLOW_MESSAGE_KEY.toolEdit]: () => ({
    declaration: { name: 'edit_taskflow', description: 'e' },
    execute: async () => ({}),
  }),
  [TASKFLOW_MESSAGE_KEY.toolReadGraph]: () => ({
    declaration: { name: 'read_taskflow_graph', description: 'r' },
    execute: async () => ({}),
  }),
} as any

describe('resolveActionTools', () => {
  it('registers only the tools registered for the screen', () => {
    const { tools } = resolveActionTools([TASKFLOW_MESSAGE_KEY.toolCompose], factories)
    expect(tools.map((tool) => tool.declaration.name)).toEqual(['compose_linear_taskflow'])
  })

  it('registers edit and read independently so one missing row does not drop the other', () => {
    const { tools } = resolveActionTools([TASKFLOW_MESSAGE_KEY.toolEdit], factories)
    expect(tools.map((tool) => tool.declaration.name)).toEqual(['edit_taskflow'])
  })

  it('keeps the order registered in the table', () => {
    const { tools } = resolveActionTools(
      [TASKFLOW_MESSAGE_KEY.toolReadGraph, TASKFLOW_MESSAGE_KEY.toolCompose, TASKFLOW_MESSAGE_KEY.toolEdit],
      factories,
    )
    expect(tools.map((tool) => tool.declaration.name)).toEqual([
      'read_taskflow_graph',
      'compose_linear_taskflow',
      'edit_taskflow',
    ])
  })

  it('reports tool keys that have no implementation', () => {
    const { tools, unknown } = resolveActionTools(['tool.typo'], factories)

    expect(tools).toEqual([])
    expect(unknown).toEqual(['tool.typo'])
  })

  it('registers nothing when the screen has no rows so it falls back to action RAG', () => {
    expect(resolveActionTools([], factories).tools).toEqual([])
  })

  it('reports tools whose factory refused to build', () => {
    const refusing = { [TASKFLOW_MESSAGE_KEY.toolCompose]: () => null } as any
    const { tools, skipped } = resolveActionTools([TASKFLOW_MESSAGE_KEY.toolCompose], refusing)

    expect(tools).toEqual([])
    expect(skipped).toEqual([TASKFLOW_MESSAGE_KEY.toolCompose])
  })
})
