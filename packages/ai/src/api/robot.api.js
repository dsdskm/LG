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
