import { createComposeLinearTaskflowTool } from './index'
import * as chatSettingServiceModule from '../../db/chat-setting.service'

const mockLanguageRules: Record<string, unknown> = {
  'taskflowLanguageRules.common.composeNoisePhrases': ['태스크 플로우', '태스크플로우', 'taskflow', '캔버스', 'canvas'],
  'taskflowLanguageRules.common.requestTailPhrases': ['해줘', '해 줘', '해주세요', '부탁해', '부탁합니다', '구성해줘', '구성해 줘', '만들어줘', '만들어 줘', '생성해줘', '생성해 줘', '짜줘', '짜 줘', '연결해줘', '연결해 줘'],
  'taskflowLanguageRules.common.composeVerbPhrases': ['구성해줘', '구성해 줘', '만들어줘', '만들어 줘', '생성해줘', '생성해 줘', '짜줘', '짜 줘', '연결해줘', '연결해 줘', '해줘', '해 줘', '해주세요'],
  'taskflowLanguageRules.common.taskflowKeywordPhrases': ['태스크 플로우', '태스크 플로', '태스크플로우', '태스크플로', 'taskflow', 'taskflows'],
  'taskflowLanguageRules.common.composeSignalPhrases': ['태스크플로우', '태스크플로', 'taskflow', 'taskflows', 'taskflow구성', 'taskflow만들어', 'taskflow생성', 'taskflowcompose'],
  'taskflowLanguageRules.common.nodeLevelEditPhrases': ['노드 추가', '노드 수정', '노드 변경', '노드 삭제', '노드 지워', '노드 제거', '이후에', '뒤에'],
  'taskflowLanguageRules.common.nodePlaceholderPhrases': ['노드', '노드하나', '노드한개', 'task', 'tasks', '태스크', '작업', '스텝', '단계', '항목'],
  'taskflowLanguageRules.common.nodePlaceholderPrefixPhrases': ['노드', 'task', 'tasks', 'step', 'steps'],
  'taskflowLanguageRules.common.modeRequestPhrases': ['모드 바꿔', '모드 변경', '방향 바꿔', '방향 변경', '정렬 방향'],
  'taskflowLanguageRules.common.modeDirectionTreePhrases': ['세로 모드', '세로로', 'vertical', 'tree'],
  'taskflowLanguageRules.common.modeDirectionDefaultPhrases': ['가로 모드', '가로로', 'horizontal', 'default'],
  'taskflowLanguageRules.common.saveRequestPhrases': ['저장', '저장해줘', '저장해 줘'],
  'taskflowLanguageRules.common.saveDecisionHintPhrases': ['어떤', '무슨', '종류', '방식', '뭘로', '중에서'],
  'taskflowLanguageRules.common.saveTypeTempPhrases': ['임시 저장'],
  'taskflowLanguageRules.common.saveTypeFinalPhrases': ['정식 저장', '최종 저장'],
  'taskflowLanguageRules.common.resetAllPhrases': ['초기화', '리셋', 'reset'],
  'taskflowLanguageRules.common.deleteRequestPhrases': ['지워줘', '지워', '삭제해줘', '삭제해', '삭제', '제거해줘', '제거해', '제거', '없애줘', '없애'],
  'taskflowLanguageRules.common.deleteAllScopePhrases': ['전부', '전체', '모두', '모든', '싹다', '다', 'all', '모든 노드', '전체 노드'],
  'taskflowLanguageRules.common.alignRequestPhrases': ['정렬해줘', '정렬', '배치해줘', '배열해줘', 'arrange', 'align'],
  'taskflowLanguageRules.common.moveComposeHintPhrases': ['이동', 'move', '->', '→', '거쳐', '들러', '갔다가', '에서', '로'],
  'taskflowLanguageRules.common.pickupComposeHintPhrases': ['pickup', 'pick up', '픽업', '집기', '집어', '수거', '적재'],
  'taskflowLanguageRules.common.playMotionComposeHintPhrases': ['playmotion', 'play motion', '모션', '동작', '제스처', '포즈'],
  'taskflowLanguageRules.common.docentHintPhrases': ['도슨트', 'docent'],
  'taskflowLanguageRules.common.connectIntentPhrases': ['연결', '이어'],
  'taskflowLanguageRules.common.connectPairSeparatorPhrases': ['와'],
}

describe('createComposeLinearTaskflowTool', () => {
  beforeEach(() => {
    jest.spyOn(chatSettingServiceModule, 'getChatSettingService').mockReturnValue({
      get: async (key: string) => mockLanguageRules[key],
    } as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

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

  it('builds a linear draft when arrow steps match direct action task names', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      {
        steps: [],
      },
      {
        context: {
          __userMessage: 'PlayMotion -> Tts 태스크플로우 만들어줘',
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
            taskList: [
              { taskId: 10, taskName: 'PlayMotion', label: 'PlayMotion' },
              { taskId: 11, taskName: 'Tts', label: 'Tts' },
            ],
            taskContents: [
              { taskId: 10, taskName: 'PlayMotion', kind: 'contentNode', contentId: 101, contentName: 'PlayMotion', label: 'PlayMotion' },
              { taskId: 11, taskName: 'Tts', kind: 'contentNode', contentId: 102, contentName: 'Tts', label: 'Tts' },
            ],
          },
        },
        log: { log: () => {}, error: () => {} },
      } as any,
    )

    expect((result as Record<string, unknown>).clarification).toBeUndefined()
    expect((result as Record<string, unknown>).canvasDraft).toBeTruthy()
  })
})