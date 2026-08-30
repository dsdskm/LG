import { useState, useEffect, useCallback } from 'react'
import { getTrainingJobs, getDatasets } from '../services/forgeApi'

export function useTrainingJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchJobs = useCallback(() => {
    setLoading(true)
    getTrainingJobs()
      .then(setJobs)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  return { jobs, loading, refetch: fetchJobs }
}

export function useDatasets() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getDatasets()
      .then(setDatasets)
      .finally(() => setLoading(false))
  }, [])

  return { datasets, loading }
}
