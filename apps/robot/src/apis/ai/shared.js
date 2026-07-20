import { robotClient } from '@repo/apis'
import { ENDPOINTS } from '../constants'

export const axiosEventReceiver = robotClient(import.meta.env.VITE_EVENT_RECEIVER_URL)
export const pathEventReceiver = ENDPOINTS.AI.EVENT_RECEIVER

export const axiosEventAnalyzer = robotClient(import.meta.env.VITE_EVENT_ANALYZER_URL)
export const pathEventAnalyzer = ENDPOINTS.AI.EVENT_ANALYZER
export const pathQueryLogs = import.meta.env.VITE_EVENT_ANALYZER_URL + '/query/logs'

export const axiosConfigManager = robotClient(import.meta.env.VITE_CONFIG_MANAGER_URL)
export const pathConfigManager = ENDPOINTS.AI.CONFIG_MANAGER
export const pathLlmConfig = `${pathConfigManager}/llm`
export const pathAssigneesConfig = `${pathConfigManager}/assignees`
export const pathFunConfig = `${pathConfigManager}/fun`
export const pathReportConfig = `${pathConfigManager}/report`

export const axiosActionRunner = robotClient(import.meta.env.VITE_ACTION_RUNNER_URL)
export const pathActionRunner = ENDPOINTS.AI.ACTION_RUNNER

export const axiosReportManager = robotClient(import.meta.env.VITE_REPORT_MANAGER_URL)
export const pathReportManager = ENDPOINTS.AI.REPORT_MANAGER
export const pathReports = `${pathReportManager}/reports`

export const applyCommonFilters = (searchParams, params = {}) => {
  if (typeof params.start === 'string' && params.start.trim()) {
    searchParams.set('start', params.start.trim())
  }

  if (typeof params.end === 'string' && params.end.trim()) {
    searchParams.set('end', params.end.trim())
  }

  if (typeof params.func === 'string' && params.func.trim()) {
    searchParams.set('func', params.func.trim())
  }

  if (typeof params.severity === 'string' && params.severity.trim()) {
    searchParams.set('severity', params.severity.trim())
  }

  if (typeof params.summary === 'string' && params.summary.trim()) {
    searchParams.set('summary', params.summary.trim())
  }

  if (typeof params.status === 'string' && params.status.trim()) {
    searchParams.set('status', params.status.trim())
  }
}

export const unwrapData = (responseData) => {
  if (responseData?.data !== undefined) {
    return responseData.data
  }
  return responseData
}

export const toStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }

  return []
}

export const toOptionalTrimmedString = (value) => {
  if (typeof value !== 'string') return undefined
  const next = value.trim()
  return next || undefined
}

export const normalizeProviderKey = (provider) => {
  const next = String(provider ?? '')
    .trim()
    .toLowerCase()

  if (next === 'msazure') return 'azure'
  if (next === 'microsoft-azure') return 'azure'
  if (next === 'none') return 'off'
  return next
}
