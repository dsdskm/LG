import type { ChatRuleEntity } from '../../features/chat-settings/db/chat-rule.entity';

export type FrontRuleMatch = {
  rule: ChatRuleEntity;
  matched: boolean;
  params: Array<string | number>;
};

type FrontRuleContext = {
  appKey?: string;
  screenKey: string;
  message: string;
};

function exactLiteralPatternMatch(message: string, pattern: string): boolean {
  return String(message ?? '').trim() === String(pattern ?? '').trim();
}

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
    /**
     * 1. literal pattern 우선 검사
     */
    const pattern = String(rule.pattern ?? '').trim();

    if (pattern && exactLiteralPatternMatch(message, pattern)) {
      return buildFrontRuleMatch(rule, []);
    }

    /**
     * 2. regex pattern 검사
     */
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
  return {
    rule: rule,
    matched: true,
    params,
  };
}
