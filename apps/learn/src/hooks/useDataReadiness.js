import { useState, useEffect } from 'react'
import { getNasDatasetStats } from '../services/nasApi'
import { getLearningExecutionStats } from '../services/tmsApi'

export function useDataReadiness() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getNasDatasetStats(), getLearningExecutionStats()])
      .then(([nasStats, tmsStats]) => {
        setStats({ nas: nasStats, tms: tmsStats })
      })
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}
