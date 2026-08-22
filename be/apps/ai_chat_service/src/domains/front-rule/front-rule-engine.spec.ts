import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ChatRuleEntity } from '../../features/chat-settings/db/chat-rule.entity'
import { ChatRuleService } from '../../features/chat-settings/db/chat-rule.service'
import { matchFrontRule, matchFrontRuleRows } from './front-rule-engine'

const screenKey = 'tms/taskflows/:taskFlowId/canvas'

function commandRule(
  ruleKey: string,
  extraJson: Record<string, unknown>,
  priority = 100,
): ChatRuleEntity {
  return {
    id: priority,
    appKey: 'tms',
    screenKey,
    ruleType: 'taskflow-command',
    ruleKey,
    extraJson,
    enabled: true,
    priority,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
}

describe('ChatRuleService', () => {
  it('loads parameterized screen rules for taskflow canvas routes', async () => {
    const repository = {
      find: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 1,
            appKey: 'tms',
            screenKey: 'tms/taskflows/:taskFlowId/canvas',
            ruleType: 'taskflow-command',
            ruleKey: 'create-taskflow-command',
            extraJson: { type: 'create-taskflow' },
            enabled: true,
            priority: 100,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          },
        ]),
    }

    const service = new ChatRuleService(repository as any)
    const rows = await service.listByAppAndScreen('tms', 'tms/taskflows/197/canvas')

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      appKey: 'tms',
      screenKey: 'tms/taskflows/:taskFlowId/canvas',
      ruleKey: 'create-taskflow-command',
    })
  })
})

describe('matchFrontRuleRows', () => {
  it('matches /copy 197 and /copy 197 name when patternRegex has optional name capture', () => {
    const rule = {
      id: 1,
      appKey: 'tms',
      screenKey,
      ruleType: 'taskflow-command',
      ruleKey: 'taskflow-copy',
      command: '/copy',
      pattern: '/copy',
      patternRegex: '^/copy\\s+(\\d+)(?:\\s+(.+))?$',
      aliases: ['/copy'],
      description: 'TaskFlow를 복사합니다.',
      replyText: 'TaskFlow를 복사합니다.',
      example: ['/copy 197', '/copy 197 신규 이름'],
      enabled: true,
      priority: 100,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as any

    const rawPattern = String(rule.patternRegex ?? '').trim()
    const regex = new RegExp(rawPattern, 'i')

    expect(regex.toString()).toBe('/^\\/copy\\s+(\\d+)(?:\\s+(.+))?$/i')
    expect(regex.test('/copy 197')).toBe(true)
    expect(regex.test('/copy 197 abc')).toBe(true)
    expect(regex.test('/copy 197 sample name')).toBe(true)
    expect(regex.test('/copy 1')).toBe(true)
    expect(regex.test('/copy 12345')).toBe(true)
    expect(regex.test('/copy abc')).toBe(false)
    expect(regex.test('/copy')).toBe(false)
    expect(regex.test('/copy197')).toBe(false)

    const matched = matchFrontRuleRows({ screenKey, message: '/copy 197' }, [rule])
    expect(matched).not.toBeNull()
    expect(matched?.ruleKey).toBe('taskflow-copy')
    expect(matched?.params).toEqual([197])

    const namedMatched = matchFrontRuleRows({ screenKey, message: '/copy 197 신규 이름' }, [rule])
    expect(namedMatched).not.toBeNull()
    expect(namedMatched?.ruleKey).toBe('taskflow-copy')
    expect(namedMatched?.params).toEqual([197, '신규 이름'])
  })

  it('matches a rule stored directly on top-level columns without legacy json payloads', () => {
    const rules = [{
      id: 1,
      appKey: 'tms',
      screenKey,
      ruleType: 'taskflow-command',
      ruleKey: 'undo',
      type: 'undo',
      command: '/undo',
      pattern: '/undo',
      patternRegex: '^/undo$',
      aliases: ['/undo'],
      description: '이전 동작을 취소한다.',
      replyText: '되돌렸습니다.',
      example: ['/undo'],
      enabled: true,
      priority: 100,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }] as any

    const matched = matchFrontRuleRows({ screenKey, message: '/undo' }, rules)

    expect(matched?.ruleKey).toBe('undo')
    expect(matched?.toolArgs).toMatchObject({ type: 'undo', replyText: '되돌렸습니다.' })
  })

  it('keeps the raw matched rule data and honors navigation/replyText from extraJson', () => {
    const rule = {
      id: 11,
      appKey: 'tms',
      screenKey,
      ruleKey: 'taskflow-list',
      command: '/list',
      pattern: '/list',
      patternRegex: '^/list$',
      replyText: '목록으로 이동합니다.',
      extraJson: {
        navigation: 'tms/taskflows',
        replyText: '태스크플로우 목록으로 이동합니다.',
      },
      enabled: true,
      priority: 100,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as any

    const matched = matchFrontRuleRows({ screenKey, message: '/list' }, [rule])

    expect(matched).not.toBeNull()
    expect(matched?.ruleKey).toBe('taskflow-list')
    expect(matched?.ruleData).toBe(rule)
    expect(matched?.ruleData?.extraJson).toMatchObject({ navigation: 'tms/taskflows' })
    expect(matched?.toolArgs).toMatchObject({ replyText: '태스크플로우 목록으로 이동합니다.' })
  })

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

  it('filters rules by appKey before matching', () => {
    const tmsRule = {
      id: 1,
      appKey: 'tms',
      screenKey,
      ruleKey: 'taskflow-list',
      command: '/list',
      pattern: '/list',
      patternRegex: '^/list$',
      replyText: 'TMS 목록으로 이동합니다.',
      enabled: true,
      priority: 100,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as any

    const robotRule = {
      id: 2,
      appKey: 'robot',
      screenKey,
      ruleKey: 'robot-list',
      command: '/list',
      pattern: '/list',
      patternRegex: '^/list$',
      replyText: '로봇 목록으로 이동합니다.',
      enabled: true,
      priority: 100,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as any

    const matched = matchFrontRuleRows({ screenKey, appKey: 'robot', message: '/list' }, [tmsRule, robotRule])

    expect(matched).not.toBeNull()
    expect(matched?.ruleKey).toBe('robot-list')
    expect(matched?.ruleData?.appKey).toBe('robot')
  })

  it('matches alias arrays stored as JSONB payloads', () => {
    const rules = [{
      id: 3,
      appKey: 'tms',
      screenKey,
      ruleKey: 'undo-jsonb',
      ruleType: 'taskflow-command',
      type: 'undo',
      command: null,
      pattern: null,
      patternRegex: null,
      aliases: { default: ['/undo', '/되돌리기'] },
      description: '이전 동작을 취소한다.',
      replyText: '되돌렸습니다.',
      example: ['/undo'],
      enabled: true,
      priority: 100,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }] as any

    const matched = matchFrontRuleRows({ screenKey, message: '/되돌리기' }, rules)

    expect(matched).not.toBeNull()
    expect(matched?.ruleKey).toBe('undo-jsonb')
    expect(matched?.toolArgs).toMatchObject({ type: 'undo', replyText: '되돌렸습니다.' })
  })

  it('ignores null pattern data and still matches via alias-only rows', () => {
    const rules = [{
      id: 2,
      appKey: 'tms',
      screenKey,
      ruleKey: 'taskflow-help',
      ruleType: 'taskflow-command',
      type: 'taskflow-help',
      command: null,
      pattern: null,
      patternRegex: null,
      aliases: ['/help', '/?'],
      description: '도움말을 보여줍니다.',
      replyText: '도움말을 보여줍니다.',
      example: ['/help', '/?'],
      enabled: true,
      priority: 100,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }] as any

    const matched = matchFrontRuleRows({ screenKey, message: '/?' }, rules)

    expect(matched).not.toBeNull()
    expect(matched?.ruleKey).toBe('taskflow-help')
    expect(matched?.toolArgs).toMatchObject({ type: 'taskflow-help', replyText: '도움말을 보여줍니다.' })
  })

  it('matches a pattern when zero-width or hidden characters are embedded in the rule text', () => {
    const rules = [{
      id: 99,
      appKey: 'tms',
      screenKey,
      ruleKey: 'taskflow-list',
      ruleType: 'taskflow-command',
      type: 'taskflow-list',
      command: null,
      pattern: '/list\u200B',
      patternRegex: '^/?list\s*$',
      aliases: null,
      description: '목록을 보여줍니다.',
      replyText: '목록을 보여드립니다.',
      example: ['/list'],
      enabled: true,
      priority: 100,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }] as any

    const matched = matchFrontRuleRows({ screenKey, message: '/list' }, rules)

    expect(matched).not.toBeNull()
    expect(matched?.ruleKey).toBe('taskflow-list')
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

  it('falls back to app-root rules when a specific screen has other rules but no match', async () => {
    const robotDetailRule = commandRule('robot-detail-run-command', {
      patternRegex: '^/\\s*run\\s+(\\S+)\\s*$',
      type: 'run-taskflow',
      taskFlowId: ['$1'],
      replyText: '로봇 $1 을 실행합니다.',
      notFoundText: '실행할 로봇을 찾지 못했습니다.',
    }, 200)
    robotDetailRule.screenKey = 'tms/robots/:robotId/detail'

    const appRootListRule = {
      ...commandRule('taskflow-list-command', {
        patternRegex: '^/\\s*list\\s*$',
        type: 'taskflow-list',
        chatAction: 'navigation',
        chatActionParam: { path: 'tms/taskflows', app: 'tms' },
        replyText: '태스크플로우 목록으로 이동합니다.',
        notFoundText: '태스크플로우 목록을 열 수 없습니다.',
      }, 110),
      screenKey: 'tms',
      appKey: 'tms',
    }

    const matched = await matchFrontRule(
      { screenKey: 'tms/robots/:robotId/detail', message: '/list' },
      async (appKey, screenKey) => {
        if (screenKey === 'tms/robots/:robotId/detail') return [robotDetailRule]
        if (screenKey === 'tms') return [appRootListRule]
        return []
      },
    )

    expect(matched?.ruleKey).toBe('taskflow-list-command')
    expect(matched?.chatAction).toBe('navigation')
    expect(matched?.chatActionParam).toMatchObject({ path: 'tms/taskflows', app: 'tms' })
  })

  it('matches a taskflow graph arrow chain like Idle->Joy on the canvas route', () => {
    const arrowRule = {
      ...commandRule('separate-arrow-lines', {
        patternRegex: '^\\s*([^\\r\\n]+(?:->|=>|→|⇒)[^\\r\\n]+(?:\\s*(?:\\r?\\n|$))?)\\s*$',
        graphOperation: 'separate-arrow-lines',
        direction: 'forward',
        replyText: '$1 연결을 캔버스에 반영했습니다.',
      }),
      ruleType: 'taskflow-command',
    }

    const matched = matchFrontRuleRows({ screenKey, message: 'Idle->Joy' }, [arrowRule])
    expect(matched).not.toBeNull()
    expect(matched?.ruleKey).toBe('separate-arrow-lines')
    expect(matched?.graphOperation).toBe('separate-arrow-lines')
    expect(matched?.ruleType).toBe('taskflow-graph')
    expect(matched?.captures).toContain('Idle->Joy')
  })

  it('matches leading-arrow canvas chains like ->Joy and ->Joy->Love', () => {
    const arrowRule = commandRule('separate-arrow-lines', {
      patternRegex: '^\\s*(?:[^\\r\\n]+(?:\\s*(?:->|=>|→|⇒)\\s*[^\\r\\n]+)+|(?:\\s*(?:->|=>|→|⇒)\\s*[^\\r\\n]+)+)\\s*$',
      graphOperation: 'separate-arrow-lines',
      direction: 'forward',
      replyText: '$1 연결을 캔버스에 반영했습니다.',
    })

    expect(matchFrontRuleRows({ screenKey, message: '->Joy' }, [arrowRule])).not.toBeNull()
    expect(matchFrontRuleRows({ screenKey, message: '->Joy->Love' }, [arrowRule])).not.toBeNull()
    expect(matchFrontRuleRows({ screenKey, message: 'Joy=>Love' }, [arrowRule])).not.toBeNull()
  })

  it('prefers the exact A->B taskflow rule over the generic graph fallback', () => {
    const genericRule = {
      ...commandRule('append-node-chain', {
        pattern: 'A->B->C',
        graphOperation: 'append-node-chain',
        direction: 'right-to-left',
        description: '연결 체인을 이어서 생성한다.',
      }),
      ruleType: 'taskflow-graph',
    }
    const exactRule = {
      ...commandRule('connect-node-pair', {
        pattern: 'A->B',
        graphOperation: 'connect-node-pair',
        direction: 'right-to-left',
        description: '노드-노드 간 연결을 생성한다.',
      }),
      ruleType: 'taskflow-graph',
    }

    const matched = matchFrontRuleRows({ screenKey, message: 'A->B' }, [genericRule, exactRule])

    expect(matched).not.toBeNull()
    expect(matched?.ruleKey).toBe('connect-node-pair')
    expect(matched?.captures).toEqual(['A', 'B'])
  })

  it('matches taskflow management commands without robot id', () => {
    const copyRule = commandRule('copy-taskflow-command', {
      patternRegex: '^/\\s*copy\\s+(\\S+)\\s*$',
      type: 'copy-taskflow',
      taskFlowId: ['$1'],
      replyText: '태스크플로우 $1 를 복제합니다.',
      notFoundText: '복사할 태스크플로우를 찾지 못했습니다.',
    })

    const deleteRule = commandRule('delete-taskflow-command', {
      patternRegex: '^/\\s*delete\\s+(\\S+)\\s*$',
      type: 'delete-taskflow',
      taskFlowId: ['$1'],
      replyText: '태스크플로우 $1 를 삭제합니다.',
      notFoundText: '삭제할 태스크플로우를 찾지 못했습니다.',
    })

    const createRule = commandRule('create-taskflow-command', {
      patternRegex: '^/\\s*create\\s*$',
      type: 'create-taskflow',
      replyText: '새 태스크플로우를 생성합니다.',
      notFoundText: '새 태스크플로우를 생성할 수 없습니다.',
    })

    const modifyRule = commandRule('modify-taskflow-command', {
      patternRegex: '^/\\s*modify\\s+(\\S+)\\s*$',
      type: 'modify-taskflow',
      taskFlowId: ['$1'],
      replyText: '태스크플로우 $1 를 수정합니다.',
      notFoundText: '수정할 태스크플로우를 찾지 못했습니다.',
    })

    expect(matchFrontRuleRows({ screenKey, message: '/copy 42' }, [copyRule])?.toolArgs).toMatchObject({
      type: 'copy-taskflow',
      taskFlowId: ['42'],
      replyText: '태스크플로우 42 를 복제합니다.',
    })
    expect(matchFrontRuleRows({ screenKey, message: '/delete 42' }, [deleteRule])?.toolArgs).toMatchObject({
      type: 'delete-taskflow',
      taskFlowId: ['42'],
      replyText: '태스크플로우 42 를 삭제합니다.',
    })
    expect(matchFrontRuleRows({ screenKey, message: '/create' }, [createRule])?.toolArgs).toMatchObject({
      type: 'create-taskflow',
      replyText: '새 태스크플로우를 생성합니다.',
    })
    expect(matchFrontRuleRows({ screenKey, message: '/modify 42' }, [modifyRule])?.toolArgs).toMatchObject({
      type: 'modify-taskflow',
      taskFlowId: ['42'],
      replyText: '태스크플로우 42 를 수정합니다.',
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

  it('falls back to app-root taskflow commands when the current route is a child screen', async () => {
    const appRootRule = commandRule('taskflow-list-command', {
      type: 'taskflow-list',
      patternRegex: '^/\\s*list\\s*$',
      chatAction: 'navigation',
      chatActionParam: { path: 'tms/taskflows', app: 'tms' },
      replyText: '태스크플로우 목록으로 이동합니다.',
    })

    const matched = await matchFrontRule(
      { screenKey: 'tms/taskflows', message: '/list' },
      async (appKey, screenKey) => {
        if (screenKey === 'tms/taskflows') return []
        if (screenKey === 'tms') return [appRootRule]
        return []
      },
    )

    expect(matched?.ruleKey).toBe('taskflow-list-command')
    expect(matched?.chatAction).toBe('navigation')
    expect(matched?.chatActionParam).toMatchObject({ path: 'tms/taskflows', app: 'tms' })
  })

  it('keeps direct navigation matches usable even when a matched rule has no toolName', () => {
    const rule = commandRule('robots-list-command', {
      type: 'robots-list',
      patternRegex: '^/\\s*robots\\s*$',
      chatAction: 'navigation',
      chatActionParam: { path: 'tms/robots', app: 'tms' },
      replyText: '로봇 목록으로 이동합니다.',
    })

    const matched = matchFrontRuleRows({ screenKey: 'tms', message: '/robots' }, [rule])

    expect(matched?.ruleKey).toBe('robots-list-command')
    expect(matched?.chatAction).toBe('navigation')
    expect(matched?.chatActionParam).toMatchObject({ path: 'tms/robots', app: 'tms' })
    expect(matched?.toolArgs).toMatchObject({ type: 'robots-list', replyText: '로봇 목록으로 이동합니다.' })
  })

  it('keeps taskflow management and navigation commands in the SQL seed for TMS screens', () => {
    const sqlFilePath = path.resolve(__dirname, '../../../../../../sql/20260820_taskflow_management_commands.sql')
    const sql = fs.readFileSync(sqlFilePath, 'utf8')

    expect(sql).toContain("'tms'")
    expect(sql).toContain("'tms/taskflows'")
    expect(sql).toContain("'tms/robots'")
    expect(sql).toContain("'tms/taskflows/:taskFlowId/detail'")
    expect(sql).toContain("'tms/taskflows/:taskFlowId/canvas'")
    expect(sql).toContain("'create-taskflow-command'")
    expect(sql).toContain("'copy-taskflow-command'")
    expect(sql).toContain("'delete-taskflow-command'")
    expect(sql).toContain("'modify-taskflow-command'")
    expect(sql).toContain("'taskflow-list-command'")
    expect(sql).toContain("'robots-list-command'")
    expect(sql).toContain("'^/\\s*list\\s*$'")
    expect(sql).toContain("'^/\\s*robots\\s*$'")
    expect(sql).toContain("'chatAction', 'navigation'")
    expect(sql).toContain("'path', 'tms/taskflows'")
    expect(sql).toContain("'path', 'tms/robots'")
  })
})