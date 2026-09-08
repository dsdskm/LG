/** rule 테이블 조회를 플레인 모듈에 넘겨주는 등록소.
 * chat-rule.service 가 taskflow-language-rules 의 캐시 무효화를 부르고 있어,
 * 규칙 읽기를 서비스에서 직접 import 하면 순환 참조가 된다. 그 사이를 이 모듈이 끊는다.
 */

export type RuleRow = {
  ruleKey?: string
  extraJson?: unknown
  example?: string[] | null
  enabled?: boolean
}

export type RuleReader = {
  listByAppAndScreen: (appKey?: string, screenKey?: string) => Promise<RuleRow[]>
}

let activeRuleReader: RuleReader | null = null

export function registerRuleReader(reader: RuleReader | null): void {
  activeRuleReader = reader
}

export function getRuleReader(): RuleReader | null {
  return activeRuleReader
}
