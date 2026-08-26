import type { DeviceResponse } from '@/types/api/device'
import type { RobotInfo, RobotStatus, SkillType } from '@/types/RobotInfo'

export function toRobotInfo(device: DeviceResponse): RobotInfo {
  const skillsList = device.tms?.taskFlowState?.robotSpec?.capabilities ?? []
  return {
    id: device.deviceId,
    name: device.deviceName,
    group: device.provision.isDefaultSite ? '' : device.provision.groupName,
    site: device.provision.isDefaultSite ? '' : device.provision.siteName,
    groupId: device.provision.groupId!,
    siteId: device.provision.siteId!,
    status: device.deviceState as RobotStatus,
    batteryLevel: device.state?.batteryState?.batteryCharge ?? 0,
    skills: skillsList.map((item) => item.name) as SkillType[],
    errorCode: 'none',
    errorMessage: 'none'
  }
}
