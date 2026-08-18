import { useCallback, useMemo, useState } from 'react'
import { DeviceParams } from '@/types/api/device'

/** 조직 선택의 특수값. 'all' = 전체, 'none' = 미지정. 둘 다 서버 파라미터로는 보내지 않는다. */
export const ORG_ALL = 'all'
export const ORG_NONE = 'none'

/** [groupId, siteId] */
export type OrgSelection = [string, string]

/**
 * OrganizationSelector 의 onChange 페이로드.
 * @repo/ui 가 JS 로 작성되어 타입을 제공하지 않으므로 여기서 정의한다.
 * values 는 selector depth 만큼의 배열이다(이 hook 은 group/site 2단계를 가정).
 */
export type OrgChangeEvent = {
  values?: string[]
  actualOrgs?: unknown[]
  matchesOrg?: (itemOrg: unknown) => boolean
}

/** 조직 정보를 가진 대상(로봇 등). 문자열이 비어 있으면 "미지정"으로 본다. */
type OrgOwner = {
  group: string
  site: string
}

/**
 * 선택값 → device 목록 조회 파라미터.
 *  - group/site 가 모두 'all' 이면 undefined(파라미터 없음)
 *  - 'all'/'none' 은 서버 필터로 보내지 않는다. 단 하나라도 'all' 이 아니면 빈 객체라도 돌려주어
 *    "필터가 적용된 조회"와 "전체 조회"를 구분한다(기존 동작 유지).
 */
export function toDeviceParams([group, site]: OrgSelection): DeviceParams | undefined {
  if (group === ORG_ALL && site === ORG_ALL) return undefined

  let params: DeviceParams = {}
  if (group !== ORG_ALL && group !== ORG_NONE) params = { ...params, groupId: [group] }
  if (site !== ORG_ALL && site !== ORG_NONE) params = { ...params, siteId: [site] }
  return params
}

/**
 * 'none'(미지정) 선택은 서버 파라미터로 표현할 수 없어 클라이언트에서 걸러야 한다.
 * toDeviceParams 와 짝을 이루는 술어이므로 같이 두고 함께 export 한다.
 */
export function matchesOrgSelection([group, site]: OrgSelection, target: OrgOwner): boolean {
  if (group === ORG_NONE && target.group !== '') return false
  if (site === ORG_NONE && target.site !== '') return false
  return true
}

/**
 * OrganizationSelector 선택 상태와, 그로부터 파생되는 조회 파라미터/필터를 함께 관리한다.
 * deviceParams 는 state 가 아니라 파생값이므로 선택값과 어긋날 수 없다.
 *
 * 여러 화면(RobotsPage / DeployPage / TaskFlowListPage 등)에서 OrganizationSelector 와 함께 쓰는
 * 공용 hook 이다. device 조회 파라미터를 만들므로 device 목록을 다루는 화면이 대상이다.
 */
export function useOrgFilter() {
  const [groupSite, setGroupSite] = useState<OrgSelection>([ORG_ALL, ORG_ALL])

  const deviceParams = useMemo(() => toDeviceParams(groupSite), [groupSite])
  const taskParams = useMemo(() => {
    const [groupId, siteId] = groupSite
    return { groupId: groupId, siteId: siteId }
  }, [groupSite])

  const onOrgChanged = useCallback((e: OrgChangeEvent) => {
    const [group = ORG_ALL, site = ORG_ALL] = e.values ?? []
    setGroupSite([group, site])
  }, [])

  const matchesOrgFilter = useCallback((target: OrgOwner) => matchesOrgSelection(groupSite, target), [groupSite])

  return { groupSite, deviceParams, taskParams, onOrgChanged, matchesOrgFilter }
}
