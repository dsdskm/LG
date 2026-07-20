export const normalizeSeverity = (row) => {
  const raw = String(row?.severity ?? row?.level ?? row?.eventSeverity ?? row?.analysisSeverity ?? '')
    .trim()
    .toLowerCase()

  if (!raw) return ''

  if (['critical', '치명', '심각'].includes(raw)) return 'critical'
  if (['high', '상', '높음'].includes(raw)) return 'high'
  if (['middle', 'medium', 'med', '중', '보통'].includes(raw)) return 'middle'
  if (['low', '하', '낮음'].includes(raw)) return 'low'

  return raw
}

export const normalizeStatus = (row) => {
  return String(row?.analysisStatus ?? row?.status ?? row?.actionStatus ?? row?.result ?? '')
    .trim()
    .toUpperCase()
}

export const hasAnalysisContent = (row) => {
  const summary = String(row?.summary ?? '').trim()
  const reason = String(row?.reason ?? '').trim()
  const solution = row?.solution

  if (summary) return true
  if (reason) return true
  if (Array.isArray(solution) && solution.filter(Boolean).length > 0) return true
  if (typeof solution === 'string' && solution.trim()) return true

  return false
}

export const isAnalysisCompleted = (row) => {
  const status = normalizeStatus(row)

  if (['DONE', 'SUCCESS', 'SUCCEEDED', 'COMPLETED', 'COMPLETE', 'ANALYZED', 'FINISHED'].includes(status)) {
    return true
  }

  return hasAnalysisContent(row)
}

export const isAnalysisFailed = (row) => {
  const status = normalizeStatus(row)
  if (['FAILED', 'FAIL', 'ERROR', 'ANALYSIS_FAILED', 'ANALYZE_FAILED'].includes(status)) {
    return true
  }

  return false
}

export const isActionCompleted = (row) => {
  return String(row?.status ?? row?.actionStatus ?? row?.result ?? '')
    .trim()
    .toLowerCase() === 'completed'
}

export const buildEventSummary = (rows = [], totalCountOverride) => {
  const safeRows = Array.isArray(rows) ? rows : []

  const actionCompletedCount = safeRows.filter(isActionCompleted).length
  const analysisCompletedCount = safeRows.filter(isAnalysisCompleted).length
  const analysisFailedCount = safeRows.filter(isAnalysisFailed).length
  const severityCriticalCount = safeRows.filter((item) => normalizeSeverity(item) === 'critical').length
  const severityHighCount = safeRows.filter((item) => normalizeSeverity(item) === 'high').length
  const severityMiddleCount = safeRows.filter((item) => normalizeSeverity(item) === 'middle').length
  const severityLowCount = safeRows.filter((item) => normalizeSeverity(item) === 'low').length

  return {
    totalCount: typeof totalCountOverride === 'number' ? totalCountOverride : safeRows.length,
    actionCompletedCount,
    analysisCompletedCount,
    analysisFailedCount,
    severityCriticalCount,
    severityHighCount,
    severityMiddleCount,
    severityLowCount
  }
}
