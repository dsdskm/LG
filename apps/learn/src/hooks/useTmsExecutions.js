import { useState, useCallback } from 'react'
import { createExecution, getExecution } from '../services/tmsApi'

export function useTmsExecutions() {
  const [execution, setExecution] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const startExecution = useCallback(async (payload) => {
    setLoading(true)
    setError(null)
    try {
      const result = await createExecution(payload)
      setExecution(result)
      return result
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const pollExecution = useCallback(async (id) => {
    try {
      const result = await getExecution(id)
      setExecution(result)
      return result
    } catch (e) {
      setError(e.message)
    }
  }, [])

  return { execution, loading, error, startExecution, pollExecution }
}
