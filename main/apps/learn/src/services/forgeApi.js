const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const FORGE_API = import.meta.env.VITE_FORGE_BASE_URL || 'http://localhost:3000'

const MOCK_TRAINING_JOBS = [
  {
    id: 'job-001',
    name: '자제 팔레타이징 Fine-tuning',
    status: 'running',
    foundationModel: 'OpenVLA-OFT',
    dataset: 'ds-자제팔레타이징-v2',
    startedAt: '2026-06-08T08:00:00Z',
    progress: 72
  },
  {
    id: 'job-002',
    name: 'Pick&Place Pre-training',
    status: 'completed',
    foundationModel: 'π0',
    dataset: 'ds-pick-place-v1',
    startedAt: '2026-06-07T14:00:00Z',
    completedAt: '2026-06-08T02:00:00Z',
    progress: 100
  },
  {
    id: 'job-003',
    name: '재고 검수 분류 학습',
    status: 'queued',
    foundationModel: 'RDT-1B',
    dataset: 'ds-towel-v1',
    startedAt: null,
    progress: 0
  }
]

const MOCK_DATASETS = [
  { id: 'ds-자제팔레타이징-v2', name: '자제팔레타이징 v2', episodeCount: 180, source: 'tms', createdAt: '2026-06-01' },
  { id: 'ds-pick-place-v1', name: 'Pick&Place v1', episodeCount: 1800, source: 'teleop', createdAt: '2026-05-20' },
  { id: 'ds-towel-v1', name: '재고 검수 분류 v1', episodeCount: 45, source: 'lbw', createdAt: '2026-06-05' }
]

const MOCK_MODELS = [
  {
    id: 'model-001',
    name: '자제팔레타이징 Fine-tuned v1',
    baseModel: 'OpenVLA-OFT',
    validationScore: 0.87,
    status: 'review-pending',
    createdAt: '2026-06-08T02:00:00Z'
  },
  {
    id: 'model-002',
    name: 'Pick&Place Pre-trained v1',
    baseModel: 'π0',
    validationScore: 0.91,
    status: 'approved',
    createdAt: '2026-06-07T10:00:00Z'
  }
]

async function request(path, options = {}) {
  const res = await fetch(`${FORGE_API}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) throw new Error(`Forge API error: ${res.status}`)
  return res.json()
}

export const openForge = (path) => {
  window.open(`${FORGE_API}${path}`, '_blank')
}

export const getForgeUrl = (path) => `${FORGE_API}${path}`

export const getTrainingJobs = async () => {
  if (USE_MOCK) return MOCK_TRAINING_JOBS
  return request('/training-jobs')
}

export const getTrainingJob = async (id) => {
  if (USE_MOCK) return MOCK_TRAINING_JOBS.find((j) => j.id === id) || null
  return request(`/training-jobs/${id}`)
}

export const getDatasets = async () => {
  if (USE_MOCK) return MOCK_DATASETS
  return request('/datasets')
}

export const createDataset = async (data) => {
  if (USE_MOCK) return { id: `ds-${Date.now()}`, ...data }
  return request('/datasets', { method: 'POST', body: JSON.stringify(data) })
}

export const uploadToDataset = async (id, files) => {
  if (USE_MOCK) return { success: true, datasetId: id, uploadedCount: files.length }
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  const res = await fetch(`${FORGE_API}/api/datasets/${id}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Forge upload error: ${res.status}`)
  return res.json()
}

export const getDatasetStats = async () => {
  if (USE_MOCK) {
    return {
      tms: { count: 234, accepted: 180, pending: 34, rejected: 20 },
      teleop: { count: 1200 },
      lbw: { videos: 89, motions: 512 },
      simulation: { count: 3400 },
      upload: { count: 800 }
    }
  }
  return request('/datasets/stats')
}

export const getModels = async () => {
  if (USE_MOCK) return MOCK_MODELS
  return request('/models')
}

export const updateModelStatus = async (id, status) => {
  if (USE_MOCK) return { id, status }
  return request(`/models/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
}
