import { createComposeLinearTaskflowTool } from './index'

describe('createComposeLinearTaskflowTool', () => {
  it('recovers docent intent from provided steps even when __userMessage is missing', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      {
        steps: [
          {
            label: '도슨트',
            taskName: 'MoveTo',
            contentName: '도슨트',
          },
        ],
      },
      {
        context: {
          taskflow: {
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
              { taskId: 27, taskName: 'Parallel', kind: 'controlTaskNode', label: 'Parallel' },
              { taskId: 29, taskName: 'MoveTo', kind: 'contentNode', contentId: 31, contentName: '충전 스테이션 1', label: '충전 스테이션 1' },
              { taskId: 29, taskName: 'MoveTo', kind: 'contentNode', contentId: 30, contentName: '회의실 A', label: '회의실 A' },
              { taskId: 30, taskName: 'PlayFace', kind: 'contentNode', contentId: 601, contentName: '웃는얼굴', label: '웃는얼굴' },
              { taskId: 31, taskName: 'PlaySound', kind: 'contentNode', contentId: 605, contentName: '이동', label: '이동' },
              { taskId: 32, taskName: 'PlayMotion', kind: 'contentNode', contentId: 606, contentName: '이동모션', label: '이동모션' },
              { taskId: 40, taskName: 'Tts', kind: 'contentNode', contentId: 5907, contentName: 'a코스', label: 'a코스' },
            ],
          },
        },
        log: { log: () => {}, error: () => {} },
      } as any,
    )

    expect(result).toBeTruthy()
    expect((result as Record<string, unknown>).clarification).toBeUndefined()
    expect((result as Record<string, unknown>).canvasDraft).toBeTruthy()
  })

  it('asks for valid move node names when requested names are missing', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      {
        steps: [],
      },
      {
        context: {
          __userMessage: '없는위치1에서 없는위치2로 가는 이동 태스크플로우 구성해줘',
          taskflow: {
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
              { taskId: 27, taskName: 'Parallel', kind: 'controlTaskNode', label: 'Parallel' },
              { taskId: 29, taskName: 'MoveTo', kind: 'contentNode', contentId: 31, contentName: '충전 스테이션 1', label: '충전 스테이션 1' },
              { taskId: 29, taskName: 'MoveTo', kind: 'contentNode', contentId: 30, contentName: '회의실 A', label: '회의실 A' },
              { taskId: 30, taskName: 'PlayFace', kind: 'contentNode', contentId: 601, contentName: '웃는얼굴', label: '웃는얼굴' },
              { taskId: 31, taskName: 'PlaySound', kind: 'contentNode', contentId: 605, contentName: '이동', label: '이동' },
            ],
          },
        },
        log: { log: () => {}, error: () => {} },
      } as any,
    )

    expect((result as Record<string, unknown>).canvasDraft).toBeUndefined()
    expect((result as Record<string, unknown>).needUserInput).toBe(true)
    expect(String((result as Record<string, unknown>).clarification ?? '')).toContain('MoveTo 노드 이름으로 다시 알려주세요')
  })
})