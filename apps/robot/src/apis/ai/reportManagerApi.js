import { axiosReportManager, pathReports, unwrapData } from './shared'

const normalizeReportTemplateItem = (item, index) => {
  const source = item && typeof item === 'object' ? item : {}

  return {
    id: source.id ?? source.templateId ?? source._id ?? `report-template-${index + 1}`,
    key: String(source.key ?? source.templateKey ?? '').trim(),
    name: String(source.name ?? source.key ?? '').trim(),
    description: String(source.description ?? '').trim(),
    subjectTemplate: String(source.subjectTemplate ?? source.subject ?? '').trim(),
    htmlTemplate: String(source.htmlTemplate ?? source.html ?? '').trim(),
    enabled: Boolean(source.enabled ?? source.isEnabled ?? true),
    createdAt: source.createdAt ?? null,
    updatedAt: source.updatedAt ?? null
  }
}

const normalizeReportTemplatesPayload = (payload) => {
  const base = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.templates)
        ? payload.templates
        : []

  return base.map(normalizeReportTemplateItem)
}

const normalizeReportHistoryItem = (item, index) => {
  const source = item && typeof item === 'object' ? item : {}
  const assignees = Array.isArray(source.assignees)
    ? source.assignees
    : Array.isArray(source.receivers)
      ? source.receivers
      : []

  return {
    id: source.id ?? source.historyId ?? source._id ?? `report-history-${index + 1}`,
    eventId: Number(source.eventId ?? source.event_id ?? 0) || 0,
    templateKey: String(source.templateKey ?? source.key ?? '').trim(),
    subject: String(source.subject ?? '').trim(),
    html: String(source.html ?? source.body ?? '').trim(),
    assignees: assignees.map((it) => String(it ?? '').trim()).filter(Boolean),
    accepted: Array.isArray(source.accepted) ? source.accepted : [],
    rejected: Array.isArray(source.rejected) ? source.rejected : [],
    status: String(source.status ?? '').trim(),
    createdAt: source.createdAt ?? source.sentAt ?? source.created_at ?? null,
    updatedAt: source.updatedAt ?? source.updated_at ?? null
  }
}

const normalizeReportHistoryPayload = (payload) => {
  const base = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.histories)
        ? payload.histories
        : []

  return base.map(normalizeReportHistoryItem)
}
export const getReportHistories = async () => {
  const url = `${pathReports}/history`
  const response = await axiosReportManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: normalizeReportHistoryPayload(payload)
  }
}

export const getReportHistoryById = async (id) => {
  const url = `${pathReports}/history/${encodeURIComponent(String(id))}`
  const response = await axiosReportManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: normalizeReportHistoryItem(payload, 0)
  }
}

export const getReportHistoryByEventId = async (eventId) => {
  const url = `${pathReports}/history/event/${encodeURIComponent(String(eventId))}`
  const response = await axiosReportManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: normalizeReportHistoryPayload(payload)
  }
}
