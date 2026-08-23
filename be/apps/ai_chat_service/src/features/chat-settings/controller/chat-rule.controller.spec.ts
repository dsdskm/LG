import { ChatRuleController } from './chat-rule.controller';

const canvasRule = {
  id: 1,
  appKey: 'tms',
  screenKey: 'tms/taskflows/:taskFlowId/canvas',
  ruleKey: 'node-save-final',
  patternRegex: '^/save$',
  enabled: true,
  priority: 100,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

describe('ChatRuleController', () => {
  it('returns available screen keys when only the rule screen does not match', async () => {
    const chatRules = {
      listByAppAndScreen: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([canvasRule]),
    };
    const controller = new ChatRuleController(chatRules as any);

    const result = await controller.matchCommand({
      appKey: 'tms',
      screenKey: 'tms/taskflows',
      message: '/save',
    });

    expect(result.data).toEqual({
      availableScreenKeys: ['tms/taskflows/:taskFlowId/canvas'],
    });
  });

  it('keeps returning null when no rule pattern matches', async () => {
    const chatRules = {
      listByAppAndScreen: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([canvasRule]),
    };
    const controller = new ChatRuleController(chatRules as any);

    const result = await controller.matchCommand({
      appKey: 'tms',
      screenKey: 'tms/taskflows',
      message: '/unknown',
    });

    expect(result.data).toBeNull();
  });
});
