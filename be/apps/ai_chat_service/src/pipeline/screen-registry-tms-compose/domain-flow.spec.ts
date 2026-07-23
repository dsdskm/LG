import { buildPickupPutDownFlowDraftFromMessage } from './domain-flow'

describe('buildPickupPutDownFlowDraftFromMessage', () => {
  it('builds PickUp -> DoesObjectExist -> PutDown for english pickup phrase', () => {
    const draft = buildPickupPutDownFlowDraftFromMessage(
      { log: () => {} },
      {
        fullFlow: {
          nodes: [
            {
              id: 'start',
              type: 'startNode',
              position: { x: 0, y: 0 },
              data: { label: 'Start', role: 'start' },
            },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          flowMode: 'default',
        },
        taskContents: [
          {
            taskId: 101,
            taskName: 'PickUp',
            kind: 'contentNode',
            contentId: 201,
            contentName: '사과',
            label: '사과',
          },
          {
            taskId: 102,
            taskName: 'DoesObjectExist',
            kind: 'contentNode',
            contentId: 205,
            contentName: '사과',
            label: '사과',
          },
          {
            taskId: 103,
            taskName: 'PutDown',
            kind: 'contentNode',
            contentId: 202,
            contentName: '사과',
            label: '사과',
          },
          {
            taskId: 104,
            taskName: 'PickUp',
            kind: 'contentNode',
            contentId: 203,
            contentName: '바나나',
            label: '바나나',
          },
          {
            taskId: 105,
            taskName: 'DoesObjectExist',
            kind: 'contentNode',
            contentId: 206,
            contentName: '바나나',
            label: '바나나',
          },
          {
            taskId: 106,
            taskName: 'PutDown',
            kind: 'contentNode',
            contentId: 204,
            contentName: '바나나',
            label: '바나나',
          },
        ],
      },
      '사과 pickup 태스크 플로 구성해줘',
      'default',
    )

    expect(draft).toBeTruthy()

    const nodes = Array.isArray((draft as Record<string, unknown>).nodes)
      ? ((draft as Record<string, unknown>).nodes as Array<Record<string, unknown>>)
      : []

    const taskNodes = nodes.filter((node) => String(node.id ?? '') !== 'start')
    expect(taskNodes).toHaveLength(3)

    const taskNames = taskNodes.map((node) => {
      const data = node.data as Record<string, unknown>
      return String(data?.taskName ?? '')
    })
    expect(taskNames).toEqual(['PickUp', 'DoesObjectExist', 'PutDown'])

    const contentNames = taskNodes.map((node) => {
      const data = node.data as Record<string, unknown>
      return String(data?.contentName ?? '')
    })
    expect(contentNames).toEqual(['사과', '사과', '사과'])
  })

  it('appends pickup flow from the current tail node when non-start nodes already exist', () => {
    const draft = buildPickupPutDownFlowDraftFromMessage(
      { log: () => {} },
      {
        fullFlow: {
          nodes: [
            {
              id: 'start',
              type: 'startNode',
              position: { x: 0, y: 0 },
              data: { label: 'Start', role: 'start' },
            },
            {
              id: 'existing-1',
              type: 'taskNode',
              position: { x: 200, y: 0 },
              data: { label: '기존', taskName: 'MoveTo', contentName: '기존' },
            },
          ],
          edges: [
            {
              id: 'edge-start-existing',
              source: 'start',
              target: 'existing-1',
            },
          ],
          viewport: { x: 0, y: 0, zoom: 1 },
          flowMode: 'default',
        },
        taskContents: [
          {
            taskId: 101,
            taskName: 'PickUp',
            kind: 'contentNode',
            contentId: 201,
            contentName: '사과',
            label: '사과',
          },
          {
            taskId: 102,
            taskName: 'DoesObjectExist',
            kind: 'contentNode',
            contentId: 205,
            contentName: '사과',
            label: '사과',
          },
          {
            taskId: 103,
            taskName: 'PutDown',
            kind: 'contentNode',
            contentId: 202,
            contentName: '사과',
            label: '사과',
          },
        ],
      },
      '사과 pickup 태스크 플로 구성해줘',
      'default',
    )

    expect(draft).toBeTruthy()

    const edges = Array.isArray((draft as Record<string, unknown>).edges)
      ? ((draft as Record<string, unknown>).edges as Array<Record<string, unknown>>)
      : []

    const firstPickupEdge = edges.find((edge) => String(edge?.target ?? '').startsWith('ai-pickup-'))
    expect(firstPickupEdge).toBeTruthy()
    expect(String(firstPickupEdge?.source ?? '')).toBe('existing-1')
  })
})
