function toParamArray(params) {
  if (Array.isArray(params)) {
    return params
  }

  if (params === undefined || params === null) {
    return []
  }

  return [params]
}

export function buildNavigationPath(rule, params) {
  const ruleValue = rule || {}
  const extra = ruleValue.extraJson || {}
  const rawNavigation = String(extra.navigation || '').trim()

  if (!rawNavigation) {
    return '/'
  }

  const paramList = toParamArray(params)
  const replaced = rawNavigation.replace(/\$(\d+)/g, (full, indexText) => {
    const index = Number(indexText) - 1
    if (!Number.isInteger(index) || index < 0) {
      return full
    }

    const value = paramList[index]
    if (value === undefined || value === null || String(value).trim() === '') {
      return full
    }

    return encodeURIComponent(String(value).trim())
  })

  return '/' + replaced.replace(/^\/+/, '')
}

export async function executeGoPage(context = {}) {
  const { rule, params, navigate } = context
  let { replyText } = rule
  const notFoundText = rule?.fallbackText
  try {
    const path = buildNavigationPath(rule, params)
    navigate(path)
    const paramList = toParamArray(params)
    if (paramList.length > 0) {
      replyText = replyText.replace('$1', paramList[0])
    }
  } catch (e) {
    console.log('e', e)
    return notFoundText
  }

  return replyText
}
