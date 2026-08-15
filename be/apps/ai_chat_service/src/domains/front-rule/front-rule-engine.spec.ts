import type { ChatRuleEntity } from '../../features/chat-settings/db/chat-rule.entity'
import { matchFrontRuleRows } from './front-rule-engine'

const screenKey = 'tms/taskflows/:taskFlowId/canvas'

function commandRule(
  ruleKey: string,
  valueJson: Record<string, unknown>,
  priority = 100,
): ChatRuleEntity {
  return {
    id: priority,
    appKey: 'tms',
    screenKey,
    ruleType: 'taskflow-command',
    ruleKey,
    valueJson,
    enabled: true,
    priority,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
}

describe('matchFrontRuleRows', () => {
  it('matches an alias command from its DB rule', () => {
    const rules = [commandRule('undo', { aliases: ['/undo'], type: 'undo', replyText: '되돌렸습니다.' })]
    const matched = matchFrontRuleRows(
      { screenKey, message: '/undo' },
      rules,
    )

    expect(matched?.ruleKey).toBe('undo')
    expect(matched?.toolArgs).toMatchObject({ type: 'undo', replyText: '되돌렸습니다.' })
    expect(matchFrontRuleRows({ screenKey, message: 'please /undo now' }, rules)).toBeNull()
  })

  it('interpolates regex captures in command values and reply text', () => {
    const matched = matchFrontRuleRows(
      { screenKey, message: '!Joy' },
      [
        commandRule('delete-node-by-name', {
          patternRegex: '^!\\s*(\\S(?:.*\\S)?)\\s*$',
          type: 'remove-nodes-by-name',
          names: ['$1'],
          replyText: '$1 노드를 삭제했습니다.',
          notFoundText: '삭제할 $1 노드가 없습니다.',
        }),
      ],
    )

    expect(matched?.captures).toEqual(['Joy'])
    expect(matched?.toolArgs).toMatchObject({
      type: 'remove-nodes-by-name',
      names: ['Joy'],
      replyText: 'Joy 노드를 삭제했습니다.',
      notFoundText: '삭제할 Joy 노드가 없습니다.',
    })
  })
})