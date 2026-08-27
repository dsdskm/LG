import type { ChatRuleEntity } from '../../features/chat-settings/db/chat-rule.entity';

export type FrontRuleMatch = {
  rule: ChatRuleEntity;
  ruleData?: ChatRuleEntity;
  matched: boolean;
  params: Array<string | number>;
  ruleKey?: string;
  ruleType?: string;
  intent?: 'info' | 'action';
  reason?: string;
  confidence?: number | string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  chatAction?: string;
  chatActionParam?: Record<string, unknown>;
  fallbackText?: string;
  answerTemplate?: string;
  chunkKeys?: string[];
  graphOperation?: string;
  captures?: string[];
  direction?: string;
};

type FrontRuleContext = {
  appKey?: string;
  screenKey: string;
  message: string;
};

type LegacyChatRuleEntity = ChatRuleEntity & {
  ruleType?: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.flatMap((item) => toStringArray(item))));
  }

  if (value && typeof value === 'object') {
    const flattened = Object.values(value as Record<string, unknown>).flatMap(
      (item) => toStringArray(item),
    );

    return Array.from(new Set(flattened));
  }

  const single = String(value ?? '').trim();
  return single ? [single] : [];
}

/**
 * DB의 patternRegex는 PostgreSQL text 컬럼이라고 가정.
 *
 * 정상:
 * ^/copy\s+\d+$
 *
 * 잘못 저장된 예:
 * ^/copy\\s+\\d+$
 *
 * 후자의 경우 RegExp에서는 \s가 아니라
 * literal backslash + s로 인식될 수 있기 때문에 매칭에 실패한다.
 */
function normalizeRegexPattern(rawPattern: string): string {
  const trimmed = String(rawPattern ?? '').trim();

  if (!trimmed) {
    return '';
  }

  /**
   * DB에 실제로 "\\s", "\\d"처럼
   * 백슬래시가 2개 저장된 경우만 1개로 보정한다.
   *
   * 주의:
   * 이건 방어 코드다.
   * 근본적으로는 DB 저장 시점에서
   * ^/copy\s+\d+$
   * 형태로 저장하는 것이 맞다.
   */
  return trimmed.replace(/\\\\([sSdDwWbB])/g, '\\$1');
}

function compileRulePatternRegex(rule: ChatRuleEntity): RegExp | null {
  const rawPattern = String(rule.patternRegex ?? '').trim();

  if (!rawPattern) {
    return null;
  }

  const normalizedPattern = normalizeRegexPattern(rawPattern);

  try {
    return new RegExp(normalizedPattern, 'i');
  } catch (error) {
    console.warn(
      '[compileRulePatternRegex] invalid regex',
      JSON.stringify({
        ruleKey: rule.ruleKey,
        appKey: rule.appKey,
        rawPattern,
        normalizedPattern,
        error: error instanceof Error ? error.message : String(error),
      }),
    );

    return null;
  }
}

function toParamValue(value: string): string | number {
  const trimmed = String(value ?? '').trim();

  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}

function extractRuleParams(message: string, regex: RegExp): Array<string | number> {
  const matched = String(message ?? '').match(regex);

  if (!matched) {
    return [];
  }

  const captures = matched
    .slice(1)
    .map((value) => toParamValue(String(value ?? '').trim()))
    .filter(Boolean);

  if (captures.length > 0) {
    return captures;
  }

  const tokens = String(message ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) {
    return [];
  }

  return tokens.slice(1).map((token) => toParamValue(token));
}

export async function matchFrontRule(
  ctx: FrontRuleContext,
  loadRules: (appKey: string, screenKey: string) => Promise<ChatRuleEntity[]>,
): Promise<FrontRuleMatch | null> {
  const screenKey = String(ctx.screenKey ?? '').trim();

  const appKey = String(
    ctx.appKey || screenKey.split('/').filter(Boolean)[0] || '',
  ).trim();

  const rules = await loadRules(appKey, appKey);

  return matchFrontRuleRows(
    {
      ...ctx,
      appKey,
    },
    rules,
  );
}

export function matchFrontRuleRows(
  ctx: FrontRuleContext,
  rules: ChatRuleEntity[],
): FrontRuleMatch | null {
  const message = String(ctx.message ?? '').trim();

  if (!message) {
    return null;
  }

  const appKey = String(
    ctx.appKey || ctx.screenKey.split('/').filter(Boolean)[0] || '',
  ).trim();

  const candidateRules = appKey
    ? rules.filter((rule) => String(rule.appKey ?? '').trim() === appKey)
    : rules;

  if (candidateRules.length === 0) {
    return null;
  }

  for (const rule of candidateRules) {
    const rawPattern = String(rule.patternRegex ?? '').trim();

    if (!rawPattern) {
      continue;
    }
    const regex = compileRulePatternRegex(rule);

    if (!regex) {
      continue;
    }
    const regexResult = regex.test(message);
    if (!regexResult) {
      continue;
    }

    const params = extractRuleParams(message, regex);
    return buildFrontRuleMatch(rule, params);
  }

  return null;
}

function buildFrontRuleMatch(
  rule: ChatRuleEntity,
  params: Array<string | number>,
): FrontRuleMatch {
  const legacyRule = rule as LegacyChatRuleEntity;
  const extraJson = toRecord(rule.extraJson);
  const graphOperation = String(extraJson.graphOperation ?? '').trim() || undefined;
  const normalizedRuleType = String(
    extraJson.ruleType ??
      legacyRule.ruleType ??
      (graphOperation ? 'taskflow-graph' : 'taskflow-command'),
  ).trim() || 'taskflow-command';

  const directReplyText = String(
    extraJson.replyText ?? extraJson.reply_text ?? rule.replyText ?? '',
  ).trim();

  const toolArgs: Record<string, unknown> = { ...extraJson };
  if (directReplyText) {
    toolArgs.replyText = directReplyText;
  }

  const chatAction = String(
    extraJson.chatAction ?? extraJson.chat_action ?? (typeof extraJson.navigation !== 'undefined' ? 'navigation' : ''),
  ).trim() || undefined;

  const chatActionParam = toRecord(
    extraJson.chatActionParam ?? extraJson.chat_action_param,
  );
  const computedChatActionParam = Object.keys(chatActionParam).length > 0
    ? chatActionParam
    : chatAction === 'navigation' && typeof extraJson.navigation === 'string'
      ? {
          path: extraJson.navigation,
          ...(extraJson.app ? { app: extraJson.app } : {}),
        }
      : undefined;

  const fallbackText = String(
    extraJson.fallbackText ?? extraJson.fallback_text ?? extraJson.notFoundText ?? rule.fallbackText ?? '',
  ).trim() || undefined;

  const answerTemplate = String(
    extraJson.answerTemplate ?? extraJson.answer_template ?? '',
  ).trim() || undefined;

  const chunkKeys = Array.isArray(extraJson.chunkKeys)
    ? extraJson.chunkKeys.map((item) => String(item ?? '').trim()).filter(Boolean)
    : Array.isArray(extraJson.chunk_keys)
      ? extraJson.chunk_keys.map((item) => String(item ?? '').trim()).filter(Boolean)
      : undefined;

  const captures = params.map((item) => String(item ?? '').trim()).filter(Boolean);
  const direction = String(extraJson.direction ?? '').trim() || undefined;
  const toolName = String(extraJson.toolName ?? extraJson.tool_name ?? extraJson.type ?? '').trim() || undefined;

  return {
    rule,
    ruleData: rule,
    matched: true,
    params,
    ruleKey: rule.ruleKey,
    ruleType: normalizedRuleType,
    intent: String(
      extraJson.intent ?? (answerTemplate || chunkKeys?.length ? 'info' : 'action'),
    ).trim() as FrontRuleMatch['intent'],
    reason: String(extraJson.reason ?? rule.description ?? '').trim() || undefined,
    confidence: Number.isFinite(Number(extraJson.confidence)) ? Number(extraJson.confidence) : undefined,
    toolName,
    toolArgs,
    chatAction,
    chatActionParam: computedChatActionParam,
    fallbackText,
    answerTemplate,
    chunkKeys,
    graphOperation,
    captures,
    direction,
  };
}
