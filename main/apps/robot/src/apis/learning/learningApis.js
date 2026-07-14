import { MOCK_LEARNING_STATS, MOCK_COLLECTION_STATS } from './mockData'

/**
 * 학습 현황 통계 조회
 *
 * TODO: 실제 API 엔드포인트 확정 후 아래 주석 해제 및 mock 제거
 *
 * import { client } from '@repo/apis'
 * const api = client(import.meta.env.VITE_ROBOT_API_BASE_URL)
 *
 * export const getLearningStats = () =>
 *   api.get('/api/v1/robot/learning/stats')
 */
export const getLearningStats = () => Promise.resolve(MOCK_LEARNING_STATS)

/**
 * 데이터 수집(에피소드 생산) 현황 조회
 *
 * TODO: 실제 API 엔드포인트 확정 후 아래 주석 해제 및 mock 제거
 *
 * export const getCollectionStats = () =>
 *   api.get('/api/v1/robot/collection/stats')
 */
export const getCollectionStats = () => Promise.resolve(MOCK_COLLECTION_STATS)
