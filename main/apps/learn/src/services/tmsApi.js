import { client, API_CONFIG } from '@repo/apis'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const TMS = API_CONFIG.PREFIX_TMS // '/api/v1/web'

const axiosClient = client(import.meta.env.VITE_API_BASE_URL)

const MOCK_TASKFLOWS = [
  {
    id: 'tf-001',
    name: '자재 팔레타이징',
    description: '입고 자재를 규격별로 팔레트에 적재',
    stepCount: 5,
    lastRun: '2026-06-01'
  },
  {
    id: 'tf-002',
    name: 'Pick & Place',
    description: '물건 집어 올려 다른 위치에 배치',
    stepCount: 3,
    lastRun: '2026-06-03'
  },
  {
    id: 'tf-003',
    name: '재고 검수 분류',
    description: '입고 물품의 상태를 검수하고 카테고리별 분류',
    stepCount: 6,
    lastRun: '2026-05-28'
  },
  { id: 'tf-004', name: '제조 PoC', description: '제조 라인 부품 조립 검증', stepCount: 8, lastRun: '2026-06-05' }
]

const MOCK_EXECUTION = {
  id: 'exec-2026-001',
  taskflowId: 'tf-001',
  taskflowName: '자재 팔레타이징',
  status: 'running',
  startedAt: '2026-06-08T10:00:00Z',
  progress: 60,
  completedSteps: 3,
  totalSteps: 5
}

// mock 전용: 실행 ID별 진행 상태를 추적해 폴링 시 자동 완료 시뮬레이션
const _mockExecutionStates = {}
const MOCK_PROGRESS_STEP = 20

const MOCK_EPISODES = Array.from({ length: 20 }, (_, i) => ({
  id: `EP-${String(i + 1).padStart(3, '0')}`,
  status: i % 5 === 1 ? 'failed' : i % 5 === 2 ? 'retry' : 'success',
  step: `Step ${(i % 5) + 1}`,
  duration: `${(i % 3) * 10 + 10}s`,
  hasIntervention: i % 4 === 0,
  thumbnail: null
}))

export const getTaskflows = async (groupId, siteId) => {
  if (USE_MOCK) return MOCK_TASKFLOWS
  const params = new URLSearchParams({
    groupId: String(groupId),
    siteId: String(siteId),
    include: 'lastDeployment'
  })
  const res = await axiosClient.get(`${TMS}/taskflows?${params}`)
  return Array.isArray(res?.content) ? res.content : []
}

export const getTaskflow = async (id) => {
  if (USE_MOCK) return MOCK_TASKFLOWS.find((t) => t.id === id) || null
  return axiosClient.get(`${TMS}/taskflows/${id}`)
}

// =============================================================================
// TBD: 아래 execution / episode 엔드포인트는 API 미구현 상태
//      실제 API 확정 후 axiosClient 호출로 일괄 교체 필요
//      예상 기본 경로: POST   ${TMS}/executions
//                     GET    ${TMS}/executions/:id
//                     GET    ${TMS}/executions/:id/events
//                     GET    ${TMS}/executions/:id/episodes
//                     GET    ${TMS}/episodes/:id
//                     PUT    ${TMS}/episodes/:id/review-status
//                     GET    ${TMS}/executions/stats
// =============================================================================

export const createExecution = async (payload) => {
  if (USE_MOCK) { //TBD: replace with → axiosClient.post(`${TMS}/executions`, payload)
    const exec = { ...MOCK_EXECUTION, id: `exec-${Date.now()}`, ...payload }
    _mockExecutionStates[exec.id] = { ...exec }
    return exec
  }
  return axiosClient.post(`${TMS}/executions`, payload) //TBD
}

export const getExecution = async (id) => {
  if (USE_MOCK) { //TBD: replace with → axiosClient.get(`${TMS}/executions/${id}`)
    const state = _mockExecutionStates[id] ?? { ...MOCK_EXECUTION, id }
    if (state.status === 'running') {
      state.progress = Math.min(state.progress + MOCK_PROGRESS_STEP, 100)
      if (state.progress >= 100) {
        state.status = 'completed'
        state.completedSteps = state.totalSteps
      }
    }
    _mockExecutionStates[id] = state
    return { ...state }
  }
  return axiosClient.get(`${TMS}/executions/${id}`) //TBD
}

export const getExecutionEvents = async (id) => {
  if (USE_MOCK) return [] //TBD: replace with → axiosClient.get(`${TMS}/executions/${id}/events`)
  return axiosClient.get(`${TMS}/executions/${id}/events`) //TBD
}

export const getEpisodeCandidates = async (executionId) => {
  if (USE_MOCK) return MOCK_EPISODES //TBD: replace with → axiosClient.get(`${TMS}/executions/${executionId}/episodes`)
  return axiosClient.get(`${TMS}/executions/${executionId}/episodes`) //TBD
}

export const getEpisode = async (id) => {
  if (USE_MOCK) return MOCK_EPISODES.find((e) => e.id === id) || null //TBD: replace with → axiosClient.get(`${TMS}/episodes/${id}`)
  return axiosClient.get(`${TMS}/episodes/${id}`) //TBD
}

export const updateEpisodeReviewStatus = async (id, status) => {
  if (USE_MOCK) return { id, reviewStatus: status } //TBD: replace with → axiosClient.put(`${TMS}/episodes/${id}/review-status`, { status })
  return axiosClient.put(`${TMS}/episodes/${id}/review-status`, { status }) //TBD
}

export const getLearningExecutionStats = async () => {
  if (USE_MOCK) return { total: 234, accepted: 180, pending: 34, rejected: 20 } //TBD: replace with → axiosClient.get(`${TMS}/executions/stats`)
  return axiosClient.get(`${TMS}/executions/stats`) //TBD
}
