import { matchChatRule } from '@repo/apis/ai/chatSettings.js'

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

  // TODO: cms 전용 rule 액션 처리 추가
  return {
    ok: true,
    replyText: rule.replyText
  }
}
