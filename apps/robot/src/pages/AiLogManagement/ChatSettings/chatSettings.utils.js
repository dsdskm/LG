export const formatDateTime = (value) => {
    if (!value) return '-'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return String(value)

    return date.toLocaleString('ko-KR')
}

export const getPromptDraft = (drafts, item) => {
    const draftKey = String(item?.id ?? item?.key ?? '')
    const current = drafts[draftKey] ?? {}

    return {
        content: current.content ?? String(item.content ?? ''),
        enabled: current.enabled ?? item.enabled !== false,
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
        items: items.slice().sort((left, right) => String(left.key).localeCompare(String(right.key))),
    }))
}

export const getGuidanceRouteKey = (item) => {
    return String(item?.routeKey ?? item?.screenKey ?? item?.key ?? item?.screenName ?? 'unknown')
}

export const getScreenRouteKey = (item) => {
    return String(item?.key ?? item?.routeKey ?? 'unknown')
}

export const getScreenTitle = (group) => {
    if (group.screenName) return group.screenName
    if (group.routeKey) return group.routeKey

    return '알 수 없는 화면'
}

export const groupScreenSettings = (screens, prompts, guidance, ragDocs, screenTools) => {
    const map = new Map()

    for (const item of screens) {
        const routeKey = getScreenRouteKey(item)
        map.set(routeKey, {
            routeKey,
            routeParentKey: item?.routeKey ?? '',
            screenName: item?.screenName ?? routeKey,
            prompts: [],
            guidance: [],
            ragDocs: [],
            tools: [],
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
            ragDocs: [],
            tools: [],
        }

        map.set(routeKey, {
            ...prev,
            routeParentKey: prev.routeParentKey || item?.routeKey || '',
            prompts: [...prev.prompts, item],
        })
    }

    for (const item of guidance) {
        const routeKey = getGuidanceRouteKey(item)
        const prev = map.get(routeKey) ?? {
            routeKey,
            routeParentKey: item?.routeKey ?? '',
            screenName: item?.screenName ?? '',
            prompts: [],
            guidance: [],
            ragDocs: [],
            tools: [],
        }

        map.set(routeKey, {
            ...prev,
            routeParentKey: prev.routeParentKey || item?.routeKey || '',
            screenName: prev.screenName || item?.screenName || routeKey,
            guidance: [...prev.guidance, item],
        })
    }

    for (const item of ragDocs) {
        const routeKey = String(item?.key ?? 'unknown')
        const prev = map.get(routeKey) ?? {
            routeKey,
            routeParentKey: item?.routeKey ?? '',
            screenName: routeKey,
            prompts: [],
            guidance: [],
            ragDocs: [],
            tools: [],
        }

        map.set(routeKey, {
            ...prev,
            routeParentKey: prev.routeParentKey || item?.routeKey || '',
            ragDocs: [...prev.ragDocs, item],
        })
    }

    for (const tool of screenTools) {
        const routeKey = String(tool?.key ?? tool?.routeKey ?? 'unknown')
        const prev = map.get(routeKey) ?? {
            routeKey,
            routeParentKey: tool?.routeKey ?? '',
            screenName: routeKey,
            prompts: [],
            guidance: [],
            ragDocs: [],
            tools: [],
        }

        map.set(routeKey, {
            ...prev,
            routeParentKey: prev.routeParentKey || tool?.routeKey || '',
            screenName: prev.screenName || routeKey,
            tools: [...prev.tools, tool],
        })
    }

    return Array.from(map.values())
        .map((group) => ({
            ...group,
            prompts: group.prompts.slice().sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0)),
            guidance: group.guidance.slice().sort((left, right) => String(left.key).localeCompare(String(right.key))),
            ragDocs: group.ragDocs.slice().sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0)),
            tools: group.tools.slice().sort((left, right) => String(left.toolName).localeCompare(String(right.toolName))),
        }))
        .sort((left, right) => getScreenTitle(left).localeCompare(getScreenTitle(right)))
}

export const isSameOrChildRoute = (routeKey, targetRouteKey) => {
    if (!routeKey || !targetRouteKey) return false

    return routeKey === targetRouteKey || routeKey.startsWith(`${targetRouteKey}/`)
}

export const filterScreenGroupsByRoute = (screenGroups, activeRouteKey) => {
    if (!activeRouteKey) return []

    return screenGroups.filter((group) => {
        const routeKey = String(group.routeKey ?? '')

        return routeKey === activeRouteKey
    })
}
