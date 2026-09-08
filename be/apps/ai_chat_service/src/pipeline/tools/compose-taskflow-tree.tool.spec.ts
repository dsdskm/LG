import { wrapConcurrentRootsIfNeeded, type TaskflowTreeNode } from './compose-taskflow-tree.tool'
import { clearTaskflowRulesCache } from '../taskflow-language-rules'
import { registerRuleReader } from '../rule-registry'

const store = {
  list: () => [
    { taskName: 'Parallel', taskType: 'CONTROL', composeHint: { intent: 'concurrent' } },
    { taskName: 'MoveTo', taskType: 'ACTION', composeHint: {} },
  ],
  get: (name: string) =>
    name === 'Parallel' ? { taskName: 'Parallel', taskType: 'CONTROL', composeHint: { intent: 'concurrent' } } : undefined,
} as any

const action = (taskName: string, contentName: string): TaskflowTreeNode => ({
  taskName,
  taskType: 'ACTION',
  contentName,
  children: [],
})

const ctxFor = (message: string) => ({ context: { __userMessage: message } }) as any

describe('wrapConcurrentRootsIfNeeded', () => {
  beforeEach(() => {
    registerRuleReader({
      listByAppAndScreen: async () => [
        { ruleKey: 'concurrentHintKeywords', extraJson: { value: ['하면서', '동시에'] }, enabled: true },
      ],
    })
    clearTaskflowRulesCache()
  })

  afterEach(() => {
    registerRuleReader(null)
    clearTaskflowRulesCache()
  })

  const flatRoots = () => [
    action('MoveTo', '도슨트 대기'),
    action('PlaySound', '이동 음악'),
    action('PlayFace', 'Joy'),
  ]

  it('groups flat actions under the concurrent control task', async () => {
    const roots = await wrapConcurrentRootsIfNeeded(
      flatRoots(),
      store,
      ctxFor('도슨트 대기로 이동하면서, 이동 음악 재생하고, Joy 얼굴 표시되게 해줘'),
    )

    expect(roots).toHaveLength(1)
    expect(roots[0]).toMatchObject({ taskName: 'Parallel', taskType: 'CONTROL' })
    expect(roots[0].children.map((child) => child.contentName)).toEqual(['도슨트 대기', '이동 음악', 'Joy'])
  })

  it('keeps sequential requests as separate roots', async () => {
    const roots = await wrapConcurrentRootsIfNeeded(
      flatRoots(),
      store,
      ctxFor('안내 멘트 말하고 도슨트 대기로 이동해줘'),
    )

    expect(roots).toHaveLength(3)
  })

  it('respects a control node the model already produced', async () => {
    const already: TaskflowTreeNode[] = [
      { taskName: 'Parallel', taskType: 'CONTROL', children: flatRoots() },
      action('Tts', '안내 멘트'),
    ]

    const roots = await wrapConcurrentRootsIfNeeded(already, store, ctxFor('동시에 해줘'))
    expect(roots).toBe(already)
  })

  it('does nothing when no task carries the concurrent intent', async () => {
    const withoutIntent = { list: () => [], get: () => undefined } as any
    const input = flatRoots()

    const roots = await wrapConcurrentRootsIfNeeded(input, withoutIntent, ctxFor('동시에 해줘'))
    expect(roots).toBe(input)
  })
})
