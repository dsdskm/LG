const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const NAS_API = import.meta.env.VITE_NAS_BASE_URL || ''

const MOCK_NAS_STATS = {
  tms: { count: 234, accepted: 180, pending: 34, rejected: 20 },
  teleop: { count: 1200 },
  lbw: { videos: 89, motions: 512 },
  simulation: { count: 3400 },
  upload: { count: 800 }
}

async function request(path, options = {}) {
  const res = await fetch(`${NAS_API}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) throw new Error(`NAS API error: ${res.status}`)
  return res.json()
}

// Create a dataset record on NAS with metadata
export const createNasDataset = async (info) => {
  if (USE_MOCK) {
    const id = `nas-${Date.now()}`
    return { id, nasPath: `/datasets/${id}`, ...info, createdAt: new Date().toISOString() }
  }
  return request('/datasets', { method: 'POST', body: JSON.stringify(info) })
}

// Upload raw files directly to NAS (LbW videos, Upload datasets)
export const uploadToNas = async (nasDatasetId, files) => {
  if (USE_MOCK) return { success: true, nasDatasetId, uploadedCount: files.length }
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  const res = await fetch(`${NAS_API}/api/datasets/${nasDatasetId}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`NAS upload error: ${res.status}`)
  return res.json()
}

// Register accepted TMS episodes on NAS (TMS backend exports episode data to NAS path)
export const registerEpisodesOnNas = async (executionId, episodeIds) => {
  if (USE_MOCK) {
    const id = `nas-tms-${Date.now()}`
    return {
      id,
      nasPath: `/episodes/${executionId}`,
      episodeCount: episodeIds.length,
      createdAt: new Date().toISOString()
    }
  }
  return request('/datasets/from-episodes', {
    method: 'POST',
    body: JSON.stringify({ executionId, episodeIds })
  })
}

// Trigger NAS → Forge transfer so the dataset becomes available for training
export const sendNasToForge = async (nasDatasetId) => {
  if (USE_MOCK) return { success: true, nasDatasetId, forgeDatasetId: `forge-${nasDatasetId}` }
  return request(`/datasets/${nasDatasetId}/send-to-forge`, { method: 'POST' })
}

// Raw data statistics on NAS (used in DataReadiness dashboard and Launcher summary)
export const getNasDatasetStats = async () => {
  if (USE_MOCK) return MOCK_NAS_STATS
  return request('/datasets/stats')
}
