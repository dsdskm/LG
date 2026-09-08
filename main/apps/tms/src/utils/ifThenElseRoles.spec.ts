import { applyIfThenElseBranchRoles, isIfThenElseTaskNode, resolveIfThenElseBranchRoles } from './ifThenElseRoles'

const ifThenElse = (over: Record<string, any> = {}) => ({
  id: 'ite',
  position: { x: 0, y: 0 },
  data: { label: 'IfThenElse', taskName: 'IfThenElse', taskType: 'CONTROL' },
  ...over,
})

/** 자연어로 만든 결과: 자식이 위에서 아래로 thumb_up → Love → Idle 순으로 놓인다. */
const nodes = [
  ifThenElse(),
  { id: 'c1', position: { x: 0, y: 80 }, data: { label: 'thumb_up', taskName: 'PlayMotion' } },
  { id: 'c2', position: { x: 0, y: 160 }, data: { label: 'Love', taskName: 'PlayFace' } },
  { id: 'c3', position: { x: 0, y: 240 }, data: { label: 'Idle', taskName: 'PlayFace' } },
  { id: 'next', position: { x: 100, y: 0 }, data: { label: 'Pause', taskName: 'Pause' } },
] as any[]

const edges = [
  { source: 'ite', target: 'c1', sourceHandle: 'left' },
  { source: 'ite', target: 'c2', sourceHandle: 'left' },
  { source: 'ite', target: 'c3', sourceHandle: 'left' },
  { source: 'ite', target: 'next', sourceHandle: 'right' },
]

describe('isIfThenElseTaskNode', () => {
  it('accepts the control task by its name variants', () => {
    expect(isIfThenElseTaskNode(ifThenElse())).toBe(true)
    expect(isIfThenElseTaskNode(ifThenElse({ data: { taskName: 'if_then_else', taskType: 'CONTROL' } }))).toBe(true)
    expect(isIfThenElseTaskNode({ id: 'x', data: { taskName: 'Parallel', taskType: 'CONTROL' } })).toBe(false)
    expect(isIfThenElseTaskNode({ id: 'x', data: { taskName: 'IfThenElse', taskType: 'ACTION' } })).toBe(false)
  })
})

describe('resolveIfThenElseBranchRoles', () => {
  it('assigns condition / success / failure top to bottom', () => {
    expect(resolveIfThenElseBranchRoles('ite', nodes, edges, 'default')).toEqual({
      c1: 'condition',
      c2: 'success',
      c3: 'failure',
    })
  })

  it('assigns left to right in tree mode', () => {
    const treeNodes = [
      ifThenElse(),
      { id: 'c1', position: { x: 240, y: 80 }, data: { label: 'Idle' } },
      { id: 'c2', position: { x: 80, y: 80 }, data: { label: 'thumb_up' } },
      { id: 'c3', position: { x: 160, y: 80 }, data: { label: 'Love' } },
    ] as any[]

    expect(resolveIfThenElseBranchRoles('ite', treeNodes, edges, 'tree')).toEqual({
      c2: 'condition',
      c3: 'success',
      c1: 'failure',
    })
  })

  it('keeps roles the user already picked and fills only the rest', () => {
    const withRole = [
      ifThenElse({ data: { ...ifThenElse().data, properties: { ifthenelse_branch_roles: { c3: 'condition' } } } }),
      ...nodes.slice(1),
    ] as any[]

    expect(resolveIfThenElseBranchRoles('ite', withRole, edges, 'default')).toEqual({
      c3: 'condition',
      c1: 'success',
      c2: 'failure',
    })
  })

  it('ignores the sequential child (right handle)', () => {
    const roles = resolveIfThenElseBranchRoles('ite', nodes, edges, 'default') ?? {}
    expect(roles.next).toBeUndefined()
  })
})

describe('applyIfThenElseBranchRoles', () => {
  it('writes the roles into the parent node properties', () => {
    const next = applyIfThenElseBranchRoles(nodes, edges, 'default')
    const parent: any = next.find((node) => node.id === 'ite')

    expect(parent.data.properties.ifthenelse_branch_roles).toEqual({
      c1: 'condition',
      c2: 'success',
      c3: 'failure',
    })
  })

  it('returns the same array when there is nothing to change', () => {
    const applied = applyIfThenElseBranchRoles(nodes, edges, 'default')
    expect(applyIfThenElseBranchRoles(applied, edges, 'default')).toBe(applied)
    expect(applyIfThenElseBranchRoles([{ id: 'a', data: { taskName: 'Parallel', taskType: 'CONTROL' } }] as any[], [])).toHaveLength(1)
  })
})
