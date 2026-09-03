import { buildNavigationPath } from './robot-move-page.js'
import { findDevicesByName, findSitesByName } from '../../../api/robot.api.js'

const LOOKUPS = {
  device: {
    search: findDevicesByName,
    idKey: 'deviceId'
  },
  site: {
    search: findSitesByName,
    idKey: 'siteId'
  }
}

export async function executeGoDetailByName({ rule, params, navigate, lookupType }) {
  const notFoundText = rule?.fallbackText || '해당 이름을 찾을 수 없습니다.'
  const paramList = Array.isArray(params) ? params : params ? [params] : []
  const name = String(paramList[0] ?? '').trim()
  if (!name) return notFoundText

  const lookup = LOOKUPS[lookupType]
  if (!lookup) return notFoundText

  try {
    const matches = await lookup.search(name)

    if (matches.length === 0) return notFoundText

    if (matches.length > 1) {
      const listNavigation = rule?.extraJson?.listNavigation
      if (listNavigation) {
        const listPath = buildNavigationPath({ extraJson: { navigation: listNavigation } }, [])
        navigate(listPath)
      }
      return `"${name}" 이름이 중복되어 ${matches.length}건이 검색되었습니다. 목록 화면으로 이동합니다.`
    }

    const id = matches[0]?.[lookup.idKey]
    if (!id) return notFoundText

    const path = buildNavigationPath(rule, [id])
    navigate(path)

    let replyText = rule.replyText
    if (replyText) replyText = replyText.replace('$1', name)
    return replyText
  } catch (e) {
    console.log('executeGoDetailByName error', e)
    return notFoundText
  }
}
