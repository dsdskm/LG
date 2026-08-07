import { isSameFlowDefinition } from './flowDefinition'

describe('isSameFlowDefinition', () => {
  it('내용이 같으면 key 순서가 달라도 같다고 본다', () => {
    const a = { nodes: [{ id: '1', type: 'taskNode' }], edges: [] }
    const b = { edges: [], nodes: [{ type: 'taskNode', id: '1' }] }

    expect(isSameFlowDefinition(a, b)).toBe(true)
  })

  it('노드 내용이 다르면 다르다고 본다', () => {
    const a = { nodes: [{ id: '1' }], edges: [] }
    const b = { nodes: [{ id: '2' }], edges: [] }

    expect(isSameFlowDefinition(a, b)).toBe(false)
  })

  it('둘 다 비어 있으면 같다고 본다', () => {
    expect(isSameFlowDefinition({}, null)).toBe(true)
    expect(isSameFlowDefinition({ nodes: [] }, undefined)).toBe(true)
  })

  it('한쪽만 비어 있으면 다르다고 본다', () => {
    expect(isSameFlowDefinition({ nodes: [{ id: '1' }] }, {})).toBe(false)
  })
})
