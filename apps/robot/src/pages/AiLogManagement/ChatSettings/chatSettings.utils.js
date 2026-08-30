export const formatDateTime = (value) => {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return String(value)

  try {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch {
    return date.toLocaleString('ko-KR')
  }
}

export const getPromptDraft = (drafts, item) => {
  const draftKey = String(item?.id ?? item?.key ?? '')
  const current = drafts[draftKey] ?? {}

  return {
    content: current.content ?? String(item.content ?? ''),
    enabled: current.enabled ?? item.enabled !== false
  }
}

export const groupPrompts = (prompts) => {
  const map = new Map()

  for (const item of prompts) {
    const category = String(item?.promptType ?? item?.category ?? 'other')
    const rows = map.get(category) ?? []

    rows.push(item)
    map.set(category, rows)
  }

  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    items: items.slice().sort((left, right) => String(left.key).localeCompare(String(right.key)))
  }))
}

export const getGuidanceRouteKey = (item) => {
  return String(item?.screenKey ?? item?.key ?? item?.routeKey ?? item?.screenName ?? 'unknown')
}

export const getScreenRouteKey = (item) => {
  return String(item?.key ?? item?.screenKey ?? item?.routeKey ?? 'unknown')
}

export const getScreenTitle = (group) => {
  if (group.screenName) return group.screenName
  if (group.routeKey) return group.routeKey

  return '알 수 없는 화면'
}

export const groupScreenSettings = (screens, prompts, guidance, ragDocs) => {
  const map = new Map()
  const normalizedPrompts = Array.isArray(prompts) ? prompts : []
  const normalizedGuidance = Array.isArray(guidance) ? guidance : []
  const normalizedRagDocs = Array.isArray(ragDocs) ? ragDocs : []

  console.info('[chat-settings][screen-group]', {
    screens: Array.isArray(screens) ? screens.length : 0,
    prompts: normalizedPrompts.length,
    guidance: normalizedGuidance.length,
    ragDocs: normalizedRagDocs.length,
    samplePrompts: normalizedPrompts.slice(0, 6).map((item) => ({
      id: item?.id,
      appKey: item?.appKey ?? item?.app_key,
      screenKey: item?.screenKey ?? item?.screen_key ?? item?.key,
      routeKey: item?.routeKey ?? item?.route_key,
      type: item?.type ?? item?.promptType ?? item?.category,
      label: item?.label,
      contentLength: String(item?.content ?? item?.prompt ?? '').length
    }))
  })

  console.info('[chat-settings][screen-group][prompt-route-debug]', {
    promptRows: normalizedPrompts.map((item) => ({
      id: item?.id,
      appKey: item?.appKey ?? item?.app_key,
      screenKey: item?.screenKey ?? item?.screen_key ?? item?.key,
      routeKey: item?.routeKey ?? item?.route_key,
      derivedRouteKey: getGuidanceRouteKey(item),
      type: item?.type ?? item?.promptType ?? item?.category,
      label: item?.label,
      contentLength: String(item?.content ?? item?.prompt ?? '').length
    })),
    guidanceRows: normalizedGuidance.map((item) => ({
      id: item?.id,
      appKey: item?.appKey ?? item?.app_key,
      screenKey: item?.screenKey ?? item?.screen_key ?? item?.key,
      routeKey: item?.routeKey ?? item?.route_key,
      derivedRouteKey: getGuidanceRouteKey(item),
      examplesCount: Array.isArray(item?.examples) ? item.examples.length : 0
    })),
    ragRows: normalizedRagDocs.map((item) => ({
      id: item?.id,
      appKey: item?.appKey ?? item?.app_key,
      screenKey: item?.screenKey ?? item?.screen_key ?? item?.key,
      routeKey: item?.routeKey ?? item?.route_key,
      intentType: item?.intentType
    }))
  })

  for (const item of screens) {
    const routeKey = getScreenRouteKey(item)
    map.set(routeKey, {
      routeKey,
      routeParentKey: item?.routeKey ?? '',
      screenName: item?.screenName ?? routeKey,
      prompts: [],
      guidance: [],
      ragDocs: []
    })
  }

  for (const item of prompts) {
    const routeKey = getGuidanceRouteKey(item)
    const prev = map.get(routeKey) ?? {
      routeKey,
      routeParentKey: item?.routeKey ?? '',
      screenName: item?.label ?? routeKey,
      prompts: [],
      guidance: [],
      ragDocs: []
    }

    map.set(routeKey, {
      ...prev,
      routeParentKey: prev.routeParentKey || item?.routeKey || '',
      prompts: [...prev.prompts, item]
    })
  }

  for (const item of guidance) {
    const routeKey = getGuidanceRouteKey(item)
    const prev = map.get(routeKey) ?? {
      routeKey,
      routeParentKey: item?.routeKey ?? '',
      screenName: item?.screenName ?? item?.screenKey ?? item?.key ?? '',
      prompts: [],
      guidance: [],
      ragDocs: []
    }

    map.set(routeKey, {
      ...prev,
      routeParentKey: prev.routeParentKey || item?.routeKey || '',
      screenName: prev.screenName || item?.screenName || item?.screenKey || item?.key || routeKey,
      guidance: [...prev.guidance, item]
    })
  }

  for (const item of ragDocs) {
    const routeKey = String(
      item?.screenKey ?? item?.screen_key ?? item?.key ?? item?.routeKey ?? item?.route_key ?? 'unknown'
    )
    const prev = map.get(routeKey) ?? {
      routeKey,
      routeParentKey: item?.routeKey ?? '',
      screenName: routeKey,
      prompts: [],
      guidance: [],
      ragDocs: []
    }

    map.set(routeKey, {
      ...prev,
      routeParentKey: prev.routeParentKey || item?.routeKey || '',
      screenName: prev.screenName || item?.screenName || routeKey,
      ragDocs: [...prev.ragDocs, item]
    })
  }

  const grouped = Array.from(map.values())
    .map((group) => ({
      ...group,
      prompts: group.prompts.slice().sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0)),
      guidance: group.guidance.slice().sort((left, right) => String(left.key).localeCompare(String(right.key))),
      ragDocs: group.ragDocs.slice().sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0))
    }))
    .sort((left, right) => getScreenTitle(left).localeCompare(getScreenTitle(right)))

  console.info('[chat-settings][screen-group][final-groups]', {
    count: grouped.length,
    groupKeys: grouped.map((group) => ({
      routeKey: group.routeKey,
      parent: group.routeParentKey,
      promptCount: group.prompts.length,
      guidanceCount: group.guidance.length,
      ragCount: group.ragDocs.length,
      promptTypes: group.prompts.map((item) => String(item?.type ?? item?.promptType ?? item?.category ?? 'unknown'))
    }))
  })

  return grouped
}

const routePatternMatches = (routeKey, targetRouteKey) => {
  const current = normalizeRoute(routeKey)
  const target = normalizeRoute(targetRouteKey)

  if (!current || !target) return false
  if (current === target) return true

  const currentSegments = current.split('/').filter(Boolean)
  const targetSegments = target.split('/').filter(Boolean)
  if (currentSegments.length !== targetSegments.length) return false

  return currentSegments.every((segment, index) => {
    const targetSegment = targetSegments[index]
    return segment === targetSegment || segment.startsWith(':') || targetSegment.startsWith(':')
  })
}

export const isSameOrChildRoute = (routeKey, targetRouteKey) => {
  if (!routeKey || !targetRouteKey) return false

  const current = normalizeRoute(routeKey)
  const target = normalizeRoute(targetRouteKey)
  if (current === target) return true

  return current.startsWith(`${target}/`) || routePatternMatches(current, target)
}

export const filterScreenGroupsByRoute = (screenGroups, activeRouteKey) => {
  if (!activeRouteKey) return []

  const filtered = (Array.isArray(screenGroups) ? screenGroups : []).filter((group) => {
    const routeKey = String(group.routeKey ?? '')

    return routePatternMatches(routeKey, activeRouteKey)
  })

  console.info('[chat-settings][screen-group][filter-by-route]', {
    activeRouteKey,
    allGroupKeys: (Array.isArray(screenGroups) ? screenGroups : []).map((group) => String(group.routeKey ?? '')),
    filteredGroupKeys: filtered.map((group) => String(group.routeKey ?? '')),
    filteredCount: filtered.length
  })

  return filtered
}

const normalizeRoute = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^\/+/, '')

export const buildAppRouteTree = (screens, appKey, visibleRouteKeys) => {
  const normalizedAppKey = String(appKey ?? '').trim()
  if (!normalizedAppKey) return []

  const appScreens = (Array.isArray(screens) ? screens : [])
    .filter((item) => item?.enabled !== false)
    .map((item) => {
      const key = normalizeRoute(item?.key ?? item?.screenKey ?? item?.screen_key)
      const parentKey = normalizeRoute(item?.routeKey ?? item?.route_key ?? '')
      const itemAppKey = String(item?.appKey ?? item?.app_key ?? '').trim() || key.split('/')[0]

      return {
        key,
        parentKey,
        appKey: itemAppKey,
        label: String(item?.screenName ?? item?.name ?? key.split('/').pop() ?? key),
        sortOrder: Number(item?.sortOrder ?? 0)
      }
    })
    .filter((item) => item.appKey === normalizedAppKey && item.key)

  return buildFilteredAppRouteTree(appScreens, visibleRouteKeys)
}

const buildFilteredAppRouteTree = (appScreens, visibleRouteKeys) => {
  const rows = Array.isArray(appScreens) ? appScreens : []

  let filtered = rows
  if (visibleRouteKeys instanceof Set && visibleRouteKeys.size > 0) {
    const exists = new Set(rows.map((item) => item.key))
    const parentMap = new Map(rows.map((item) => [item.key, item.parentKey]))

    const include = new Set()
    for (const key of visibleRouteKeys) {
      if (!exists.has(key)) continue

      include.add(key)
      let cursor = parentMap.get(key)
      while (cursor && exists.has(cursor) && !include.has(cursor)) {
        include.add(cursor)
        cursor = parentMap.get(cursor)
      }
    }

    filtered = rows.filter((item) => include.has(item.key))
  }

  const keySet = new Set(filtered.map((item) => item.key))
  const rowsWithParents = filtered.map((item) => {
    if (item.parentKey && keySet.has(item.parentKey) && item.parentKey !== item.key) return item

    const inferredParentKey = filtered
      .map((candidate) => candidate.key)
      .filter((candidateKey) => candidateKey !== item.key && item.key.startsWith(`${candidateKey}/`))
      .sort((left, right) => right.length - left.length)[0]

    return {
      ...item,
      parentKey: inferredParentKey || ''
    }
  })

  const nodeMap = new Map(
    rowsWithParents.map((item) => [
      item.key,
      {
        key: item.key,
        label: item.label,
        sortOrder: item.sortOrder,
        children: []
      }
    ])
  )

  for (const item of rowsWithParents) {
    const node = nodeMap.get(item.key)
    if (!node) continue

    const parent = nodeMap.get(item.parentKey)
    if (parent && parent.key !== node.key) {
      parent.children.push(node)
    }
  }

  const roots = rowsWithParents
    .filter((item) => {
      const parent = nodeMap.get(item.parentKey)
      return !parent || parent.key === item.key
    })
    .map((item) => nodeMap.get(item.key))
    .filter(Boolean)

  const sortNodes = (nodes) => {
    nodes.sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
      return String(left.key).localeCompare(String(right.key))
    })

    nodes.forEach((node) => sortNodes(node.children))
  }

  sortNodes(roots)
  return roots
}

export const getFirstRouteKeyFromTree = (routeTree) => {
  const list = Array.isArray(routeTree) ? routeTree : []
  if (list.length === 0) return ''

  const visit = (node) => {
    if (!node) return ''
    if (!Array.isArray(node.children) || node.children.length === 0) {
      return String(node.key ?? '')
    }
    return visit(node.children[0])
  }

  return visit(list[0])
}

export const hasRouteKeyInTree = (routeTree, routeKey) => {
  const target = normalizeRoute(routeKey)
  if (!target) return false

  const visit = (node) => {
    if (!node) return false
    if (routePatternMatches(String(node.key ?? ''), target)) return true
    return (node.children ?? []).some((child) => visit(child))
  }

  return (Array.isArray(routeTree) ? routeTree : []).some((node) => visit(node))
}
