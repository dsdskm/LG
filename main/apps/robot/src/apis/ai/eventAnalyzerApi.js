import { axiosEventAnalyzer, pathEventAnalyzer, pathQueryLogs, applyCommonFilters } from './shared'

/**
 * 통합 로그 조회
 *
 * query.controller.ts
 * GET /query/logs
 *
 * @param {Object} [params]
 * @param {string} [params.start]
 * @param {string} [params.end]
 * @param {string} [params.status]
 * @param {string} [params.severity]
 * @param {string} [params.func]
 * @param {string} [params.summary]
 * @param {number} [params.startIndex]
 * @param {number} [params.count]
 */
export const getQueryLogs = async (params = {}) => {
  const searchParams = new URLSearchParams()

  const startIndex = typeof params.startIndex === 'number' ? params.startIndex : 0
  const count = typeof params.count === 'number' ? params.count : 50

  searchParams.set('startIndex', String(startIndex))
  searchParams.set('count', String(count))
  applyCommonFilters(searchParams, params)

  const query = searchParams.toString()
  const url = `${pathQueryLogs}${query ? `?${query}` : ''}`

  try {
    const response = await axiosEventAnalyzer.get(url)
    return response
  } catch (e) {
    return {
      data: [],
      pageInfo: {
        totalCount: 0,
        count,
        index: startIndex,
        hasNext: false
      }
    }
  }
}

/**
 * 분석 단건 조회
 * GET /analysis/:eventId
 */
export const getAnalysisByEventId = async (eventId) => {
  if (!eventId) return null

  const url = `${pathEventAnalyzer}/${encodeURIComponent(String(eventId))}`

  try {
    const response = await axiosEventAnalyzer.get(url)
    return response
  } catch (e) {
    return null
  }
}

/**
 * 분석 결과 수동 수정
 * PATCH /analysis/:eventId
 *
 * @param {number|string} eventId
 * @param {Object} payload { summary?, reason?, solutions?, func?, severity?, confidence? }
 */
export const updateAnalysisByEventId = async (eventId, payload = {}) => {
  if (!eventId) return null

  const url = `${pathEventAnalyzer}/${encodeURIComponent(String(eventId))}`
  const response = await axiosEventAnalyzer.patch(url, payload)
  return response
}
