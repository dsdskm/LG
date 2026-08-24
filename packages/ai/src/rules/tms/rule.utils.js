function toParamList(params) {
	if (Array.isArray(params)) {
		return params.map((value) => String(value ?? '').trim()).filter(Boolean)
	}

	if (params === undefined || params === null) {
		return []
	}

	const single = String(params).trim()
	return single ? [single] : []
}

function isDigits(value) {
	return /^\d+$/.test(String(value ?? '').trim())
}

function toTaskflowId(value) {
	const parsed = Number(String(value ?? '').trim())
	return Number(value)
}

function normalizePathname(value) {
	const raw = String(value ?? '').trim()
	if (!raw) {
		return ''
	}

	let path = raw
	if (/^https?:\/\//i.test(raw)) {
		try {
			path = new URL(raw).pathname
		} catch {
			path = raw
		}
	}

	path = path.split('?')[0].split('#')[0].trim()
	if (!path) {
		return ''
	}

	return path.startsWith('/') ? path : `/${path}`
}

function parseIdsFromPath(pathname) {
	const path = normalizePathname(pathname)
	if (!path) {
		return { robotId: '', taskflowId: 0 }
	}

	const taskflowMatch = path.match(/^\/tms\/taskflows\/(\d+)\/(?:detail|canvas)(?:\/.*)?$/i)
	if (taskflowMatch) {
		return {
			robotId: '',
			taskflowId: toTaskflowId(taskflowMatch[1]),
		}
	}

	const robotMatch = path.match(/^\/tms\/robots\/([^/]+)\/detail(?:\/.*)?$/i)
	if (robotMatch) {
		return {
			robotId: decodeURIComponent(robotMatch[1]),
			taskflowId: 0,
		}
	}

	return { robotId: '', taskflowId: 0 }
}

export function resolveRobotTaskflowIds(params, pathname) {
	const paramList = toParamList(params)
	const currentPath = pathname !== undefined ? pathname : (typeof window !== 'undefined' ? window.location.pathname : '')
	const routeIds = parseIdsFromPath(currentPath)
    console.log(`routeIds`,routeIds)
    console.log(`paramList`,paramList)
	let robotId = ''
	let taskFlowId = 0

	if (paramList.length >= 2) {
		robotId = paramList[0]
		taskFlowId = toTaskflowId(paramList[1])
	} else if (paramList.length === 1) {
		if (isDigits(paramList[0])) {
			robotId = routeIds.robotId
            taskFlowId = toTaskflowId(paramList[0])
		} else {
			robotId = paramList[0]
            taskFlowId=routeIds.taskflowId
		}
	}


	return {
		robotId,
		taskFlowId
	}
}

