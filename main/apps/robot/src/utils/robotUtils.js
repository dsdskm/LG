export const STATUS_MAP = {
  OPERATION: {
    className: 'bg-[#dbeafe] text-[#2563eb]',
    textKey: 'operation'
  },
  STANDBY: {
    className: 'bg-[#f5f3ff] text-[#7c3aed]',
    textKey: 'wait'
  },
  CHARGE: {
    className: 'bg-[#d1fae5] text-[#059669]',
    textKey: 'charge'
  },
  ERROR: {
    className: 'bg-[#fee2e2] text-[#dc2626]',
    textKey: 'error'
  },
  OFFLINE: {
    className: 'bg-[#fef3c7] text-[#d97706]',
    textKey: 'offline'
  },
  REGISTERED: {
    className: 'bg-[#fef9c3] text-[#ca8a04]',
    textKey: 'register'
  },
  ACTIVE: {
    className: 'bg-[#e0f2fe] text-[#0284c7]',
    textKey: 'active'
  },
  DELETE: {
    className: 'bg-[#fee2e2] text-[#dc2626]',
    textKey: 'delete'
  },
  POWEROFF: {
    className: 'bg-[#e5e7eb] text-[#374151]',
    textKey: 'powerOff'
  },
  DEFAULT: {
    className: 'bg-[#f1f5f9] text-[#475569]',
    textKey: 'noData'
  }
}

export function getStatusInfo(status) {
  return STATUS_MAP[status] || STATUS_MAP.DEFAULT
}

export const allRegStatus = [
  { value: 'REGISTERED', token: 'register' },
  { value: 'ACTIVE', token: 'active' },
  { value: 'DELETE', token: 'delete' }
]

export const allOperationStatus = [
  { value: 'STANDBY', token: 'wait' },
  { value: 'CHARGE', token: 'charge' },
  { value: 'OPERATION', token: 'operation' },
  { value: 'OFFLINE', token: 'offline' },
  { value: 'POWEROFF', token: 'powerOff' },
  { value: 'ERROR', token: 'error' }
]

export function parseDeviceInfo(deviceinfo) {
  let returnJson = {}
  returnJson.deviceId = deviceinfo.deviceId
  returnJson.name = deviceinfo.deviceName
  returnJson.model = deviceinfo.deviceModelName
  returnJson.regStatus = deviceinfo.deviceRegStatus
  returnJson.state = deviceinfo.deviceState

  returnJson.groupId = !deviceinfo.provision.isDefaultSite ? deviceinfo.provision?.groupId : null
  returnJson.groupName = !deviceinfo.provision.isDefaultSite ? deviceinfo.provision?.groupName : null
  returnJson.siteId = !deviceinfo.provision.isDefaultSite ? deviceinfo.provision?.siteId : null
  returnJson.siteName = !deviceinfo.provision.isDefaultSite ? deviceinfo.provision?.siteName : null

  returnJson.serial = deviceinfo.deviceSerialNumber
  returnJson.mac = deviceinfo.deviceMacAddress
  returnJson.version = deviceinfo.deviceFirmwareVersion
  returnJson.updateDate = deviceinfo.updatedAt
  returnJson.registerDate = deviceinfo.registeredAt

  returnJson.batterySoc = deviceinfo.state?.batteryState?.batteryCharge
  returnJson.batterySoh = deviceinfo.state?.batteryState?.batteryHealth

  return returnJson
}

// 기기 목록 폴링 결과를 타임스탬프 기반으로 병합한다.
// updatedAt / state.stateUpdatedAt / connection.connectionUpdatedAt 비교 후
// 변경된 기기만 교체하고, 변경 없으면 setDevices를 호출하지 않는다.
// tsMap: 가변 객체 { [deviceId]: { updatedAt, st, conn } }
// 반환: { hasChange, merger } — hasChange가 true일 때만 setDevices(merger) 호출
export function buildDeviceMerger(newDevices, tsMap) {
  const newIds = new Set(newDevices.map((d) => d.deviceId))
  const changedIds = new Set()
  let hasChange = false

  newDevices.forEach((d) => {
    const prev = tsMap[d.deviceId]
    const st = d.state?.stateUpdatedAt ?? null
    const conn = d.connection?.connectionUpdatedAt ?? null
    if (!prev || d.updatedAt !== prev.updatedAt || st !== prev.st || conn !== prev.conn) {
      tsMap[d.deviceId] = { updatedAt: d.updatedAt, st, conn }
      changedIds.add(d.deviceId)
      hasChange = true
    }
  })

  const removed = Object.keys(tsMap).filter((id) => !newIds.has(id))
  if (removed.length > 0) {
    removed.forEach((id) => delete tsMap[id])
    hasChange = true
  }

  const merger = (prev) => {
    const prevMap = new Map(prev.map((d) => [d.deviceId, d]))
    return newDevices.map((d) => (changedIds.has(d.deviceId) ? d : (prevMap.get(d.deviceId) ?? d)))
  }

  return { hasChange, merger }
}

//for Map
export function parseRobotData(deviceinfo) {
  const pos = deviceinfo.state?.position
  let returnJson = {
    deviceId: deviceinfo.deviceId,
    deviceName: deviceinfo.deviceName,
    x: pos?.x,
    y: pos?.y,
    // heading (rad). Backend may expose it as theta/yaw; undefined → faces +X.
    theta: pos?.theta ?? pos?.yaw ?? deviceinfo.state?.pose?.yaw,
    robotState: deviceinfo.deviceState,
    siteName: !deviceinfo.provision.isDefaultSite ? deviceinfo.provision?.siteName : '-',
    areaId: deviceinfo.state?.sitePosition?.areaId
  }
  return returnJson
}

/**
 * 다국어 name 객체에서 현재 언어의 값을 반환.
 * name 예: { default: 'Reception', 'ko-KR': '리셉션', 'en-US': 'Reception', 'ja-JP': '受付' }
 * - 현재 언어(lang, 예: 'ko-KR')와 대소문자 무시로 일치하는 키가 있으면 그 값
 * - 없으면 default → en-US → 첫 값 순으로 폴백
 * @param {object|string} name
 * @param {string} lang i18n.language
 */
export function getLocalizedName(name, lang) {
  if (!name) return ''
  if (typeof name === 'string') return name
  if (lang) {
    const key = Object.keys(name).find((k) => k.toLowerCase() === String(lang).toLowerCase())
    if (key && name[key]) return name[key]
  }
  return name.default ?? name['en-US'] ?? name['en-us'] ?? Object.values(name)[0] ?? ''
}

// robotUtils.js

/**
 * taskFlows 중 isActive와 isEnabled가 모두 true인 항목만 유효한 업무 목록으로 인정
 * @param {Array} taskFlows - data.tms.taskFlowState.taskFlows
 */
export function filterActiveTaskFlows(taskFlows) {
  const list = Array.isArray(taskFlows) ? taskFlows : []
  return list.filter((tf) => tf.isActive && tf.isEnabled)
}

/**
 * taskFlows(운영 업무 목록)의 operationStatus를 기준으로 업무 제어 버튼(시작/정지/일시정지/재개) 활성 여부를 계산
 * - canStart: RUNNING/PAUSED 상태인 업무가 하나도 없을 때 (신규 시작 가능)
 * - canStop: RUNNING/PAUSED 상태인 업무가 하나라도 있을 때
 * - canPause: RUNNING 상태인 업무가 하나라도 있을 때
 * - canResume: PAUSED 상태인 업무가 하나라도 있을 때
 * @param {Array} taskFlows - data.tms.taskFlowState.taskFlows
 */
export function getTaskFlowControlState(taskFlows) {
  const list = Array.isArray(taskFlows) ? taskFlows : []
  const hasRunning = list.some((tf) => tf.operationStatus === 'RUNNING')
  const hasPaused = list.some((tf) => tf.operationStatus === 'PAUSED')

  return {
    canStart: !hasRunning && !hasPaused,
    canStop: hasRunning || hasPaused,
    canPause: hasRunning,
    canResume: hasPaused
  }
}

/**
 * hwComponents 배열에서 WiFi Module을 찾아 rxPower 기준으로 3단계 상태를 반환
 * @param {object} state - device.state (raw, 즉 data.state)
 * @returns {{ label: string, level: 'good'|'weak'|'disconnected'|'unknown', warn: boolean }}
 */
export function getWifiStatus(state) {
  const unknown = { label: 'noData', level: 'unknown', warn: false }

  if (!state?.hwComponents) return unknown

  let hwList
  try {
    hwList = typeof state.hwComponents === 'string' ? JSON.parse(state.hwComponents) : state.hwComponents
  } catch (e) {
    console.error('hwComponents parse error:', e)
    return unknown
  }

  if (!Array.isArray(hwList)) return unknown

  const wifi = hwList.find((c) => c.type === 'WiFi Module' || c.id === 'hw-wifi')
  if (!wifi || wifi.rxPower == null) return unknown

  // "-36 dBm" 같은 문자열에서 숫자만 추출
  const match = String(wifi.rxPower).match(/-?\d+(\.\d+)?/)
  if (!match) return unknown

  const rxPower = parseFloat(match[0])

  if (rxPower >= -65) {
    return { label: 'stable', level: 'good', warn: false }
  } else if (rxPower >= -75) {
    return { label: 'weak', level: 'weak', warn: true }
  } else {
    return { label: 'disconnected', level: 'disconnected', warn: true }
  }
}
