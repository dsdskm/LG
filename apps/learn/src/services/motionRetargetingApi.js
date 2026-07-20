const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const MOTION_RETARGETING_API = import.meta.env.VITE_MOTION_RETARGETING_BASE_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`${MOTION_RETARGETING_API}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    throw new Error(`Motion Retargeting API error: ${res.status}`)
  }
  return res.json()
}

// NAS에 저장된 영상 dataset을 LG 자체 Motion Retargeting 파이프라인으로 전달
export const sendNasToMotionRetargeting = async (nasDatasetId, payload = {}) => {
  if (USE_MOCK) {
    return {
      success: true,
      nasDatasetId,
      jobId: `mr-${Date.now()}`,
      status: 'queued',
      pipeline: 'cloid-retargeting',
      requestedAt: new Date().toISOString(),
      ...payload
    }
  }
  return request('/motion-retargeting/jobs', {
    method: 'POST',
    body: JSON.stringify({ nasDatasetId, ...payload })
  })
}

// 처리 상태 조회용 stub
export const getMotionRetargetingJob = async (jobId) => {
  if (USE_MOCK) {
    return {
      jobId,
      status: 'processing',
      stage: '3d-motion-extraction',
      progress: 35,
      updatedAt: new Date().toISOString()
    }
  }
  return request(`/motion-retargeting/jobs/${jobId}`)
}
