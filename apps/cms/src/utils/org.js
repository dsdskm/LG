/**
 * 조직 선택값(코드) → CMS 숫자 ID 변환 유틸.
 *
 * selectedOrgs 는 그룹/사이트 "코드"([groupCode, siteCode])를 담고 있다.
 * 카테고리/콘텐츠 API 는 CMS 의 숫자 ID(siteId/groupId)를 요구하므로,
 * org 셀렉터 로드 시 registerOrganization(BE createGroupSite)으로 이미 해석되어
 * allOrgs 에 저장된 .id 를 코드로 매칭해 가져온다.
 */

export const isRealCode = (v) => v && v !== 'none' && v !== 'all'

export const resolveOrgIds = (selectedOrgs, allOrgs) => {
  const [groupCode, siteCode] = selectedOrgs || []
  const orgs = allOrgs || []
  let groupId
  let siteId
  if (isRealCode(groupCode)) {
    groupId = orgs.find((o) => o.originalType === 'CMS_GROUP' && String(o.code) === String(groupCode))?.id
  }
  if (isRealCode(siteCode)) {
    const s = orgs.find((o) => o.originalType === 'CMS_SITE' && String(o.code) === String(siteCode))
    siteId = s?.id
    // 그룹이 '전체(all)'여도 특정 사이트가 선택되면 사이트의 부모 그룹으로 groupId 유도
    if (groupId == null && s?.parentCode != null) {
      groupId = orgs.find((o) => o.originalType === 'CMS_GROUP' && String(o.code) === String(s.parentCode))?.id
    }
  }
  return { groupId, siteId }
}

/**
 * OrganizationSelector 선택 조합 → 콘텐츠 목록 서버 필터 쿼리.
 * - 특정 site           → { siteId }                      (그 site 정확히)
 * - 특정 group + site 전체 → { groupId }                    (그룹 전체: 하위 site + 그룹 직접)
 * - 특정 group + site '-'  → { groupId, siteUnassigned:true } (그룹 직접만, siteId IS NULL)
 * - 전체/전체            → {}                              (전체)
 */
export const resolveOrgQuery = (selectedOrgs, allOrgs) => {
  const groupSel = selectedOrgs?.[0]
  // 그룹 '-'(미지정) → group_id IS NULL 콘텐츠만 (어느 조직에도 속하지 않는 콘텐츠)
  if (groupSel === 'none') return { groupUnassigned: true }
  const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
  const siteSel = selectedOrgs?.[1]
  if (siteId != null) return { siteId }
  if (groupId != null) return siteSel === 'none' ? { groupId, siteUnassigned: true } : { groupId }
  // 전체그룹 → 그룹이 지정된 콘텐츠만(미지정 null 제외)
  return { groupAssigned: true }
}
