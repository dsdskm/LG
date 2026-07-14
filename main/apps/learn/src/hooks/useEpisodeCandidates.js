import { useState, useEffect, useCallback } from 'react'
import { getEpisodeCandidates, updateEpisodeReviewStatus } from '../services/tmsApi'

export function useEpisodeCandidates(executionId) {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(false)
  const [reviewMap, setReviewMap] = useState({})

  useEffect(() => {
    if (!executionId) return
    setLoading(true)
    getEpisodeCandidates(executionId)
      .then(setCandidates)
      .finally(() => setLoading(false))
  }, [executionId])

  const updateReview = useCallback(async (episodeId, status) => {
    await updateEpisodeReviewStatus(episodeId, status)
    setReviewMap((prev) => ({ ...prev, [episodeId]: status }))
  }, [])

  const summary = {
    total: candidates.length,
    accepted: Object.values(reviewMap).filter((s) => s === 'accepted').length,
    pending: Object.values(reviewMap).filter((s) => s === 'pending').length,
    rejected: Object.values(reviewMap).filter((s) => s === 'rejected').length
  }

  return { candidates, loading, reviewMap, updateReview, summary }
}
