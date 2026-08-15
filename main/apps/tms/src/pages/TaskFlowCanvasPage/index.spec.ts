import { applyEditDraftToFlowDefinition } from './index'

declare const require: any

const {
  resolveArrowHandleConfig,
  resolveFastTaskflowCanvasAction
} = require('../../../../../packages/ui/components/layout/AiAssistantPanel/index.jsx')

describe('fast taskflow command semantics', () => {
  it('uses left-left handles for vertical => chains', () => {
    expect(resolveArrowHandleConfig('=>')).toEqual({
      sourceHandle: 'left',
      targetHandle: 'left'
    })
  })

  it('normalizes only whitespace and case, and rejects unrelated variants', async () => {
    const action = await resolveFastTaskflowCanvasAction('  god  ->  d  ', '/tms/taskflows/42/canvas')
    expect(action).not.toBeNull()
    expect(action?.kind).toBe('draft')

    const nonMatch = await resolveFastTaskflowCanvasAction('god--d', '/tms/taskflows/42/canvas')
    expect(nonMatch).toBeNull()
  })

  it('reports whether a local arrow draft will actually produce a change', async () => {
    const action = await resolveFastTaskflowCanvasAction('G->D', '/tms/taskflows/42/canvas')
    expect(action).not.toBeNull()
    expect(action?.kind).toBe('draft')
    expect(action?.actualEffect).toMatchObject({ didApply: true })
    expect(action?.actualEffect?.insertedNodeCount).toBeGreaterThan(0)
  })

  it('keeps a control-node chain on the active main flow instead of isolating the first node', async () => {
    const action = await resolveFastTaskflowCanvasAction('And->Love', '/tms/taskflows/42/canvas')
    expect(action).not.toBeNull()
    expect(action?.kind).toBe('draft')
    expect(action?.draft?.insertAfter).toHaveLength(2)
    expect(action?.draft?.insertAfter[0]).toMatchObject({
      after: '',
      step: { label: 'And', taskName: 'And', contentName: 'And' },
      appendOnly: true
    })
    expect(action?.draft?.insertAfter[1]).toMatchObject({
      after: 'And',
      step: { label: 'Love', taskName: 'Love', contentName: 'Love' },
      appendOnly: true
    })
  })

  it('uses the immediate previous node as the anchor for mixed arrow chains', async () => {
    const action = await resolveFastTaskflowCanvasAction('And->Love->Retry=>Awe', '/tms/taskflows/42/canvas')
    expect(action).not.toBeNull()
    expect(action?.kind).toBe('draft')
    expect(action?.draft?.insertAfter).toHaveLength(4)
    expect(action?.draft?.insertAfter[3]).toMatchObject({
      after: 'Retry',
      step: { label: 'Awe', taskName: 'Awe', contentName: 'Awe' },
      sourceHandle: 'left',
      targetHandle: 'left'
    })
  })
})

describe('applyEditDraftToFlowDefinition', () => {
  it('removes a named node and reconnects its adjacent nodes', () => {
    const currentNodes: any[] = [
      { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      { id: 'retry', type: 'taskNode', position: { x: 140, y: 0 }, data: { label: 'Retry', taskName: 'Retry' } },
      { id: 'and', type: 'taskNode', position: { x: 280, y: 0 }, data: { label: 'And', taskName: 'And' } }
    ]
    const currentEdges: any[] = [
      { id: 'start-retry', source: 'start', target: 'retry' },
      { id: 'retry-and', source: 'retry', target: 'and' }
    ]

    const result = applyEditDraftToFlowDefinition(
      { mode: 'edit', removeByName: ['Retry'] },
      currentNodes,
      currentEdges,
      { x: 0, y: 0, zoom: 1 },
      []
    )

    expect(result.next?.nodes.map((node: any) => node.id)).toEqual(['start', 'and'])
    expect(result.next?.edges).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: 'start', target: 'and' })])
    )
  })

  it('places multiline arrow chains in separate spaces without connecting the active flow', () => {
    const currentNodes: any[] = [
      { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      { id: 'existing', type: 'taskNode', position: { x: 140, y: 0 }, data: { label: 'Existing' } }
    ]
    const currentEdges: any[] = [
      { id: 'start-existing', source: 'start', target: 'existing', sourceHandle: 'right', targetHandle: 'left' }
    ]
    const palette: any[] = ['Or', 'And', 'Love', 'Awe'].map((name, index) => ({
      kind: 'controlTaskNode',
      label: name,
      task: { id: 200 + index, name, taskType: 'CONTROL', propertySchema: {} }
    }))

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [
          { after: '', step: 'Or', isolated: true },
          { after: 'Or', step: 'And', appendOnly: true, sourceHandle: 'right', targetHandle: 'left' },
          { after: '', step: 'Love', isolated: true },
          { after: 'Love', step: 'Awe', appendOnly: true, sourceHandle: 'right', targetHandle: 'left' }
        ]
      },
      currentNodes,
      currentEdges,
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    const nodeByLabel = new Map(result.next?.nodes.map((node: any) => [node.data?.label, node]))
    const orNode: any = nodeByLabel.get('Or')
    const andNode: any = nodeByLabel.get('And')
    const loveNode: any = nodeByLabel.get('Love')
    const aweNode: any = nodeByLabel.get('Awe')

    expect(result.next?.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: orNode.id, target: andNode.id }),
        expect.objectContaining({ source: loveNode.id, target: aweNode.id })
      ])
    )
    expect(result.next?.edges).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'existing', target: expect.stringMatching(/^ai-/) })
      ])
    )
    expect(orNode.position.y).toBeGreaterThan(currentNodes[1].position.y)
    expect(loveNode.position.y).toBeGreaterThan(orNode.position.y)
  })

  it('adds a new isolated chain when the same arrow command is requested again', () => {
    const palette: any[] = ['Or', 'And'].map((name, index) => ({
      kind: 'controlTaskNode',
      label: name,
      task: { id: 300 + index, name, taskType: 'CONTROL', propertySchema: {} }
    }))
    const draft: any = {
      mode: 'edit',
      insertAfter: [
        { after: '', step: 'Or', isolated: true },
        { after: 'Or', step: 'And', appendOnly: true, sourceHandle: 'right', targetHandle: 'left' }
      ]
    }
    const initialNodes: any[] = [
      { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Start' } }
    ]

    const first = applyEditDraftToFlowDefinition(draft, initialNodes, [], { x: 0, y: 0, zoom: 1 }, palette)
    const second = applyEditDraftToFlowDefinition(
      draft,
      first.next?.nodes ?? initialNodes,
      first.next?.edges ?? [],
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    const orNodes = second.next?.nodes.filter((node: any) => node.data?.label === 'Or') ?? []
    const andNodes = second.next?.nodes.filter((node: any) => node.data?.label === 'And') ?? []
    expect(orNodes).toHaveLength(2)
    expect(andNodes).toHaveLength(2)
    expect(second.next?.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: orNodes[0].id, target: andNodes[0].id }),
        expect.objectContaining({ source: orNodes[1].id, target: andNodes[1].id })
      ])
    )
  })

  it('applies left-to-left handles only to => edges in a mixed chain', () => {
    const palette: any[] = ['A', 'B', 'C', 'D'].map((name, index) => ({
      kind: 'controlTaskNode',
      label: name,
      task: { id: 400 + index, name, taskType: 'CONTROL', propertySchema: {} }
    }))

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [
          { after: '', step: 'A', isolated: true },
          { after: 'A', step: 'B', appendOnly: true, sourceHandle: 'left', targetHandle: 'left' },
          { after: 'B', step: 'C', appendOnly: true, sourceHandle: 'right', targetHandle: 'left' },
          { after: 'C', step: 'D', appendOnly: true, sourceHandle: 'left', targetHandle: 'left' }
        ]
      },
      [{ id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Start' } }],
      [],
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    const nodeByLabel = new Map(result.next?.nodes.map((node: any) => [node.data?.label, node.id]))
    const edgeByLabels = (source: string, target: string) =>
      result.next?.edges.find(
        (edge: any) => edge.source === nodeByLabel.get(source) && edge.target === nodeByLabel.get(target)
      )

    expect(edgeByLabels('A', 'B')).toMatchObject({ sourceHandle: 'left', targetHandle: 'left' })
    expect(edgeByLabels('B', 'C')).toMatchObject({ sourceHandle: 'right', targetHandle: 'left' })
    expect(edgeByLabels('C', 'D')).toMatchObject({ sourceHandle: 'left', targetHandle: 'left' })
  })

  it('uses valid default handles for a backend graph-rule chain', () => {
    const currentNodes: any[] = [
      {
        id: 'start',
        type: 'startNode',
        position: { x: 0, y: 0 },
        data: { label: 'Start' }
      }
    ]
    const palette: any[] = ['Idle', 'Joy'].map((name, index) => ({
      kind: 'contentNode',
      label: name,
      task: {
        id: 100 + index,
        name: `${name} Task`,
        taskType: 'ACTION',
        propertySchema: {}
      },
      content: {
        id: 1000 + index,
        name,
        contentTypeName: 'test',
        contentTypeId: 1,
        contentValue: '',
        contentVersion: 1,
        groupId: null,
        siteId: null
      }
    }))

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [
          { after: '', step: 'Idle' },
          { after: 'Idle', step: 'Joy' }
        ]
      },
      currentNodes,
      [],
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    expect(result.next?.nodes).toHaveLength(3)
    expect(result.next?.edges).toHaveLength(2)
    expect(result.next?.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceHandle: 'right', targetHandle: 'left' }),
        expect.objectContaining({ sourceHandle: 'right', targetHandle: 'left' })
      ])
    )
  })

  it.each([
    { paletteNames: ['B'], expected: '"A"노드 이름을 다시 확인해주세요' },
    { paletteNames: ['A'], expected: '"B"노드 이름을 다시 확인해주세요' },
    { paletteNames: [], expected: '"A","B" 노드 이름을 다시 확인해주세요' }
  ])('reports missing arrow nodes: $expected', ({ paletteNames, expected }) => {
    const currentNodes: any[] = [
      {
        id: 'start',
        type: 'startNode',
        position: { x: 0, y: 0 },
        data: { label: 'Start' }
      }
    ]

    const currentEdges: any[] = []
    const palette: any[] = paletteNames.map((name, index) => ({
      kind: 'controlTaskNode',
      label: name,
      task: { id: 101 + index, name, taskType: 'CONTROL', propertySchema: {} }
    }))

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [
          { after: '', step: 'A', isolated: true },
          { after: 'A', step: 'B', appendOnly: true }
        ]
      },
      currentNodes,
      currentEdges,
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    expect(result.next).toBeNull()
    expect(result.clarification).toBe(expected)
  })

  it('inserts a node between the anchor and its existing next node when appendOnly is requested', () => {
    const currentNodes: any[] = [
      {
        id: 'start',
        type: 'startNode',
        position: { x: 0, y: 0 },
        data: { label: 'Start' }
      },
      {
        id: 'node-surprised',
        type: 'taskNode',
        position: { x: 150, y: 0 },
        data: {
          label: 'Surprised',
          taskName: 'Surprised',
          taskType: 'ACTION',
          properties: {}
        }
      },
      {
        id: 'node-joy',
        type: 'taskNode',
        position: { x: 300, y: 0 },
        data: {
          label: 'Joy',
          taskName: 'Joy',
          taskType: 'ACTION',
          properties: {}
        }
      }
    ]

    const currentEdges: any[] = [
      {
        id: 'edge-1',
        source: 'start',
        target: 'node-surprised',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      },
      {
        id: 'edge-2',
        source: 'node-surprised',
        target: 'node-joy',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      }
    ]

    const palette: any[] = [
      {
        kind: 'contentNode',
        label: 'Love',
        task: {
          id: 102,
          name: 'Love Task',
          taskType: 'ACTION',
          propertySchema: {}
        },
        content: {
          id: 1000,
          name: 'Love',
          contentTypeName: 'test',
          contentTypeId: 1,
          contentValue: '',
          contentVersion: 1,
          groupId: null,
          siteId: null
        }
      }
    ]

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [
          {
            after: 'Surprised',
            step: { label: 'Love', taskName: 'Love Task', taskType: 'ACTION' },
            appendOnly: true
          }
        ]
      },
      currentNodes,
      currentEdges,
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    expect(result.next).not.toBeNull()
    const inserted = result.next?.nodes.find((node: any) => node.data?.label === 'Love')
    expect(inserted).toBeDefined()

    if (!inserted) {
      throw new Error('Inserted node was not created')
    }

    const edgeFromAnchor = result.next?.edges.find(
      (edge: any) => edge.source === 'node-surprised' && edge.target === inserted.id
    )
    const edgeToNext = result.next?.edges.find((edge: any) => edge.source === inserted.id && edge.target === 'node-joy')

    expect(edgeFromAnchor).toBeDefined()
    expect(edgeToNext).toBeDefined()
  })

  it('appends a single-step insert to the current tail instead of between start and the first node', () => {
    const currentNodes: any[] = [
      {
        id: 'start',
        type: 'startNode',
        position: { x: 0, y: 0 },
        data: { label: 'Start' }
      },
      {
        id: 'node-idle',
        type: 'taskNode',
        position: { x: 150, y: 0 },
        data: {
          label: 'Idle',
          taskName: 'Idle',
          taskType: 'ACTION',
          properties: {}
        }
      },
      {
        id: 'node-joy',
        type: 'taskNode',
        position: { x: 300, y: 0 },
        data: {
          label: 'Joy',
          taskName: 'Joy',
          taskType: 'ACTION',
          properties: {}
        }
      }
    ]

    const currentEdges: any[] = [
      {
        id: 'edge-1',
        source: 'start',
        target: 'node-idle',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      },
      {
        id: 'edge-2',
        source: 'node-idle',
        target: 'node-joy',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      }
    ]

    const palette: any[] = [
      {
        kind: 'contentNode',
        label: 'Love',
        task: {
          id: 102,
          name: 'Love Task',
          taskType: 'ACTION',
          propertySchema: {}
        },
        content: {
          id: 1000,
          name: 'Love',
          contentTypeName: 'test',
          contentTypeId: 1,
          contentValue: '',
          contentVersion: 1,
          groupId: null,
          siteId: null
        }
      }
    ]

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [{ after: 'start', step: { label: 'Love', taskName: 'Love Task', taskType: 'ACTION' } }]
      },
      currentNodes,
      currentEdges,
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    expect(result.next).not.toBeNull()
    expect(result.clarification).toBeNull()

    const inserted = result.next?.nodes.find((node: any) => node.data?.label === 'Love')
    expect(inserted).toBeDefined()

    if (!inserted) {
      throw new Error('Inserted node was not created')
    }

    expect(result.next?.edges.some((edge: any) => edge.source === 'node-joy' && edge.target === inserted.id)).toBe(true)
    expect(result.next?.edges.some((edge: any) => edge.source === 'start' && edge.target === inserted.id)).toBe(false)
  })

  it('appends a single node to every current tail when the canvas has multiple active flows', () => {
    const currentNodes: any[] = [
      { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      {
        id: 'node-a',
        type: 'taskNode',
        position: { x: 150, y: 0 },
        data: { label: 'A', taskName: 'A', taskType: 'ACTION', properties: {} }
      },
      {
        id: 'node-b',
        type: 'taskNode',
        position: { x: 150, y: 200 },
        data: { label: 'B', taskName: 'B', taskType: 'ACTION', properties: {} }
      }
    ]
    const currentEdges: any[] = [
      {
        id: 'edge-1',
        source: 'start',
        target: 'node-a',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      },
      {
        id: 'edge-2',
        source: 'start',
        target: 'node-b',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      }
    ]

    const palette: any[] = [
      {
        kind: 'contentNode',
        label: 'X',
        task: { id: 201, name: 'X Task', taskType: 'ACTION', propertySchema: {} },
        content: {
          id: 2001,
          name: 'X',
          contentTypeName: 'test',
          contentTypeId: 1,
          contentValue: '',
          contentVersion: 1,
          groupId: null,
          siteId: null
        }
      }
    ]

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [{ after: '', step: { label: 'X', taskName: 'X Task', taskType: 'ACTION' }, appendOnly: true }]
      },
      currentNodes,
      currentEdges,
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    expect(result.next).not.toBeNull()
    const inserted = result.next?.nodes.filter((node: any) => node.data?.label === 'X')
    expect(inserted).toHaveLength(2)
    expect(result.next?.edges.filter((edge: any) => edge.source === 'node-a' || edge.source === 'node-b')).toHaveLength(
      2
    )
    expect(result.next?.edges.every((edge: any) => edge.target !== 'start')).toBe(true)
  })

  it('keeps an isolated chain independent from an existing flow when the first step is marked isolated', () => {
    const currentNodes: any[] = [
      { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      {
        id: 'node-a',
        type: 'taskNode',
        position: { x: 150, y: 0 },
        data: { label: 'A', taskName: 'A', taskType: 'ACTION', properties: {} }
      },
      {
        id: 'node-b',
        type: 'taskNode',
        position: { x: 300, y: 0 },
        data: { label: 'B', taskName: 'B', taskType: 'ACTION', properties: {} }
      }
    ]
    const currentEdges: any[] = [
      {
        id: 'edge-1',
        source: 'start',
        target: 'node-a',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      },
      {
        id: 'edge-2',
        source: 'node-a',
        target: 'node-b',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      }
    ]

    const palette: any[] = [
      {
        kind: 'contentNode',
        label: 'X',
        task: { id: 201, name: 'X Task', taskType: 'ACTION', propertySchema: {} },
        content: {
          id: 2001,
          name: 'X',
          contentTypeName: 'test',
          contentTypeId: 1,
          contentValue: '',
          contentVersion: 1,
          groupId: null,
          siteId: null
        }
      },
      {
        kind: 'contentNode',
        label: 'Y',
        task: { id: 202, name: 'Y Task', taskType: 'ACTION', propertySchema: {} },
        content: {
          id: 2002,
          name: 'Y',
          contentTypeName: 'test',
          contentTypeId: 1,
          contentValue: '',
          contentVersion: 1,
          groupId: null,
          siteId: null
        }
      }
    ]

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [
          { after: '', step: { label: 'X', taskName: 'X Task', taskType: 'ACTION' }, isolated: true },
          { after: 'X', step: { label: 'Y', taskName: 'Y Task', taskType: 'ACTION' }, appendOnly: true }
        ]
      },
      currentNodes,
      currentEdges,
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    expect(result.next).not.toBeNull()
    const xNode = result.next?.nodes.find((node: any) => node.data?.label === 'X')
    const yNode = result.next?.nodes.find((node: any) => node.data?.label === 'Y')
    expect(xNode).toBeDefined()
    expect(yNode).toBeDefined()
    expect(result.next?.edges.some((edge: any) => edge.source === 'start' && edge.target === xNode?.id)).toBe(false)
    expect(result.next?.edges.some((edge: any) => edge.source === xNode?.id && edge.target === yNode?.id)).toBe(true)
  })

  it('attaches a non-leading arrow chain to the active start-connected flow, not to detached branches', () => {
    const currentNodes: any[] = [
      { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      {
        id: 'node-a',
        type: 'taskNode',
        position: { x: 150, y: 0 },
        data: { label: 'A', taskName: 'A', taskType: 'ACTION', properties: {} }
      },
      {
        id: 'detached-node',
        type: 'taskNode',
        position: { x: 150, y: 260 },
        data: { label: 'Detached', taskName: 'Detached', taskType: 'ACTION', properties: {} }
      }
    ]
    const currentEdges: any[] = [
      {
        id: 'edge-1',
        source: 'start',
        target: 'node-a',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      }
    ]

    const palette: any[] = [
      {
        kind: 'contentNode',
        label: 'Agree',
        task: { id: 301, name: 'Agree Task', taskType: 'ACTION', propertySchema: {} },
        content: {
          id: 3001,
          name: 'Agree',
          contentTypeName: 'test',
          contentTypeId: 1,
          contentValue: '',
          contentVersion: 1,
          groupId: null,
          siteId: null
        }
      },
      {
        kind: 'contentNode',
        label: 'Move',
        task: { id: 302, name: 'Move Task', taskType: 'ACTION', propertySchema: {} },
        content: {
          id: 3002,
          name: 'Move',
          contentTypeName: 'test',
          contentTypeId: 1,
          contentValue: '',
          contentVersion: 1,
          groupId: null,
          siteId: null
        }
      }
    ]

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [
          { after: '', step: { label: 'Agree', taskName: 'Agree Task', taskType: 'ACTION' }, appendOnly: true },
          {
            after: 'Agree',
            step: { label: 'Move', taskName: 'Move Task', taskType: 'ACTION' },
            appendOnly: true,
            sourceHandle: 'left',
            targetHandle: 'left'
          }
        ]
      },
      currentNodes,
      currentEdges,
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    expect(result.next).not.toBeNull()
    const agreeNode = result.next?.nodes.find((node: any) => node.data?.label === 'Agree')
    const moveNode = result.next?.nodes.find((node: any) => node.data?.label === 'Move')
    expect(agreeNode).toBeDefined()
    expect(moveNode).toBeDefined()
    expect(result.next?.edges.some((edge: any) => edge.source === 'node-a' && edge.target === agreeNode?.id)).toBe(true)
    expect(
      result.next?.edges.some((edge: any) => edge.source === 'detached-node' && edge.target === agreeNode?.id)
    ).toBe(false)
    expect(result.next?.edges.some((edge: any) => edge.source === agreeNode?.id && edge.target === moveNode?.id)).toBe(
      true
    )
  })

  it('falls back to the current tail node when the requested anchor cannot be found', () => {
    const currentNodes: any[] = [
      {
        id: 'start',
        type: 'startNode',
        position: { x: 0, y: 0 },
        data: { label: 'Start' }
      },
      {
        id: 'node-idle',
        type: 'taskNode',
        position: { x: 150, y: 0 },
        data: {
          label: 'Idle',
          taskName: 'Idle',
          taskType: 'ACTION',
          properties: {}
        }
      },
      {
        id: 'node-joy',
        type: 'taskNode',
        position: { x: 300, y: 0 },
        data: {
          label: 'Joy',
          taskName: 'Joy',
          taskType: 'ACTION',
          properties: {}
        }
      }
    ]

    const currentEdges: any[] = [
      {
        id: 'edge-1',
        source: 'start',
        target: 'node-idle',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      },
      {
        id: 'edge-2',
        source: 'node-idle',
        target: 'node-joy',
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {},
        markerEnd: { type: 'arrow', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 }
      }
    ]

    const palette: any[] = [
      {
        kind: 'contentNode',
        label: 'New Step',
        task: {
          id: 101,
          name: 'New Step Task',
          taskType: 'ACTION',
          propertySchema: {}
        },
        content: {
          id: 999,
          name: 'New Step',
          contentTypeName: 'test',
          contentTypeId: 1,
          contentValue: '',
          contentVersion: 1,
          groupId: null,
          siteId: null
        }
      }
    ]

    const result = applyEditDraftToFlowDefinition(
      {
        mode: 'edit',
        insertAfter: [
          {
            after: 'MissingAnchor',
            step: { label: 'New Step', taskName: 'New Step Task', taskType: 'ACTION' }
          }
        ]
      },
      currentNodes,
      currentEdges,
      { x: 0, y: 0, zoom: 1 },
      palette
    )

    expect(result.next).not.toBeNull()
    expect(result.clarification).toBeNull()
    expect(result.next?.nodes).toHaveLength(4)

    const inserted = result.next?.nodes.find((node: any) => node.data?.label === 'New Step')
    expect(inserted).toBeDefined()

    if (!inserted) {
      throw new Error('Inserted node was not created')
    }

    const insertedEdge = result.next?.edges.find((edge: any) => edge.target === inserted.id)
    expect(insertedEdge?.source).toBe('node-joy')
  })
})
