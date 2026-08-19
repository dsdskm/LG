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

  it('falls back to a valid reply text when a single taskFlowId argument is used', () => {
    const runRule = commandRule('run-taskflow-command', {
      patternRegex: '^/\\s*run\\s+(?:(\\S+)\\s+(\\S+)|(\\S+))\\s*$',
      type: 'run-taskflow',
      robotId: ['$1', '$3'],
      taskFlowId: ['$2', '$3'],
      replyText: '로봇 $1 에서 태스크플로우 $2 실행을 요청합니다.',
      notFoundText: '실행할 로봇 또는 태스크플로우를 찾지 못했습니다.',
    })

    const matched = matchFrontRuleRows({ screenKey, message: '/run 79' }, [runRule])

    expect(matched?.toolArgs).toMatchObject({
      type: 'run-taskflow',
      taskFlowId: ['79'],
      replyText: '태스크플로우 79 실행을 요청합니다.',
    })
  })

  it('matches deploy, run, pause, resume, and stop commands from DB rule payloads', () => {
    const deployRule = commandRule('deploy-taskflow-command', {
      patternRegex: '^/\\s*deploy\\s+(?:(\\S+)\\s+(\\S+)|(\\S+))\\s*$',
      type: 'deploy-taskflow',
      robotId: ['$1', '$3'],
      taskFlowId: ['$2', '$3'],
      replyText: '로봇 $1 에서 태스크플로우 $2 배포를 요청합니다.',
      notFoundText: '배포할 로봇 또는 태스크플로우를 찾지 못했습니다.',
    })

    const runRule = commandRule('run-taskflow-command', {
      patternRegex: '^/\\s*run\\s+(?:(\\S+)\\s+(\\S+)|(\\S+))\\s*$',
      type: 'run-taskflow',
      robotId: ['$1', '$3'],
      taskFlowId: ['$2', '$3'],
      replyText: '로봇 $1 에서 태스크플로우 $2 실행을 요청합니다.',
      notFoundText: '실행할 로봇 또는 태스크플로우를 찾지 못했습니다.',
    })

    const pauseRule = commandRule('pause-taskflow-command', {
      patternRegex: '^/\\s*pause\\s+(?:(\\S+)\\s+(\\S+)|(\\S+))\\s*$',
      type: 'pause-taskflow',
      robotId: ['$1', '$3'],
      taskFlowId: ['$2', '$3'],
      replyText: '로봇 $1 에서 태스크플로우 $2 일시정지를 요청합니다.',
      notFoundText: '일시정지할 로봇 또는 태스크플로우를 찾지 못했습니다.',
    })

    const resumeRule = commandRule('resume-taskflow-command', {
      patternRegex: '^/\\s*resume\\s+(?:(\\S+)\\s+(\\S+)|(\\S+))\\s*$',
      type: 'resume-taskflow',
      robotId: ['$1', '$3'],
      taskFlowId: ['$2', '$3'],
      replyText: '로봇 $1 에서 태스크플로우 $2 재개를 요청합니다.',
      notFoundText: '재개할 로봇 또는 태스크플로우를 찾지 못했습니다.',
    })

    const stopRule = commandRule('stop-taskflow-command', {
      patternRegex: '^/\\s*stop\\s+(?:(\\S+)\\s+(\\S+)|(\\S+))\\s*$',
      type: 'stop-taskflow',
      robotId: ['$1', '$3'],
      taskFlowId: ['$2', '$3'],
      replyText: '로봇 $1 에서 태스크플로우 $2 정지를 요청합니다.',
      notFoundText: '정지할 로봇 또는 태스크플로우를 찾지 못했습니다.',
    })

    const deployMatched = matchFrontRuleRows({ screenKey, message: '/deploy robot-01 42' }, [deployRule])
    const runMatched = matchFrontRuleRows({ screenKey, message: '/run robot-02 7' }, [runRule])
    const pauseMatched = matchFrontRuleRows({ screenKey, message: '/pause robot-03 12' }, [pauseRule])
    const resumeMatched = matchFrontRuleRows({ screenKey, message: '/resume robot-04 13' }, [resumeRule])
    const stopMatched = matchFrontRuleRows({ screenKey, message: '/stop robot-05 14' }, [stopRule])
    const deploySingleArgMatched = matchFrontRuleRows({ screenKey, message: '/deploy 42' }, [deployRule])
    const runSingleArgMatched = matchFrontRuleRows({ screenKey, message: '/run AZ_U_qYSdRymNUa7uK_4' }, [runRule])

    expect(deployMatched?.toolArgs).toMatchObject({
      type: 'deploy-taskflow',
      robotId: ['robot-01'],
      taskFlowId: ['42'],
      replyText: '로봇 robot-01 에서 태스크플로우 42 배포를 요청합니다.',
    })
    expect(runMatched?.toolArgs).toMatchObject({
      type: 'run-taskflow',
      robotId: ['robot-02'],
      taskFlowId: ['7'],
      replyText: '로봇 robot-02 에서 태스크플로우 7 실행을 요청합니다.',
    })
    expect(pauseMatched?.toolArgs).toMatchObject({
      type: 'pause-taskflow',
      robotId: ['robot-03'],
      taskFlowId: ['12'],
      replyText: '로봇 robot-03 에서 태스크플로우 12 일시정지를 요청합니다.',
    })
    expect(resumeMatched?.toolArgs).toMatchObject({
      type: 'resume-taskflow',
      robotId: ['robot-04'],
      taskFlowId: ['13'],
      replyText: '로봇 robot-04 에서 태스크플로우 13 재개를 요청합니다.',
    })
    expect(stopMatched?.toolArgs).toMatchObject({
      type: 'stop-taskflow',
      robotId: ['robot-05'],
      taskFlowId: ['14'],
      replyText: '로봇 robot-05 에서 태스크플로우 14 정지를 요청합니다.',
    })
    expect(deploySingleArgMatched?.toolArgs).toMatchObject({
      type: 'deploy-taskflow',
      taskFlowId: ['42'],
    })
    expect(runSingleArgMatched?.toolArgs).toMatchObject({
      type: 'run-taskflow',
      robotId: ['AZ_U_qYSdRymNUa7uK_4'],
    })
  })
})