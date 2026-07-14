/**
 * 프론트 AiLogManagement/EventManagement/EventTablePanel/utils.js 의
 * buildEventSummary 로직 포팅. 대시보드 "AI 이벤트 요약" 카드와 동일한 집계.
 */

const normalizeSeverity = (row: any): string => {
  const raw = String(
    row?.severity ?? row?.level ?? row?.eventSeverity ?? row?.analysisSeverity ?? '',
  )
    .trim()
    .toLowerCase()

  if (!raw) return ''
  if (['critical', '치명', '심각'].includes(raw)) return 'critical'
  if (['high', '상', '높음'].includes(raw)) return 'high'
  if (['middle', 'medium', 'med', '중', '보통'].includes(raw)) return 'middle'
  if (['low', '하', '낮음'].includes(raw)) return 'low'
  return raw
}

const normalizeStatus = (row: any): string =>
  String(row?.analysisStatus ?? row?.status ?? row?.actionStatus ?? row?.result ?? '')
    .trim()
    .toUpperCase()

const hasAnalysisContent = (row: any): boolean => {
  const summary = String(row?.summary ?? '').trim()
  const reason = String(row?.reason ?? '').trim()
  const solution = row?.solution
  if (summary) return true
  if (reason) return true
  if (Array.isArray(solution) && solution.filter(Boolean).length > 0) return true
  if (typeof solution === 'string' && solution.trim()) return true
  return false
}

const isAnalysisCompleted = (row: any): boolean => {
  const status = normalizeStatus(row)
  if (['DONE', 'SUCCESS', 'SUCCEEDED', 'COMPLETED', 'COMPLETE', 'ANALYZED', 'FINISHED'].includes(status)) {
    return true
  }
  return hasAnalysisContent(row)
}

const isAnalysisFailed = (row: any): boolean => {
  const status = normalizeStatus(row)
  if (['FAILED', 'FAIL', 'ERROR', 'ANALYSIS_FAILED', 'ANALYZE_FAILED'].includes(status)) {
    return true
  }
  const rawError =
    row?.errorLogBundle ?? row?.errorLog ?? row?.analysisError ?? row?.errorMessage ?? null
  if (!hasAnalysisContent(row) && rawError) return true
  return false
}

const isActionCompleted = (row: any): boolean =>
  String(row?.status ?? row?.actionStatus ?? row?.result ?? '')
    .trim()
    .toLowerCase() === 'completed'

export type EventSummary = {
  totalCount: number
  actionCompletedCount: number
  analysisCompletedCount: number
  analysisFailedCount: number
  severityCriticalCount: number
  severityHighCount: number
  severityMiddleCount: number
  severityLowCount: number
}

export const buildEventSummary = (
  rows: any[] = [],
  totalCountOverride?: number,
): EventSummary => {
  const safeRows = Array.isArray(rows) ? rows : []
  return {
    totalCount: typeof totalCountOverride === 'number' ? totalCountOverride : safeRows.length,
    actionCompletedCount: safeRows.filter(isActionCompleted).length,
    analysisCompletedCount: safeRows.filter(isAnalysisCompleted).length,
    analysisFailedCount: safeRows.filter(isAnalysisFailed).length,
    severityCriticalCount: safeRows.filter((r) => normalizeSeverity(r) === 'critical').length,
    severityHighCount: safeRows.filter((r) => normalizeSeverity(r) === 'high').length,
    severityMiddleCount: safeRows.filter((r) => normalizeSeverity(r) === 'middle').length,
    severityLowCount: safeRows.filter((r) => normalizeSeverity(r) === 'low').length,
  }
}
