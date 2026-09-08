import { buildFlowOrdinals, orderNodesByFlow, parseFlowTarget, pickByFlowOrdinal } from './flowOrder'

/** Start → Parallel(A) → Pause → Parallel(B) 순서의 주 흐름.
 * Parallel(A) 에는 자식이 둘 달려 있고, 화면 좌표상으로는 자식이 Pause 보다 오른쪽일 수도 있다.
 * "두 번째 Parallel" 은 Parallel(B) 여야 한다.
 */
const nodes = [
  { id: 'start' },
  { id: 'p2', label: 'Parallel' },
  { id: 'child1', label: 'Joy' },
  { id: 'p1', label: 'Parallel' },
  { id: 'pause', label: 'Pause' },
  { id: 'child2', label: '이동' },
] as any[]

const edges = [
  { source: 'start', target: 'p1', sourceHandle: 'right' },
  { source: 'p1', target: 'child1', sourceHandle: 'left' },
  { source: 'p1', target: 'child2', sourceHandle: 'left' },
  { source: 'p1', target: 'pause', sourceHandle: 'right' },
  { source: 'pause', target: 'p2', sourceHandle: 'right' },
]

const labelOf = (node: any) => String(node.label ?? '')

describe('orderNodesByFlow', () => {
  it('walks the sequential flow first, then the children', () => {
    expect(orderNodesByFlow(nodes, edges).map((node) => node.id)).toEqual([
      'p1',
      'pause',
      'p2',
      'child1',
      'child2',
    ])
  })

  it('keeps nodes that are not connected to start at the end', () => {
    const orphan = [...nodes, { id: 'orphan', label: 'Awe' }] as any[]
    const ordered = orderNodesByFlow(orphan, edges)
    expect(ordered.map((node) => node.id)).toContain('orphan')
    expect(ordered[ordered.length - 1].id).toBe('orphan')
  })
})

describe('parseFlowTarget', () => {
  it('splits "Parallel #2" into name and ordinal', () => {
    expect(parseFlowTarget('Parallel #2')).toEqual({ name: 'Parallel', ordinal: 2 })
    expect(parseFlowTarget('Parallel #  3')).toEqual({ name: 'Parallel', ordinal: 3 })
  })

  it('keeps names that only look numbered', () => {
    expect(parseFlowTarget('도슨트 대기(D1)')).toEqual({ name: '도슨트 대기(D1)' })
    expect(parseFlowTarget('1')).toEqual({ name: '1' })
    expect(parseFlowTarget('Parallel #0')).toEqual({ name: 'Parallel #0' })
  })
})

describe('flow ordinals', () => {
  it('numbers duplicated labels by flow order and leaves unique labels unnumbered', () => {
    const ordinals = buildFlowOrdinals(nodes, edges, labelOf)

    expect(ordinals.get('p1')).toBe(1)
    expect(ordinals.get('p2')).toBe(2)
    expect(ordinals.get('pause')).toBeUndefined()
  })

  it('picks the second Parallel by flow order, not by creation order', () => {
    const candidates = nodes.filter((node) => labelOf(node) === 'Parallel')
    // 배열 순서로는 p2 가 먼저지만 흐름 순서로는 p1 이 첫 번째다.
    expect(pickByFlowOrdinal(candidates, 1, nodes, edges)?.id).toBe('p1')
    expect(pickByFlowOrdinal(candidates, 2, nodes, edges)?.id).toBe('p2')
    expect(pickByFlowOrdinal(candidates, 3, nodes, edges)).toBeNull()
  })
})
