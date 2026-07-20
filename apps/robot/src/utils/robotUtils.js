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
    siteName: !deviceinfo.provision.isDefaultSite ? deviceinfo.provision?.siteName : '-'
  }
  return returnJson
}
