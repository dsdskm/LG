import { useState, useCallback, useEffect, useRef } from 'react'
import { getFuncs, getQueryLogs } from '@/apis/ai/aiApis'
import { useAiLogEventStore } from '@repo/stores'
import { ALL_VALUE } from '../constants'
import { buildEventSummary } from '../EventTablePanel/utils'

const PAGE_SIZE_STORAGE_KEY = 'aiLog.eventTable.pageSize'
const DEFAULT_PAGE_SIZE = 10
const ALLOWED_PAGE_SIZES = [10, 30, 50, 100]
const SUMMARY_FETCH_LIMIT = 100000
// 프로토타입: 실시간 대신 주기 폴링으로 목록 갱신. (추후 Firestore onSnapshot+debounce 로 교체 권장)
const POLL_INTERVAL_MS = 10000

const readStoredPageSize = () => {
  if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE

  try {
    const stored = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY))
    return ALLOWED_PAGE_SIZES.includes(stored) ? stored : DEFAULT_PAGE_SIZE
  } catch {
    return DEFAULT_PAGE_SIZE
  }
}

const writeStoredPageSize = (pageSize) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize))
  } catch {
    // ignore storage write failures (e.g. private mode)
  }
}

const DATE_PRESET = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH_1: '1month',
  MONTH_3: '3month',
  CUSTOM: 'custom'
}

const pad2 = (value) => String(value).padStart(2, '0')

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  return `${year}-${month}-${day}`
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const addMonths = (date, months) => {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

const getToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const getDateRangeByPreset = (preset) => {
  const today = getToday()

  if (preset === DATE_PRESET.TODAY) {
    return {
      startDate: formatDate(today),
      endDate: formatDate(today),
      datePreset: DATE_PRESET.TODAY
    }
  }

  if (preset === DATE_PRESET.MONTH_1) {
    return {
      startDate: formatDate(addMonths(today, -1)),
      endDate: formatDate(today),
      datePreset: DATE_PRESET.MONTH_1
    }
  }

  if (preset === DATE_PRESET.MONTH_3) {
    return {
      startDate: formatDate(addMonths(today, -3)),
      endDate: formatDate(today),
      datePreset: DATE_PRESET.MONTH_3
    }
  }

  return {
    startDate: formatDate(addDays(today, -6)),
    endDate: formatDate(today),
    datePreset: DATE_PRESET.WEEK
  }
}

const createInitialFilters = () => ({
  searchQuery: '',
  severity: ALL_VALUE,
  func: ALL_VALUE,
  status: ALL_VALUE,
  ...getDateRangeByPreset(DATE_PRESET.WEEK)
})

const createInitialPagination = () => ({
  page: 1,
  pageSize: readStoredPageSize(),
  totalCount: 0,
  resetPageToggle: false
})

const EMPTY_SUMMARY = buildEventSummary([], 0)

const getListItems = (response) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.items)) return response.data.items
  if (Array.isArray(response?.list)) return response.list
  return []
}

const getPageInfo = (response) => {
  if (response?.pageInfo) return response.pageInfo
  if (response?.data?.pageInfo) return response.data.pageInfo
  return {}
}

const toQueryRequestParams = (filters = {}, pagination = {}) => {
  const summary = typeof filters.searchQuery === 'string' ? filters.searchQuery.trim() : ''

  const severity = filters.severity && filters.severity !== ALL_VALUE ? filters.severity : ''

  const func = filters.func && filters.func !== ALL_VALUE ? filters.func : ''

  const status = filters.status && filters.status !== ALL_VALUE ? filters.status : ''

  const start = filters.startDate || ''
  const end = filters.endDate || ''

  const page = Number(pagination.page || 1)
  const pageSize = Number(pagination.pageSize || 10)
  const startIndex = (page - 1) * pageSize

  return {
    ...(summary ? { summary } : {}),
    ...(severity ? { severity } : {}),
    ...(func ? { func } : {}),
    ...(status ? { status } : {}),
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
    startIndex,
    count: pageSize
  }
}

const toFunctionOptions = (funcs = []) => {
  const values = Array.from(
    new Set(
      (Array.isArray(funcs) ? funcs : [])
        .map((item) => String(item?.func || '').trim())
        .filter(Boolean)
    )
  )
  return [
    { value: ALL_VALUE, name: 'Function 전체' },
    ...values.map((value) => ({
      value,
      name: value
    }))
  ]
}

const useAiLogData = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [filters, setFilters] = useState(createInitialFilters)
  const [pagination, setPagination] = useState(createInitialPagination)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [functionOptions, setFunctionOptions] = useState([{ value: ALL_VALUE, name: 'Function 전체' }])

  const loadFunctionOptions = useCallback(async () => {
    try {
      const response = await getFuncs()
      const funcs = Array.isArray(response?.data)
        ? response.data
        : []

      setFunctionOptions(toFunctionOptions(funcs))
    } catch (error) {
      setFunctionOptions([{ value: ALL_VALUE, name: 'Function 전체' }])
    }
  }, [])

  const loadData = useCallback(async (nextFilters, nextPagination, { silent = false } = {}) => {
    // silent=true(폴링): 로딩 스피너를 띄우지 않아 깜빡임 방지
    if (!silent) setIsLoading(true)

    try {
      const requestParams = toQueryRequestParams(nextFilters, nextPagination)
      const response = await getQueryLogs(requestParams)

      const items = getListItems(response)
      const pageInfo = getPageInfo(response)

      const nextTotalCount = Number(pageInfo?.totalCount ?? pageInfo?.total ?? pageInfo?.allCount) || 0

      setRows(items)

      setPagination((prev) => ({
        ...prev,
        totalCount: nextTotalCount
      }))
    } catch (error) {
      console.error('Error loading AI log data:', error)
      setRows([])
      setPagination((prev) => ({
        ...prev,
        totalCount: 0
      }))
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  const loadSummary = useCallback(async (nextFilters) => {
    try {
      const requestParams = toQueryRequestParams(nextFilters, { page: 1, pageSize: SUMMARY_FETCH_LIMIT })
      const response = await getQueryLogs(requestParams)

      const items = getListItems(response)
      const pageInfo = getPageInfo(response)
      const nextTotalCount = Number(pageInfo?.totalCount ?? pageInfo?.total ?? pageInfo?.allCount) || items.length

      setSummary(buildEventSummary(items, nextTotalCount))
    } catch (error) {
      console.error('Error loading AI log summary:', error)
      setSummary(EMPTY_SUMMARY)
    }
  }, [])

  const resetToFirstPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: 1,
      resetPageToggle: !prev.resetPageToggle
    }))
  }, [])

  const updateFilter = useCallback(
    (key, value) => {
      setFilters((prev) => {
        if (prev[key] === value) return prev
        return {
          ...prev,
          [key]: value
        }
      })

      resetToFirstPage()
    },
    [resetToFirstPage]
  )

  const updateDateRange = useCallback(
    (key, value) => {
      setFilters((prev) => {
        if (prev[key] === value && prev.datePreset === DATE_PRESET.CUSTOM) {
          return prev
        }

        const next = {
          ...prev,
          [key]: value,
          datePreset: DATE_PRESET.CUSTOM
        }

        if (next.startDate && next.endDate && next.startDate > next.endDate) {
          if (key === 'startDate') {
            next.endDate = value
          } else if (key === 'endDate') {
            next.startDate = value
          }
        }

        return next
      })

      resetToFirstPage()
    },
    [resetToFirstPage]
  )

  const applyDatePreset = useCallback(
    (preset) => {
      const nextRange = getDateRangeByPreset(preset)

      setFilters((prev) => {
        if (
          prev.startDate === nextRange.startDate &&
          prev.endDate === nextRange.endDate &&
          prev.datePreset === nextRange.datePreset
        ) {
          return prev
        }

        return {
          ...prev,
          ...nextRange
        }
      })

      resetToFirstPage()
    },
    [resetToFirstPage]
  )

  // 챗봇 데이터 조회(ailog/event/filter) 결과를 표 필터에 일괄 적용.
  const applyExternalFilters = useCallback(
    (incoming = {}) => {
      setFilters((prev) => {
        const next = { ...prev }
        if (incoming.severity !== undefined) next.severity = incoming.severity || ALL_VALUE
        if (incoming.func !== undefined) next.func = incoming.func || ALL_VALUE
        if (incoming.status !== undefined) next.status = incoming.status || ALL_VALUE
        if (incoming.searchQuery !== undefined) next.searchQuery = incoming.searchQuery || ''
        if (incoming.startDate) {
          next.startDate = incoming.startDate
          next.datePreset = DATE_PRESET.CUSTOM
        }
        if (incoming.endDate) {
          next.endDate = incoming.endDate
          next.datePreset = DATE_PRESET.CUSTOM
        }
        return next
      })
      resetToFirstPage()
    },
    [resetToFirstPage]
  )

  const resetFilters = useCallback(() => {
    setFilters(createInitialFilters())
    setPagination((prev) => ({
      ...prev,
      page: 1,
      totalCount: 0,
      resetPageToggle: !prev.resetPageToggle
    }))
  }, [])

  const updatePage = useCallback((page) => {
    setPagination((prev) => {
      if (prev.page === page) return prev
      return {
        ...prev,
        page
      }
    })
  }, [])

  const updatePageSize = useCallback((pageSize) => {
    writeStoredPageSize(pageSize)
    setPagination((prev) => {
      if (prev.pageSize === pageSize && prev.page === 1) return prev
      return {
        ...prev,
        page: 1,
        pageSize,
        resetPageToggle: !prev.resetPageToggle
      }
    })
  }, [])

  useEffect(() => {
    loadFunctionOptions()
  }, [loadFunctionOptions])

  // 챗봇이 요청한 필터를 소비해 표에 적용.
  const pendingFilters = useAiLogEventStore((state) => state.pendingFilters)
  const clearPendingFilters = useAiLogEventStore((state) => state.clearPendingFilters)
  useEffect(() => {
    if (!pendingFilters) return
    applyExternalFilters(pendingFilters)
    clearPendingFilters()
  }, [pendingFilters, applyExternalFilters, clearPendingFilters])

  useEffect(() => {
    loadData(filters, pagination)
  }, [filters, pagination.page, pagination.pageSize, loadData])

  useEffect(() => {
    loadSummary(filters)
  }, [filters, loadSummary])

  const reload = useCallback(() => {
    loadData(filters, pagination)
    loadSummary(filters)
  }, [filters, pagination, loadData, loadSummary])

  // 주기 폴링: 로딩 스피너 없이(silent) 조용히 갱신해 깜빡임을 막는다.
  // 최신 함수를 ref 로 잡아 interval 을 재생성하지 않고, 탭이 백그라운드면 건너뛴다.
  const pollRef = useRef(null)
  useEffect(() => {
    pollRef.current = () => {
      loadData(filters, pagination, { silent: true })
      loadSummary(filters)
    }
  }, [filters, pagination, loadData, loadSummary])
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      pollRef.current?.()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return {
    isLoading,
    rows,
    filters,
    pagination,
    summary,
    functionOptions,
    updateFilter,
    updateDateRange,
    applyDatePreset,
    resetFilters,
    updatePage,
    updatePageSize,
    reload,
    DATE_PRESET
  }
}

export default useAiLogData
