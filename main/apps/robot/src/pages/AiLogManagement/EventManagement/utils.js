const getText = (value) => {
  if (value === undefined || value === null) return ''
  return String(value)
}

export const toArray = (value) => {
  if (Array.isArray(value)) return value
  return []
}

export const pickFirst = (...values) => {
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== undefined && values[i] !== null && values[i] !== '') {
      return values[i]
    }
  }
  return ''
}

export const normalizeSeverity = (value) => {
  const raw = getText(value).trim().toLowerCase()

  if (!raw) return ''
  if (['high', '높음'].includes(raw)) return 'high'
  if (['critical', '심각'].includes(raw)) return 'critical'
  if (['medium', '중간', 'warn', 'warning'].includes(raw)) return 'medium'
  if (['low', '낮음', 'info'].includes(raw)) return 'low'
  return raw
}

export const normalizeAction = (value) => {
  const raw = getText(value).trim().toLowerCase()

  if (!raw) return ''
  if (['완료', 'done', 'resolved'].includes(raw)) return 'done'
  if (['처리중', 'in_progress', 'processing'].includes(raw)) return 'processing'
  if (['미처리', 'pending', 'open', 'none'].includes(raw)) return 'pending'
  return raw
}

export const normalizeStatus = (value) => {
  const raw = getText(value).trim().toLowerCase()

  if (!raw) return ''
  if (['완료', 'done', 'resolved'].includes(raw)) return 'done'
  if (['처리중', 'in_progress', 'processing', 'running'].includes(raw)) return 'processing'
  if (['미처리', 'pending', 'open', 'none', 'waiting'].includes(raw)) return 'pending'
  return raw
}

export const extractEventIds = (events) => {
  return toArray(events)
    .map((event) => pickFirst(event?.eventId, event?.id))
    .filter((id) => id !== '' && id !== undefined && id !== null)
}

export const buildEventRobotIdMap = (events) => {
  return toArray(events).reduce((acc, event) => {
    const eventId = getText(pickFirst(event?.eventId, event?.id)).trim()
    const robotId = getText(pickFirst(event?.robotId, event?.deviceId, event?.robotNo)).trim()

    if (eventId && robotId) {
      acc.set(eventId, robotId)
    }

    return acc
  }, new Map())
}

export const buildEventStatusMap = (events) => {
  return toArray(events).reduce((acc, event) => {
    const eventId = getText(pickFirst(event?.eventId, event?.id)).trim()
    const status = normalizeStatus(pickFirst(event?.status, event?.eventStatus, event?.state))

    if (eventId && status) {
      acc.set(eventId, status)
    }

    return acc
  }, new Map())
}

const parseEventIds = (value) => {
  if (Array.isArray(value)) {
    return value.map((id) => getText(id).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  }

  return []
}

export const normalizeRefreshParams = (refreshResponse) => {
  const source = pickFirst(
    refreshResponse?.params,
    refreshResponse?.filters,
    refreshResponse?.query,
    refreshResponse?.data,
    refreshResponse
  )

  const params = {
    start: getText(pickFirst(source?.start, source?.startDate)).trim(),
    end: getText(pickFirst(source?.end, source?.endDate)).trim(),
    func: getText(pickFirst(source?.func, source?.function, source?.funcKey)).trim(),
    severity: normalizeSeverity(pickFirst(source?.severity, source?.level)),
    summary: getText(pickFirst(source?.summary, source?.keyword, source?.q)).trim(),
    status: normalizeStatus(pickFirst(source?.status, source?.eventStatus, source?.state)),
    eventIds: parseEventIds(pickFirst(source?.eventIds, source?.ids, source?.eventIdList))
  }

  return Object.fromEntries(
    Object.entries(params).filter(([_, value]) => {
      if (Array.isArray(value)) return value.length > 0
      return Boolean(value)
    })
  )
}

export const normalizeAnalysisRows = (analysisItems, eventRobotIdMap = new Map(), eventStatusMap = new Map()) => {
  return toArray(analysisItems).map((item, index) => {
    const eventId = getText(pickFirst(item?.eventId, item?.id)).trim()
    const mappedRobotId = eventId ? eventRobotIdMap.get(eventId) : ''
    const mappedStatus = eventId ? eventStatusMap.get(eventId) : ''

    return {
      id: pickFirst(item?.id, item?.analysisId, item?.eventId, `row-${index}`),
      robotId: getText(pickFirst(item?.robotId, item?.deviceId, item?.robotNo, mappedRobotId)).trim(),
      func: getText(pickFirst(item?.func, item?.function, item?.funcKey, item?.module)).trim(),
      summary: getText(pickFirst(item?.summary, item?.log, item?.message, item?.description)).trim(),
      status: normalizeStatus(pickFirst(item?.status, item?.eventStatus, item?.state, mappedStatus)),
      severity: normalizeSeverity(pickFirst(item?.severity, item?.level)),
      action: normalizeAction(pickFirst(item?.action, item?.status, item?.result)),
      createdAt: getText(pickFirst(item?.createdAt, item?.timestamp, item?.occurredAt, item?.time)).trim()
    }
  })
}

