import { createComposeLinearTaskflowTool } from './index'
import * as taskflowRuleRepo from '../../features/taskflow/db/taskflow-rule.repo'
import {
  clearTaskflowRulesCache,
  loadTaskflowClassifierRules,
  loadTaskflowLanguageRules,
  loadTaskflowOrchestratorRules,
} from '../taskflow-language-rules'

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
  const routeScope = 'tms/taskflows/:taskFlowId/canvas'

  beforeEach(() => {
    clearTaskflowRulesCache(routeScope)
    jest.spyOn(taskflowRuleRepo, 'listTaskflowRuleRows').mockImplementation(async (_ruleType, scopes) => {
      const requestedScopes = Array.isArray(scopes) ? scopes : []
      return Object.entries(mockLanguageRules)
        .map(([key, value]) => {
          const parsed = taskflowRuleRepo.parseLegacyTaskflowSettingKey(key)
          if (!parsed) return null
          if (!requestedScopes.includes(routeScope) && !requestedScopes.includes(parsed.scopeKey)) return null
          if (parsed.scopeKey !== routeScope && parsed.scopeKey !== 'common') return null
          return {
            ruleType: parsed.ruleType,
            scopeKey: parsed.scopeKey === 'common' ? routeScope : parsed.scopeKey,
            ruleKey: parsed.ruleKey,
            valueJson: value,
            enabled: true,
            priority: 200,
          }
        })
        .filter(Boolean) as any[]
    })
  })

  it('returns empty backend defaults when no taskflow rules are configured in the DB', async () => {
    jest.spyOn(taskflowRuleRepo, 'listTaskflowRuleRows').mockResolvedValue([])

    const languageRules = await loadTaskflowLanguageRules('tms/taskflows/:taskFlowId/canvas')
    const classifierRules = await loadTaskflowClassifierRules('tms/taskflows/:taskFlowId/canvas')
    const orchestratorRules = await loadTaskflowOrchestratorRules('tms/taskflows/:taskFlowId/canvas')

    expect(languageRules.composeNoisePhrases).toEqual([])
    expect(languageRules.taskflowKeywordPhrases).toEqual([])
    expect(classifierRules.arrowSequenceEnabled).toBe(false)
    expect(classifierRules.explanationImageMinScore).toBe(0)
    expect(orchestratorRules.nodeNameOnlyMaxLength).toBe(0)
    expect(orchestratorRules.ruleFirstIntentConfidence).toBe(0)
    expect(orchestratorRules.actionRetryComposeExample).toBe('')
  })

  afterEach(() => {
    clearTaskflowRulesCache(routeScope)
    jest.restoreAllMocks()
  })

  it('asks for arrow chain format when message is missing', async () => {
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
    expect(String((result as Record<string, unknown>).clarification ?? '')).toContain('A->B')
    expect((result as Record<string, unknown>).needUserInput).toBe(true)
    expect((result as Record<string, unknown>).canvasDraft).toBeUndefined()
  })

  it('asks for arrow chain format when message has no chain', async () => {
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
    expect(String((result as Record<string, unknown>).clarification ?? '')).toContain('A->B')
  })

  it('builds edit plan when arrow chain matches known task contents', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      {
        steps: [],
      },
      {
        context: {
          __userMessage: 'PlayMotion->Tts 연결해줘',
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

  it('returns edit remove plan for "A 노드 제거" message', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      { steps: [] },
      {
        context: {
          __userMessage: '회의실 A 노드 제거해줘',
          taskflow: {
            nodes: [
              { id: 'start', label: 'Start' },
              { id: 'n1', label: '회의실 A', taskName: 'MoveTo', contentName: '회의실 A' },
            ],
            taskContents: [
              { taskId: 29, taskName: 'MoveTo', kind: 'contentNode', contentId: 30, contentName: '회의실 A', label: '회의실 A' },
            ],
          },
        },
        log: { log: () => {}, error: () => {} },
      } as any,
    )

    const canvasDraft = (result as Record<string, any>)?.canvasDraft
    expect(canvasDraft).toBeTruthy()
    expect(canvasDraft.mode).toBe('edit')
    expect(canvasDraft.removeByName).toEqual(['회의실 A'])
  })

  it('returns edit insert plan for "B 노드 추가" message', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      { steps: [] },
      {
        context: {
          __userMessage: '회의실 B 노드 추가해줘',
          taskflow: {
            nodes: [
              { id: 'start', label: 'Start' },
            ],
            taskContents: [
              { taskId: 29, taskName: 'MoveTo', kind: 'contentNode', contentId: 31, contentName: '회의실 B', label: '회의실 B' },
            ],
          },
        },
        log: { log: () => {}, error: () => {} },
      } as any,
    )

    const canvasDraft = (result as Record<string, any>)?.canvasDraft
    expect(canvasDraft).toBeTruthy()
    expect(canvasDraft.mode).toBe('edit')
    expect(Array.isArray(canvasDraft.insertAfter)).toBe(true)
    expect(canvasDraft.insertAfter[0]?.after).toBe('')
    expect(String(canvasDraft.insertAfter[0]?.step?.label ?? '')).toBe('회의실 B')
  })

  it('returns edit insert plan for "A->B" chain with Korean labels', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      { steps: [] },
      {
        context: {
          __userMessage: '대회의실->사무공간 연결해줘',
          taskflow: {
            nodes: [
              { id: 'start', label: 'Start' },
              { id: 'n1', label: '대회의실', taskName: 'MoveTo', contentName: '대회의실' },
            ],
            taskContents: [
              { taskId: 29, taskName: 'MoveTo', kind: 'contentNode', contentId: 301, contentName: '대회의실', label: '대회의실' },
              { taskId: 29, taskName: 'MoveTo', kind: 'contentNode', contentId: 302, contentName: '사무공간', label: '사무공간' },
            ],
          },
        },
        log: { log: () => {}, error: () => {} },
      } as any,
    )

    const canvasDraft = (result as Record<string, any>)?.canvasDraft
    expect(canvasDraft).toBeTruthy()
    expect(canvasDraft.mode).toBe('edit')
    expect(Array.isArray(canvasDraft.insertAfter)).toBe(true)
    expect(canvasDraft.insertAfter.length).toBe(1)
    expect(String(canvasDraft.insertAfter[0]?.after ?? '')).toBe('대회의실')
    expect(String(canvasDraft.insertAfter[0]?.step?.label ?? '')).toBe('사무공간')
  })

  it('supports arrow chains that resolve control nodes as well as action nodes', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      { steps: [] },
      {
        context: {
          __userMessage: 'Parallel->MoveTo 연결해줘',
          taskflow: {
            nodes: [
              { id: 'start', label: 'Start' },
            ],
            taskContents: [
              { taskId: 1, taskName: 'Parallel', kind: 'controlTaskNode', contentId: 1001, contentName: 'Parallel', label: 'Parallel' },
              { taskId: 2, taskName: 'MoveTo', kind: 'contentNode', contentId: 1002, contentName: '회의실 A', label: '회의실 A' },
            ],
          },
        },
        log: { log: () => {}, error: () => {} },
      } as any,
    )

    const canvasDraft = (result as Record<string, any>)?.canvasDraft
    expect(canvasDraft).toBeTruthy()
    expect(canvasDraft.mode).toBe('edit')
    expect(Array.isArray(canvasDraft.insertAfter)).toBe(true)
    expect(canvasDraft.insertAfter.length).toBe(1)
    expect(String(canvasDraft.insertAfter[0]?.step?.taskType ?? '')).toBe('CONTROL')
    expect(String(canvasDraft.insertAfter[0]?.step?.label ?? '')).toBe('Parallel')
  })

  it('adds only the trailing node when the first chain node already exists', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      { steps: [] },
      {
        context: {
          __userMessage: 'And->Delay 연결해줘',
          taskflow: {
            nodes: [
              { id: 'start', label: 'Start' },
              { id: 'n1', label: 'And', taskName: 'And', contentName: 'And' },
            ],
            taskContents: [
              { taskId: 10, taskName: 'And', kind: 'contentNode', contentId: 1001, contentName: 'And', label: 'And' },
              { taskId: 11, taskName: 'Delay', kind: 'contentNode', contentId: 1002, contentName: 'Delay', label: 'Delay' },
            ],
          },
        },
        log: { log: () => {}, error: () => {} },
      } as any,
    )

    const canvasDraft = (result as Record<string, any>)?.canvasDraft
    expect(canvasDraft).toBeTruthy()
    expect(Array.isArray(canvasDraft.insertAfter)).toBe(true)
    expect(canvasDraft.insertAfter.length).toBe(1)
    expect(String(canvasDraft.insertAfter[0]?.after ?? '')).toBe('And')
    expect(String(canvasDraft.insertAfter[0]?.step?.label ?? '')).toBe('Delay')
    expect(String((result as Record<string, any>)?.assistantText ?? '')).toContain('Delay')
    expect(String((result as Record<string, any>)?.assistantText ?? '')).not.toContain(' 처리된 노드: And')
  })

  it('falls back to appending after the existing tail when the anchor node is missing', async () => {
    const tool = createComposeLinearTaskflowTool({
      logger: { log: () => {}, error: () => {} } as any,
    })

    const result = await tool.execute(
      { steps: [] },
      {
        context: {
          __userMessage: 'Idle->Joy 연결해줘',
          taskflow: {
            nodes: [
              { id: 'start', label: 'Start' },
              { id: 'n1', label: 'Idle', taskName: 'Idle', contentName: 'Idle' },
            ],
            taskContents: [
              { taskId: 10, taskName: 'Idle', kind: 'contentNode', contentId: 1001, contentName: 'Idle', label: 'Idle' },
              { taskId: 11, taskName: 'Joy', kind: 'contentNode', contentId: 1002, contentName: 'Joy', label: 'Joy' },
            ],
          },
        },
        log: { log: () => {}, error: () => {} },
      } as any,
    )

    const canvasDraft = (result as Record<string, any>)?.canvasDraft
    expect(canvasDraft).toBeTruthy()
    expect(Array.isArray(canvasDraft.insertAfter)).toBe(true)
    expect(canvasDraft.insertAfter.length).toBe(1)
    expect(String(canvasDraft.insertAfter[0]?.after ?? '')).toBe('Idle')
    expect(String(canvasDraft.insertAfter[0]?.step?.label ?? '')).toBe('Joy')
    expect(String((result as Record<string, any>)?.assistantText ?? '')).toContain('Joy')
  })
})