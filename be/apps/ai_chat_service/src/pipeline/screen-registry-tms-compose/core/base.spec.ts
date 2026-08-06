import { buildLinearFlowDraftFromSteps } from './base'

describe('buildLinearFlowDraftFromSteps', () => {
  it('connects first new node from start when only start exists', () => {
    const draft = buildLinearFlowDraftFromSteps(
      { log: () => {} },
      {
        fullFlow: {
          nodes: [
            {
              id: 'start',
              type: 'startNode',
              position: { x: 0, y: 0 },
              data: { label: 'Start' },
            },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          flowMode: 'default',
        },
        taskContents: [
          {
            taskId: 1,
            taskName: 'MoveTo',
            kind: 'contentNode',
            contentId: 101,
            contentName: '위치A',
            label: '위치A',
          },
        ],
      },
      [
        {
          label: '위치A',
          taskName: 'MoveTo',
          contentName: '위치A',
        },
      ],
      'default',
    )

    expect(draft).toBeTruthy()

    const edges = Array.isArray((draft as Record<string, unknown>).edges)
      ? ((draft as Record<string, unknown>).edges as Array<Record<string, unknown>>)
      : []

    const firstNewEdge = edges.find((edge) => String(edge?.id ?? '').startsWith('ai-edge-'))
    expect(firstNewEdge).toBeTruthy()
    expect(String(firstNewEdge?.source ?? '')).toBe('start')
  })

  it('connects first new node from current tail when nodes already exist', () => {
    const draft = buildLinearFlowDraftFromSteps(
      { log: () => {} },
      {
        fullFlow: {
          nodes: [
            {
              id: 'start',
              type: 'startNode',
              position: { x: 0, y: 0 },
              data: { label: 'Start' },
            },
            {
              id: 'existing-1',
              type: 'taskNode',
              position: { x: 200, y: 0 },
              data: { label: '기존1', taskName: 'MoveTo', contentName: '기존1' },
            },
            {
              id: 'existing-2',
              type: 'taskNode',
              position: { x: 340, y: 0 },
              data: { label: '기존2', taskName: 'MoveTo', contentName: '기존2' },
            },
          ],
          edges: [
            { id: 'edge-start-1', source: 'start', target: 'existing-1' },
            { id: 'edge-1-2', source: 'existing-1', target: 'existing-2' },
          ],
          viewport: { x: 0, y: 0, zoom: 1 },
          flowMode: 'default',
        },
        taskContents: [
          {
            taskId: 1,
            taskName: 'MoveTo',
            kind: 'contentNode',
            contentId: 101,
            contentName: '위치A',
            label: '위치A',
          },
        ],
      },
      [
        {
          label: '위치A',
          taskName: 'MoveTo',
          contentName: '위치A',
        },
      ],
      'default',
    )

    expect(draft).toBeTruthy()

    const edges = Array.isArray((draft as Record<string, unknown>).edges)
      ? ((draft as Record<string, unknown>).edges as Array<Record<string, unknown>>)
      : []

    const firstNewEdge = edges.find((edge) => String(edge?.id ?? '').startsWith('ai-edge-'))
    expect(firstNewEdge).toBeTruthy()
    expect(String(firstNewEdge?.source ?? '')).toBe('existing-2')
  })

  it('builds a linear draft from contentless action tasks listed in taskList', () => {
    const draft = buildLinearFlowDraftFromSteps(
      { log: () => {} },
      {
        fullFlow: {
          nodes: [
            {
              id: 'start',
              type: 'startNode',
              position: { x: 0, y: 0 },
              data: { label: 'Start' },
            },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          flowMode: 'default',
        },
        taskList: [
          {
            taskId: 10,
            taskName: 'PlayMotion',
            label: 'PlayMotion',
          },
          {
            taskId: 11,
            taskName: 'Tts',
            label: 'Tts',
          },
        ],
      },
      [
        {
          label: 'PlayMotion',
        },
        {
          label: 'Tts',
        },
      ],
      'default',
    )

    expect(draft).toBeTruthy()

    const nodes = Array.isArray((draft as Record<string, unknown>).nodes)
      ? ((draft as Record<string, unknown>).nodes as Array<Record<string, unknown>>)
      : []

    expect(nodes).toHaveLength(3)
    expect(nodes[1]?.data).toMatchObject({ taskId: 10, taskName: 'PlayMotion', taskType: 'ACTION' })
    expect(nodes[2]?.data).toMatchObject({ taskId: 11, taskName: 'Tts', taskType: 'ACTION' })
  })
})
