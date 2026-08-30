import { robotClient, API_CONFIG } from '@repo/apis'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)

const DEVICES_PATH = `${API_CONFIG.PREFIX_ROBOT}/devices`

const MOCK_DEVICES = [
  { id: 'robot-001', name: 'RSP-001', model: 'RSP-7', status: 'STANDBY', group: '물류팀', site: '1F 창고' },
  { id: 'robot-002', name: 'RSP-002', model: 'RSP-7', status: 'OPERATION', group: '물류팀', site: '2F 물류' },
  { id: 'robot-003', name: 'RSP-003', model: 'RSP-9', status: 'CHARGE', group: '제조팀', site: '3F 제조' },
  { id: 'robot-004', name: 'RSP-004', model: 'RSP-9', status: 'OFFLINE', group: '제조팀', site: '1F 창고' }
]

const normalizeDevice = (d) => ({
  id: d.deviceId,
  name: d.deviceName || d.deviceSerialNumber || d.deviceId,
  model: d.deviceModelName || '',
  status: d.deviceState || '',
  group: d.assign?.groupName || '',
  site: d.assign?.siteName || ''
})

export const getDevices = async () => {
  if (USE_MOCK) return MOCK_DEVICES
  const data = await axiosRobot.get(DEVICES_PATH, { params: { size: '100' } })
  return (data?.content ?? []).map(normalizeDevice)
}

export const getDevice = async (id) => {
  if (USE_MOCK) return MOCK_DEVICES.find((d) => d.id === id) || null
  const data = await axiosRobot.get(`${DEVICES_PATH}/${id}`)
  return normalizeDevice(data)
}

export const getDeviceStatus = async (id) => {
  if (USE_MOCK) {
    const device = MOCK_DEVICES.find((d) => d.id === id)
    return device ? { id, status: device.status } : null
  }
  const data = await axiosRobot.get(`${DEVICES_PATH}/${id}`)
  return { id: data.deviceId, status: data.deviceState || '' }
}

// POST /teleop-sessions — DM팀과 협의 필요한 신규 엔드포인트
export const createTeleopSession = async (config) => {
  if (USE_MOCK) {
    return { id: `teleop-${Date.now()}`, ...config, createdAt: new Date().toISOString() }
  }
  return axiosRobot.post('/teleop-sessions', config)
}
