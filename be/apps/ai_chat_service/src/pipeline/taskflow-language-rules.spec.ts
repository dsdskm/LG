import { clearTaskflowRulesCache, loadTaskflowClassifierRules, loadTaskflowOrchestratorRules } from './taskflow-language-rules'
import { registerRuleReader } from './rule-registry'

const CANVAS_ROUTE = 'tms/taskflows/:taskFlowId/canvas'

describe('taskflow rules loaded from the rule table', () => {
  afterEach(() => {
    registerRuleReader(null)
    clearTaskflowRulesCache()
  })

  it('reads phrase lists, booleans and numbers from rule.extra_json', async () => {
    registerRuleReader({
      listByAppAndScreen: async (appKey, screenKey) => {
        if (appKey !== 'tms' || screenKey !== CANVAS_ROUTE) return []
        return [
          { ruleKey: 'concurrentHintKeywords', extraJson: { value: ['하면서', '동시에'] }, enabled: true },
          { ruleKey: 'actionRequestKeywords', extraJson: { value: ['해줘'] }, enabled: true },
          { ruleKey: 'arrowSequenceEnabled', extraJson: { value: false }, enabled: true },
          { ruleKey: 'ruleFirstIntentConfidence', extraJson: { value: 0.97 }, enabled: true },
        ]
      },
    })

    const classifier = await loadTaskflowClassifierRules(CANVAS_ROUTE)
    expect(classifier.concurrentHintKeywords).toEqual(['하면서', '동시에'])
    expect(classifier.actionRequestKeywords).toEqual(['해줘'])
    expect(classifier.arrowSequenceEnabled).toBe(false)
    // 행이 없는 규칙은 코드 기본값 없이 빈 목록이 된다.
    expect(classifier.editVerbKeywords).toEqual([])

    const orchestrator = await loadTaskflowOrchestratorRules(CANVAS_ROUTE)
    expect(orchestrator.ruleFirstIntentConfidence).toBe(0.97)
  })

  it('falls back to the common scope and skips disabled rows', async () => {
    registerRuleReader({
      listByAppAndScreen: async (appKey, screenKey) => {
        if (appKey === 'common' && screenKey === 'common') {
          return [{ ruleKey: 'editSubjectKeywords', extraJson: { value: ['노드'] }, enabled: true }]
        }
        return [{ ruleKey: 'editVerbKeywords', extraJson: { value: ['구성'] }, enabled: false }]
      },
    })

    const classifier = await loadTaskflowClassifierRules(CANVAS_ROUTE)
    expect(classifier.editSubjectKeywords).toEqual(['노드'])
    expect(classifier.editVerbKeywords).toEqual([])
  })

  it('accepts a bare array in extra_json and the example column', async () => {
    registerRuleReader({
      listByAppAndScreen: async () => [
        { ruleKey: 'editVerbKeywords', extraJson: ['구성', '추가'], enabled: true },
        { ruleKey: 'editSubjectKeywords', extraJson: {}, example: ['노드'], enabled: true },
      ],
    })

    const classifier = await loadTaskflowClassifierRules(CANVAS_ROUTE)
    expect(classifier.editVerbKeywords).toEqual(['구성', '추가'])
    expect(classifier.editSubjectKeywords).toEqual(['노드'])
  })

  it('yields empty rules when no reader is registered', async () => {
    const classifier = await loadTaskflowClassifierRules(CANVAS_ROUTE)
    expect(classifier.concurrentHintKeywords).toEqual([])
    expect(classifier.editVerbKeywords).toEqual([])
  })
})
