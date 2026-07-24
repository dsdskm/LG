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
    return String(item?.key ?? item?.screenKey ?? item?.routeKey ?? item?.screenName ?? 'unknown')
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

    const isTaskflowCanvasRoute = (routeKey) => {
        const normalized = normalizeRoute(routeKey)
        if (!normalized) return false
        return /^tms\/taskflows\/(?:[^/]+|:taskFlowId|:id)\/canvas(?:\/|$)/.test(normalized)
    }

    const buildBuiltInActionTools = (routeKey, existingTools) => {
        if (!isTaskflowCanvasRoute(routeKey)) return []

        const hasCompose = (Array.isArray(existingTools) ? existingTools : []).some(
            (tool) => String(tool?.toolName ?? '').trim() === 'compose_linear_taskflow'
        )
        if (hasCompose) return []

        return [
            {
                id: `builtin::${normalizeRoute(routeKey)}::compose_linear_taskflow`,
                appKey: 'tms',
                key: normalizeRoute(routeKey),
                routeKey: 'tms/taskflows',
                toolName: 'compose_linear_taskflow',
                displayName: '직선 태스크플로우 구성',
                kind: 'action',
                description: '코드 내장 액션 툴(동적 편집 불가). 사용자 요청을 태스크플로우 캔버스 draft로 구성합니다.',
                apiName: 'compose_linear_taskflow',
                method: 'LOCAL',
                endpoint: '-',
                baseUrl: '',
                requestHeaders: {},
                requestQuery: {},
                requestBody: {},
                contextParams: [],
                requestParams: [{ name: 'steps', type: 'array', required: true, in: 'body' }],
                staticPayload: { layout: 'linear', mode: 'replace' },
                sortOrder: 9999,
                enabled: true,
                isCodeTool: true,
                isReadOnly: true,
            },
        ]
    }

    const buildLookupRouteKeys = (routeKey) => {
        const normalized = normalizeRoute(routeKey)
        if (!normalized) return ['common']

        const segments = normalized.split('/').filter(Boolean)
        const parents = Array.from({ length: Math.max(segments.length - 1, 0) }, (_, idx) =>
            segments.slice(0, segments.length - 1 - idx).join('/')
        )

        return [normalized, ...parents, 'common'].filter(Boolean)
    }

    const buildInheritedTools = (routeKey) => {
        const lookupKeys = buildLookupRouteKeys(routeKey)
        const priority = new Map(lookupKeys.map((key, idx) => [key, idx]))

        const candidates = (Array.isArray(screenTools) ? screenTools : [])
            .filter((tool) => tool?.enabled !== false)
            .map((tool) => {
                const key = normalizeRoute(tool?.key ?? tool?.routeKey)
                return { tool, key, priority: priority.get(key) }
            })
            .filter((item) => item.priority !== undefined)
            .sort((left, right) => {
                if (left.priority !== right.priority) return Number(left.priority) - Number(right.priority)
                if (Number(left.tool?.sortOrder ?? 0) !== Number(right.tool?.sortOrder ?? 0)) {
                    return Number(left.tool?.sortOrder ?? 0) - Number(right.tool?.sortOrder ?? 0)
                }
                return String(left.tool?.toolName ?? '').localeCompare(String(right.tool?.toolName ?? ''))
            })

        const seen = new Set()
        const merged = []

        for (const item of candidates) {
            const toolName = String(item.tool?.toolName ?? '').trim()
            if (!toolName || seen.has(toolName)) continue
            seen.add(toolName)
            merged.push(item.tool)
        }

        const builtInTools = buildBuiltInActionTools(routeKey, merged)
        return [...merged, ...builtInTools]
    }

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
            tools: buildInheritedTools(group.routeKey),
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

const normalizeRoute = (value) => String(value ?? '').trim().replace(/^\/+/, '')

export const buildAppRouteTree = (screens, appKey, visibleRouteKeys) => {
    const normalizedAppKey = String(appKey ?? '').trim()
    if (!normalizedAppKey) return []

    const appScreens = (Array.isArray(screens) ? screens : [])
        .filter((item) => item?.enabled !== false)
        .map((item) => {
            const key = normalizeRoute(item?.key)
            const parentKey = normalizeRoute(item?.routeKey)
            const itemAppKey = String(item?.appKey ?? '').trim() || key.split('/')[0]

            return {
                key,
                parentKey,
                appKey: itemAppKey,
                label: String(item?.screenName ?? key.split('/').pop() ?? key),
                sortOrder: Number(item?.sortOrder ?? 0),
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

    const nodeMap = new Map(
        filtered.map((item) => [
            item.key,
            {
                key: item.key,
                label: item.label,
                sortOrder: item.sortOrder,
                children: [],
            },
        ])
    )

    for (const item of filtered) {
        const node = nodeMap.get(item.key)
        if (!node) continue

        const parent = nodeMap.get(item.parentKey)
        if (parent && parent.key !== node.key) {
            parent.children.push(node)
        }
    }

    const roots = filtered
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

export const buildActionRouteKeysByApp = (screenTools, appKey) => {
    const normalizedAppKey = String(appKey ?? '').trim()
    if (!normalizedAppKey) return new Set()

    const keys = new Set()
    for (const item of (Array.isArray(screenTools) ? screenTools : [])) {
        if (item?.enabled === false) continue
        if (String(item?.key ?? '').trim() !== 'common') continue

        const method = String(item?.method ?? '').trim().toUpperCase()
        if (method !== 'NAVIGATE') continue

        const path = normalizeRoute(item?.staticPayload?.path ?? item?.endpoint)
        if (!path || !path.startsWith(`${normalizedAppKey}/`)) continue
        keys.add(path)
    }

    return keys
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
        if (String(node.key ?? '') === target) return true
        return (node.children ?? []).some((child) => visit(child))
    }

    return (Array.isArray(routeTree) ? routeTree : []).some((node) => visit(node))
}
