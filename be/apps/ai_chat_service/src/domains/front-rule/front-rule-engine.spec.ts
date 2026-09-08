import type { ChatRuleEntity } from '../../features/chat-settings/db/chat-rule.entity';
import { ChatRuleService } from '../../features/chat-settings/db/chat-rule.service';
import { matchFrontRuleRows } from './front-rule-engine';

const screenKey = 'tms/taskflows/:taskFlowId/canvas';

/** 엔진이 실제로 보는 필드만 담은 룰. 매칭은 patternRegex 로만 하고 나머지 값은 extraJson 에서 읽는다. */
function rule(
  ruleKey: string,
  patternRegex: string,
  extraJson: Record<string, unknown> = {},
  overrides: Partial<ChatRuleEntity> = {},
): ChatRuleEntity {
  return {
    id: 1,
    appKey: 'tms',
    screenKey,
    ruleKey,
    patternRegex,
    extraJson,
    enabled: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  } as ChatRuleEntity;
}

describe('ChatRuleService.listByAppAndScreen', () => {
  it('쿼리스트링이 붙은 경로도 파라미터 화면 룰과 앱 룰을 함께 준다', async () => {
    const appRule = rule('taskflow-list', '^/list$', {}, { id: 1, screenKey: 'tms' });
    const canvasRule = rule('node-save-final', '^/save$', {}, { id: 2 });
    const repository = {
      find: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([appRule])
        .mockResolvedValueOnce([appRule, canvasRule]),
    };

    const service = new ChatRuleService(repository as any);
    const rows = await service.listByAppAndScreen('tms', 'tms/taskflows/228/canvas?source=saved');

    expect(rows.map((row) => row.ruleKey).sort()).toEqual(['node-save-final', 'taskflow-list']);
  });
});

describe('matchFrontRuleRows', () => {
  it('patternRegex 로 매칭하고 캡처를 params 로 준다', () => {
    const matched = matchFrontRuleRows(
      { screenKey, message: '/copy 197 새 이름' },
      [rule('taskflow-copy', '^/copy\\s+(\\d+)(?:\\s+(.+))?$')],
    );

    expect(matched?.ruleKey).toBe('taskflow-copy');
    expect(matched?.params).toEqual([197, '새 이름']);
  });

  it('패턴이 없거나 맞지 않으면 매칭하지 않는다', () => {
    expect(matchFrontRuleRows({ screenKey, message: '/undo' }, [rule('no-pattern', '')])).toBeNull();
    expect(matchFrontRuleRows({ screenKey, message: '/redo' }, [rule('undo', '^/undo$')])).toBeNull();
  });

  it('appKey 가 다른 룰은 후보에서 뺀다', () => {
    const other = rule('robot-list', '^/list$', {}, { appKey: 'robot', screenKey: 'robot' });
    expect(matchFrontRuleRows({ appKey: 'tms', screenKey, message: '/list' }, [other])).toBeNull();
  });

  it('extraJson.priority 가 큰 룰을 먼저 본다', () => {
    const rows = [
      rule('node-append-tail', '^(.+?)\\s*추가해$', { priority: 0 }),
      rule('node-attach-right', '^(.+?)에\\s*(.+?)\\s*추가해$', { priority: 10 }),
    ];

    expect(matchFrontRuleRows({ screenKey, message: 'Parallel에 pause 추가해' }, rows)?.ruleKey).toBe(
      'node-attach-right',
    );
  });

  it('extraJson 의 ruleType / graphOperation / replyText 를 그대로 전달한다', () => {
    const matched = matchFrontRuleRows({ screenKey, message: 'Delay 하단에 Love 추가해' }, [
      rule('node-attach-child', '^(.+?)\\s*하단에\\s*(.+?)\\s*추가해$', {
        ruleType: 'taskflow-graph',
        graphOperation: 'attach-child',
        intent: 'action',
        confidence: 0.97,
      }, { replyText: '{{anchor}} 하위에 {{node}} 를 연결했습니다.' }),
    ]);

    expect(matched?.ruleType).toBe('taskflow-graph');
    expect(matched?.graphOperation).toBe('attach-child');
    expect(matched?.intent).toBe('action');
    expect(matched?.confidence).toBe(0.97);
    expect(matched?.captures).toEqual(['Delay', 'Love']);
    // 문구 치환은 응답을 만드는 쪽에서 한다. 엔진은 원문 그대로 넘긴다.
    expect(matched?.rule.replyText).toBe('{{anchor}} 하위에 {{node}} 를 연결했습니다.');
  });

  it('navigation 만 있는 룰은 navigation chatAction 으로 바꿔 준다', () => {
    const matched = matchFrontRuleRows({ screenKey, message: '/list' }, [
      rule('taskflow-list', '^/list$', { navigation: 'tms/taskflows', app: 'tms' }),
    ]);

    expect(matched?.chatAction).toBe('navigation');
    expect(matched?.chatActionParam).toEqual({ path: 'tms/taskflows', app: 'tms' });
  });

  it('answerTemplate 이나 chunkKeys 가 있으면 info 로 본다', () => {
    const matched = matchFrontRuleRows({ screenKey, message: '/?' }, [
      rule('tms-help', '^/\\?$', { chunkKeys: ['tms-help'] }),
    ]);

    expect(matched?.intent).toBe('info');
    expect(matched?.chunkKeys).toEqual(['tms-help']);
  });

  it('DB 에 백슬래시가 두 번 저장된 패턴도 매칭한다', () => {
    const matched = matchFrontRuleRows({ screenKey, message: '/delete 12' }, [
      rule('taskflow-delete', '^/delete\\\\s+\\\\d+$'),
    ]);

    expect(matched?.ruleKey).toBe('taskflow-delete');
  });

  it('잘못된 정규식은 건너뛰고 다음 룰을 본다', () => {
    const matched = matchFrontRuleRows({ screenKey, message: '/save' }, [
      rule('broken', '^/save(['),
      rule('node-save-final', '^/save$'),
    ]);

    expect(matched?.ruleKey).toBe('node-save-final');
  });

  it('캡처가 없으면 메시지의 뒤 토큰을 params 로 쓴다', () => {
    const matched = matchFrontRuleRows({ screenKey, message: '/deploy robot-1 12' }, [
      rule('taskflow-deploy', '^/deploy\\s+\\S+\\s+\\S+$'),
    ]);

    expect(matched?.params).toEqual(['robot-1', 12]);
  });

  it('빈 메시지는 매칭하지 않는다', () => {
    expect(matchFrontRuleRows({ screenKey, message: '   ' }, [rule('undo', '^/undo$')])).toBeNull();
  });
});
