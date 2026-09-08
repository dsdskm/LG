import { API_CONFIG, robotClient } from '@repo/apis'

const webClient = robotClient(import.meta.env.VITE_API_BASE_URL)
const devicePath = `${API_CONFIG.PREFIX_ROBOT}/devices`
const sitePath = `${API_CONFIG.PREFIX_ROBOT}/sites`

const findAllByName = (items, nameKey, keyword) => {
  const normalized = String(keyword ?? '').trim().toLowerCase()
  if (!normalized) return []

  const list = Array.isArray(items) ? items : []
  const exact = list.filter((item) => String(item?.[nameKey] ?? '').trim().toLowerCase() === normalized)
  if (exact.length > 0) return exact

  return list.filter((item) => String(item?.[nameKey] ?? '').trim().toLowerCase().includes(normalized))
}

export async function findDevicesByName(name) {
  const response = await webClient.get(devicePath, { params: { size: '300' } })
  return findAllByName(response?.content, 'deviceName', name)
}

export async function findSitesByName(name) {
  const response = await webClient.get(sitePath, { params: { size: '300' } })
  return findAllByName(response?.content, 'siteName', name)
}

export async function findRobotBySiteAndName(siteName, robotName) {
  try {
    // siteName이 있으면 사이트 검색, 없으면 null 처리
    let siteId = null

    if (siteName && String(siteName).trim()) {
      // 1단계: 사이트명으로 사이트 검색
      const sitesRes = await webClient.get(sitePath, { params: { size: '300' } })
      const sites = findAllByName(sitesRes?.content, 'siteName', siteName)

      if (!sites || sites.length === 0) {
        return { status: 'site-not-found', message: `사이트 '${siteName}'을 찾을 수 없습니다` }
      }

      siteId = sites[0].siteId
    }

    // 2단계: 로봇명 검색 (사이트 지정 또는 전체)
    const params = { size: '300' }
    if (siteId) params.siteId = siteId

    const devicesRes = await webClient.get(devicePath, { params })
    const robots = findAllByName(devicesRes?.content, 'deviceName', robotName)

    if (!robots || robots.length === 0) {
      const siteMsg = siteName ? `사이트 '${siteName}'에서` : '전체 사이트에서'
      return { status: 'robot-not-found', message: `${siteMsg} '${robotName}' 로봇을 찾을 수 없습니다` }
    }

    if (robots.length > 1) {
      return {
        status: 'multiple',
        count: robots.length,
        robots: robots,
        message: `동일 이름의 로봇이 ${robots.length}대 있습니다. 로봇을 선택해주세요`
      }
    }

    // 3단계: 정확히 1대인 경우
    return { status: 'success', robot: robots[0] }
  } catch (error) {
    console.error('[robot.api] findRobotBySiteAndName error:', error)
    return { status: 'error', message: '로봇 조회 실패' }
  }
}
