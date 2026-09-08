import { matchChatRule } from '@repo/apis/ai/chatSettings.js'
import { RULE_KEY } from '@repo/constants/ai'
import { executeGoPage } from './actions/robot-move-page.js'
import { executeGoDetailByName } from './actions/robot-detail-lookup.jsx'
import { executeLogReplayByName } from './actions/robot-logreplay-by-name.js'

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

const GO_LOGREPLAY_BY_NAME_RULE_KEYS = new Set([
  RULE_KEY.ROBOT_LOGREPLAY_DRIVING_BY_NAME,
  RULE_KEY.ROBOT_LOGREPLAY_MANIPULATION_BY_NAME
])

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
    const result = await executeGoDetailByName({ rule, params, navigate, lookupType })

    // 다중 선택 응답 처리
    if (result && typeof result === 'object' && result.type?.startsWith('multi-select-')) {
      return {
        ok: true,
        replyText: result.message,
        multiSelect: result
      }
    }

    replyText = result
  } else if (GO_LOGREPLAY_BY_NAME_RULE_KEYS.has(rule.ruleKey)) {
    // logType을 extraJson.paramMapping.logType에서 가져와서 params에 추가
    const logType = rule?.extraJson?.paramMapping?.logType || 'driving'
    // params가 1개면: [robotName] → ['', robotName]로 정규화
    // params가 2개면: [siteName, robotName] → 그대로 사용
    let normalizedParams
    if (!params || params.length === 0) {
      normalizedParams = ['', '', logType]
    } else if (params.length === 1) {
      // 사이트명이 없고 로봇명만 있는 경우
      normalizedParams = ['', params[0], logType]
    } else {
      // 사이트명, 로봇명 모두 있는 경우
      normalizedParams = [params[0], params[1], logType]
    }

    const result = await executeLogReplayByName({ rule, params: normalizedParams, navigate })

    // multi-select response 처리
    if (result && typeof result === 'object' && result.type === 'multi-select-robot') {
      return {
        ok: true,
        replyText: result.message,
        multiSelect: result
      }
    }

    replyText = result
  }

  return {
    ok: true,
    replyText
  }
}
