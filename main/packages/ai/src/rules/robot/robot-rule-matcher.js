import { matchChatRule } from '@repo/apis/ai/chatSettings.js'
import { RULE_KEY } from '@repo/constants/ai'
import { executeGoPage } from './actions/robot-move-page.js'
import { executeGoDetailByName } from './actions/robot-detail-lookup.js'

const GO_PAGE_RULE_KEYS = new Set([
  RULE_KEY.ROBOT_APP_DASHBOARD,
  RULE_KEY.ROBOT_APP_MANAGEMENT_LIST,
  RULE_KEY.ROBOT_APP_MAP_LIST,
  RULE_KEY.ROBOT_APP_GROUP_LIST,
  RULE_KEY.ROBOT_APP_USER_LIST,
  RULE_KEY.ROBOT_APP_TERM_LIST
])

const GO_DETAIL_BY_NAME_LOOKUP_TYPE = {
  [RULE_KEY.ROBOT_APP_MANAGEMENT_DETAIL]: 'device',
  [RULE_KEY.ROBOT_APP_SITE_DETAIL]: 'site'
}

export const ruleCheck = async (appKey, screenKey, message, navigate, context = {}) => {
  const text = String(message || '').trim()

  if (!text) {
    return {
      ok: false,
      replyText: ''
    }
  }

  const response = await matchChatRule({
    appKey,
    screenKey,
    message: text
  })

  const payload = response.data || {}
  const rule = payload.rule
  const params = payload.params
  const availableScreenKeys = Array.isArray(payload.availableScreenKeys)
    ? payload.availableScreenKeys.map((key) => String(key ?? '').trim()).filter(Boolean)
    : []

  if (!rule && availableScreenKeys.length > 0) {
    return {
      ok: true,
      replyText:
        availableScreenKeys.length === 1
          ? `이 명령어는 ${availableScreenKeys[0]} 화면에서만 사용할 수 있습니다.`
          : `이 명령어는 다음 화면에서만 사용할 수 있습니다: ${availableScreenKeys.join(', ')}`
    }
  }

  if (!rule) {
    return {
      ok: false,
      replyText: ''
    }
  }

  let replyText = rule.replyText
  const lookupType = GO_DETAIL_BY_NAME_LOOKUP_TYPE[rule.ruleKey]
  if (GO_PAGE_RULE_KEYS.has(rule.ruleKey)) {
    replyText = await executeGoPage({ rule, navigate, params })
  } else if (lookupType) {
    replyText = await executeGoDetailByName({ rule, params, navigate, lookupType })
  }

  return {
    ok: true,
    replyText
  }
}
