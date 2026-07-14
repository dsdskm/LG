/**
 * 조직 선택값(코드) → CMS 숫자 ID 변환 유틸.
 *
 * selectedOrgs 는 그룹/사이트 "코드"([groupCode, siteCode])를 담고 있다.
 * 카테고리/콘텐츠 API 는 CMS 의 숫자 ID(siteId/groupId)를 요구하므로,
 * org 셀렉터 로드 시 registerOrganization(BE createGroupSite)으로 이미 해석되어
 * allOrgs 에 저장된 .id 를 코드로 매칭해 가져온다.
 */

const isRealCode = (v) => v && v !== 'none' && v !== 'all'

export const resolveOrgIds = (selectedOrgs, allOrgs) => {
  const [groupCode, siteCode] = selectedOrgs || []
  let groupId
  let siteId
  if (isRealCode(groupCode)) {
    const g = (allOrgs || []).find((o) => o.originalType === 'CMS_GROUP' && String(o.code) === String(groupCode))
    groupId = g?.id
  }
  if (isRealCode(siteCode)) {
    const s = (allOrgs || []).find((o) => o.originalType === 'CMS_SITE' && String(o.code) === String(siteCode))
    siteId = s?.id
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
  // 그룹 자체를 '-'(미지정)로 선택 → 어떤 콘텐츠도 조회하지 않음(null 신호)
  if (groupSel === 'none') return null
  const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
  const siteSel = selectedOrgs?.[1]
  if (siteId != null) return { siteId }
  if (groupId != null) return siteSel === 'none' ? { groupId, siteUnassigned: true } : { groupId }
  return {}
}
