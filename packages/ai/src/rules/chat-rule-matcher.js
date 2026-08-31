import { ruleCheck as tmsRuleCheck } from './tms/tms-rule-matcher.js'
import { ruleCheck as robotRuleCheck } from './robot/robot-rule-matcher.js'
import { ruleCheck as sotaRuleCheck } from './sota/sota-rule-matcher.js'
import { ruleCheck as cmsRuleCheck } from './cms/cms-rule-matcher.js'

const RULE_CHECKERS = {
  tms: tmsRuleCheck,
  robot: robotRuleCheck,
  sota: sotaRuleCheck,
  cms: cmsRuleCheck
}

export const ruleCheck = async (appKey, screenKey, message, navigate, context = {}) => {
  const checker = RULE_CHECKERS[String(appKey || '').trim().toLowerCase()]
  if (!checker) {
    return {
      ok: false,
      replyText: ''
    }
  }

  return checker(appKey, screenKey, message, navigate, context)
}
