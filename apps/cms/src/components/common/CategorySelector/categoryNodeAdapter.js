/**
 * categoryNode(retrieve-category) 응답을 CategorySelector 가 기대하는 트리로 변환하는 어댑터.
 *
 * categoryNode 노드 형태: { categoryCode, displayName:[{textScript, languageId}], contentTypeId, children:[...] }
 * CategorySelector 기대 형태: [{ value, name, contentTypeId, tree:[{ value, name, contentTypeId, tree:[] }] }]
 */

// languages: [{ id, langCode, displayName }] → { [languageId]: langCode }
export const buildLangCodeMap = (languages) => {
  const map = {}
  for (const lang of languages || []) {
    map[lang.id] = lang.langCode
  }
  return map
}

// displayName 맵에서 표시 이름 선택. 우선순위: 현재언어 → default → en-US → 설정된 값 중 아무거나
// (빈 문자열은 미설정으로 간주해 건너뜀)
export const pickLocalizedName = (map, lang) => {
  if (!map) return ''
  return (
    map[lang] ||
    map.default ||
    map['en-US'] ||
    Object.values(map).find((v) => typeof v === 'string' && v.trim()) ||
    ''
  )
}

// 노드의 다국어 displayName 에서 이름 선택 (최종 폴백은 categoryCode)
export const pickNodeName = (node, langCodeById, currentLanguage) => {
  const byLangCode = {}
  for (const d of node.displayName || []) {
    const code = langCodeById[d.languageId]
    if (code) byLangCode[code] = d.textScript
  }
  return pickLocalizedName(byLangCode, currentLanguage) || node.categoryCode || ''
}

const mapNode = (node, langCodeById, currentLanguage) => ({
  ...node,
  value: node.categoryCode,
  name: pickNodeName(node, langCodeById, currentLanguage),
  contentTypeId: node.contentTypeId
})

/**
 * @param roots categoryNode root 배열 (각 root.children 포함)
 * @param opts { langCodeById, currentLanguage, withAll, allLabel }
 */
export const buildCategorySelectorTree = (roots, { langCodeById, currentLanguage, withAll = false, allLabel = 'All' } = {}) => {
  const allOption = { name: allLabel, value: 'all', tree: [] }

  const mapped = (roots || []).map((root) => {
    const children = (root.children || []).map((child) => ({
      ...mapNode(child, langCodeById, currentLanguage),
      tree: []
    }))
    return {
      ...mapNode(root, langCodeById, currentLanguage),
      tree: withAll ? [allOption, ...children] : children
    }
  })

  return withAll ? [allOption, ...mapped] : mapped
}
