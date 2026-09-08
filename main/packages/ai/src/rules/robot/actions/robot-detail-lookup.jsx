import React from 'react'
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

const getRenderItem = (lookupType) => {
  if (lookupType === 'device') {
    return (device) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { style: { fontWeight: 600, color: '#262626', fontSize: '14px' } }, device.deviceName),
        React.createElement('div', { style: { fontSize: '12px', color: '#595959' } }, `MAC: ${device.deviceMacAddress || 'N/A'}`)
      )
  }

  if (lookupType === 'site') {
    return (site) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { style: { fontSize: '12px', color: '#8c8c8c', marginBottom: '4px' } }, `그룹: ${site.groupName || 'N/A'}`),
        React.createElement('div', { style: { fontWeight: 600, color: '#262626', fontSize: '14px' } }, site.siteName)
      )
  }

  return null
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
      // 다중 선택 UI로 반환 (로봇/사이트 선택)
      return {
        type: `multi-select-${lookupType}`,
        componentKey: lookupType,
        message: `"${name}" 이름이 중복되어 ${matches.length}건이 검색되었습니다. 선택해주세요:`,
        items: matches,
        lookupType: lookupType,
        rule: rule,
        idKey: lookup.idKey,
        renderItem: getRenderItem(lookupType)
      }
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
