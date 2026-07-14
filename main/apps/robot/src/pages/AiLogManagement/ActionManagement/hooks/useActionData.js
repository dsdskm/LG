import { useEffect, useState } from 'react'
import { getActions } from '@/apis/ai/aiApis'

const normalizeArrayResponse = (response) => {
  if (!response) return []

  const payload = response?.data ?? response ?? null

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.actions)) return payload.actions
  if (Array.isArray(payload?.list)) return payload.list
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.result?.items)) return payload.result.items
  if (Array.isArray(payload?.result?.actions)) return payload.result.actions
  if (Array.isArray(payload?.result?.list)) return payload.result.list

  return []
}

const useActionData = () => {
  const [actions, setActions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await getActions()
        if (!isMounted) return
        setActions(normalizeArrayResponse(response))
      } catch (error) {
        if (!isMounted) return
        setActions([])
        setErrorMessage('액션 데이터를 불러오지 못했습니다.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    actions,
    setActions,
    isLoading,
    errorMessage
  }
}

export default useActionData
