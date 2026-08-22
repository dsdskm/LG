export function matchFrontRule(message, rules = []) {
  if (!message || !Array.isArray(rules) || rules.length === 0) return null

  const normalized = String(message ?? '').trim()
  const candidate = rules.find((rule) => {
    const pattern = String(rule?.pattern ?? rule?.patternRegex ?? rule?.ruleKey ?? '').trim()
    if (!pattern) return false
    try {
      return new RegExp(pattern, 'i').test(normalized)
    } catch {
      return false
    }
  })

  if (!candidate) return null

  return {
    routeKey: candidate.routeKey ?? candidate.screenKey ?? '',
    ruleKey: candidate.ruleKey ?? candidate.key ?? '',
    ruleType: candidate.ruleType ?? 'front-rule',
    confidence: Number(candidate.confidence ?? 0.95),
    intent: candidate.intent ?? 'action',
    toolName: candidate.toolName,
    toolArgs: candidate.toolArgs,
    chunkKeys: Array.isArray(candidate.chunkKeys) ? candidate.chunkKeys : [],
    answerTemplate: candidate.answerTemplate,
    fallbackText: candidate.fallbackText,
    captures: [],
  }
}
