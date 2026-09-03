import type { DeviceResponse } from '@/types/api/device'
import type { Building } from '@/types/api/site'
import type { RobotInfo, RobotStatus, SkillType } from '@/types/RobotInfo'

/**
 * 사이트 구조(건물 → 층 → 구역)를 "id → 이름" 한 장의 Map 으로 눌러 담는다.
 * toRobotInfo 의 positionInfoMap 인자로 넘겨 로봇의 현재 위치 이름을 채우는 용도다.
 *
 * 로봇마다 트리를 뒤지면 O(로봇 수 × 사이트 크기)가 되므로 한 번 만들어 재사용한다.
 * (화면에서는 useMemo 로 감싸 사이트 정보가 바뀔 때만 다시 만든다)
 */
export function makeBuildingInfo(buildings?: Building[]): Map<string, string> {
  const positionMap = new Map<string, string>()

  buildings?.forEach((building) => {
    positionMap.set(building.buildingId, building.buildingName)

    building.floors?.forEach((floor) => {
      positionMap.set(floor.floorId, floor.floorName)

      floor.areas?.forEach((area) => {
        positionMap.set(area.areaId, area.areaName)
      })
    })
  })

  return positionMap
}

export function toRobotInfo(device: DeviceResponse, positionInfoMap?: Map<string, string>): RobotInfo {
  const skillsList = device.tms?.taskFlowState?.robotSpec?.capabilities ?? []
  return {
    id: device.deviceId,
    name: device.deviceName,
    group: device.provision.isDefaultSite ? '' : device.provision.groupName,
    site: device.provision.isDefaultSite ? '' : device.provision.siteName,
    groupId: device.provision.groupId!,
    siteId: device.provision.siteId!,
    buildingName: positionInfoMap?.get(device.state?.sitePosition?.buildingId ?? ''),
    floorName: positionInfoMap?.get(device.state?.sitePosition?.floorId ?? ''),
    areaName: positionInfoMap?.get(device.state?.sitePosition?.areaId ?? ''),
    status: device.deviceState as RobotStatus,
    batteryLevel: device.state?.batteryState?.batteryCharge ?? 0,
    skills: skillsList.map((item) => item.name) as SkillType[],
    errorCode: 'none',
    errorMessage: 'none'
  }
}
