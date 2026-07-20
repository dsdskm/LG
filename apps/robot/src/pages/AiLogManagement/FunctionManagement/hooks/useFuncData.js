import { useEffect, useState } from 'react'
import { getFuncs, getAssignees } from '@/apis/ai/aiApis'

const normalizeArrayResponse = (response) => {
  if (!response) return []
  const payload = response?.data ?? response ?? null

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items

  return []
}

const useFuncData = () => {
  const [funcs, setFuncs] = useState([])
  const [accountOptions, setAccountOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [funcResponse, accountResponse] = await Promise.all([getFuncs(), getAssignees()])

        if (!isMounted) return

        setFuncs(normalizeArrayResponse(funcResponse))
        setAccountOptions(normalizeArrayResponse(accountResponse))
      } catch (error) {
        if (!isMounted) return
        setFuncs([])
        setAccountOptions([])
        setErrorMessage('기능 관리 데이터를 불러오지 못했습니다.')
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
    funcs,
    setFuncs,
    accountOptions,
    isLoading,
    errorMessage
  }
}

export default useFuncData
