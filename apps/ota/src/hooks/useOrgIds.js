import { useMemo } from 'react'
import { useOrganizationStore, useUserStore } from '@repo/stores'

/**
 * 조회 API 에 넘길 조직 id 목록을 계산한다.
 *
 * organizationStore 의 defaultOrg 초기값이 {} 이고 allOrgs/actualOrgs 도 비어 있는 상태로 먼저 렌더되므로,
 * id 가 없는 조직을 그대로 map/join 하면 [''] 또는 [NaN] 같은 값이 API 로 전달된다.
 * 여기서 유효한 id 만 남기고, 비어 있으면 호출부에서 조회를 건너뛸 수 있도록 빈 배열을 돌려준다.
 *
 * @returns {{ orgIds: number[], orgIdsKey: string, primaryOrgId: number|undefined }}
 *  - orgIds: 오름차순 정렬된 조직 id 목록 (참조가 안정적이므로 의존성 배열에 그대로 쓸 수 있다)
 *  - orgIdsKey: useEffect/useCallback 의존성용 원시값
 *  - primaryOrgId: 생성 화면 진입 등 단일 조직이 필요할 때 사용
 */
export const useOrgIds = () => {
  const session = useUserStore((state) => state.session)
  const { actualOrgs, allOrgs, defaultOrg } = useOrganizationStore()

  const isSystemManagerWithoutSelection = session?.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0

  const orgIdsKey = (isSystemManagerWithoutSelection ? [...allOrgs, defaultOrg] : actualOrgs)
    .map((org) => org?.id)
    .filter((orgId) => orgId !== undefined && orgId !== null)
    .sort((a, b) => a - b)
    .join(',')

  const orgIds = useMemo(() => (orgIdsKey ? orgIdsKey.split(',').map(Number) : []), [orgIdsKey])

  const primaryOrgId = isSystemManagerWithoutSelection ? defaultOrg?.id : actualOrgs[0]?.id

  return { orgIds, orgIdsKey, primaryOrgId }
}

export default useOrgIds
