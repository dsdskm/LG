import { useCallback, useEffect, useMemo, useState } from 'react'
import { getQueryLogs } from '@/apis/ai/aiApis'
import {
  FilterRow,
  DateInputGroup,
  DateInput,
  PresetButtonGroup,
  PresetButton,
  ContentGrid,
  SectionCard,
  SectionHeader,
  SectionTitle,
  SectionBody,
  RankingList,
  RankingRowWrap,
  RankingLabel,
  RankingBarTrack,
  RankingBarFill,
  RankingValue,
  EmptyState,
  LoadingBox,
  ErrorBox,
  SectionMaxWidth
} from './styles'

import { StyledPageContent, SectionRobot } from '@repo/ui'

const DATE_PRESET = {
  CUSTOM: 'CUSTOM',
  TODAY: 'TODAY',
  WEEK: 'WEEK',
  MONTH_1: 'MONTH_1',
  MONTH_3: 'MONTH_3',
  MONTH_6: 'MONTH_6',
  YEAR_1: 'YEAR_1'
}

const unwrapResponse = (response) => {
  if (!response) return null
  return response?.data ?? response ?? null
}

const normalizeItems = (response) => {
  const payload = unwrapResponse(response)

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.logs)) return payload.logs

  return []
}

const normalizePageInfo = (response, fallbackCount = 0, fallbackIndex = 0) => {
  const payload = unwrapResponse(response)

  const pageInfo = payload?.pageInfo ?? payload?.pagination ?? null
  if (pageInfo) {
    return {
      totalCount: Number(pageInfo.totalCount ?? 0),
      count: Number(pageInfo.count ?? fallbackCount),
      index: Number(pageInfo.index ?? fallbackIndex),
      hasNext: Boolean(pageInfo.hasNext)
    }
  }

  const items = normalizeItems(response)
  return {
    totalCount: items.length,
    count: items.length,
    index: fallbackIndex,
    hasNext: false
  }
}

const formatDateInput = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const getDateRangeByPreset = (preset) => {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now)

  if (preset === DATE_PRESET.TODAY) {
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end)
    }
  }

  if (preset === DATE_PRESET.WEEK) {
    start.setDate(start.getDate() - 7)
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end)
    }
  }

  if (preset === DATE_PRESET.MONTH_1) {
    start.setMonth(start.getMonth() - 1)
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end)
    }
  }

  if (preset === DATE_PRESET.MONTH_3) {
    start.setMonth(start.getMonth() - 3)
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end)
    }
  }

  if (preset === DATE_PRESET.MONTH_6) {
    start.setMonth(start.getMonth() - 6)
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end)
    }
  }

  if (preset === DATE_PRESET.YEAR_1) {
    start.setFullYear(start.getFullYear() - 1)
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end)
    }
  }

  return {
    startDate: '',
    endDate: ''
  }
}

const getDefaultDateRange = () => {
  return getDateRangeByPreset(DATE_PRESET.MONTH_1)
}

const getRobotKey = (row) => {
  return String(row?.robotId ?? row?.robot?.id ?? row?.robot ?? '-').trim() || '-'
}

const getFunctionKey = (row) => {
  return String(row?.func ?? row?.function ?? row?.feature ?? '-').trim() || '-'
}

const buildRanking = (items, keyGetter, limit = 10) => {
  const countMap = new Map()

  items.forEach((item) => {
    const key = keyGetter(item)
    if (!key || key === '-') return
    countMap.set(key, (countMap.get(key) ?? 0) + 1)
  })

  return Array.from(countMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value
      return a.label.localeCompare(b.label)
    })
    .slice(0, limit)
}

const buildRecommendedActionRanking = (items, limit = 10) => {
  const countMap = new Map()

  items.forEach((row) => {
    const recommendedActions = Array.isArray(row?.actions) ? row.actions : []

    recommendedActions.forEach((actionItem, index) => {
      const label = String(actionItem?.name ?? actionItem?.key ?? `Action ${index + 1}`).trim()
      if (!label) return
      countMap.set(label, (countMap.get(label) ?? 0) + 1)
    })
  })

  return Array.from(countMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value
      return a.label.localeCompare(b.label)
    })
    .slice(0, limit)
}

const KST_BUCKETS = ['00-02', '03-05', '06-08', '09-11', '12-14', '15-17', '18-20', '21-23']

const getHourInKst = (value) => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const hourText = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  }).format(date)

  const hour = Number(hourText)
  if (Number.isNaN(hour)) return null

  return hour
}

const buildHourlyRanking = (items) => {
  const counts = {
    '00-02': 0,
    '03-05': 0,
    '06-08': 0,
    '09-11': 0,
    '12-14': 0,
    '15-17': 0,
    '18-20': 0,
    '21-23': 0
  }

  items.forEach((item) => {
    const value = item?.occurredAt ?? item?.createdAt ?? item?.timestamp ?? item?.eventTime

    const hour = getHourInKst(value)
    if (hour === null) return

    if (hour >= 0 && hour <= 2) counts['00-02'] += 1
    else if (hour >= 3 && hour <= 5) counts['03-05'] += 1
    else if (hour >= 6 && hour <= 8) counts['06-08'] += 1
    else if (hour >= 9 && hour <= 11) counts['09-11'] += 1
    else if (hour >= 12 && hour <= 14) counts['12-14'] += 1
    else if (hour >= 15 && hour <= 17) counts['15-17'] += 1
    else if (hour >= 18 && hour <= 20) counts['18-20'] += 1
    else if (hour >= 21 && hour <= 23) counts['21-23'] += 1
  })

  return KST_BUCKETS.map((label) => ({
    label,
    value: counts[label]
  }))
}

const fetchAllLogs = async (params = {}) => {
  const merged = []
  const pageSize = 500
  const maxLoop = 50

  for (let loopIndex = 0; loopIndex < maxLoop; loopIndex += 1) {
    const startIndex = loopIndex * pageSize

    const response = await getQueryLogs({
      ...params,
      startIndex,
      count: pageSize
    })

    const items = normalizeItems(response)
    const pageInfo = normalizePageInfo(response, pageSize, startIndex)

    if (items.length === 0) break

    merged.push(...items)

    if (!pageInfo.hasNext) break
    if (items.length < pageSize) break
  }

  return merged
}

function RankingRow({ label, value, maxValue }) {
  const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0

  return (
    <RankingRowWrap>
      <RankingLabel>{label}</RankingLabel>
      <RankingBarTrack>
        <RankingBarFill $widthPercent={widthPercent} />
      </RankingBarTrack>
      <RankingValue>{value}</RankingValue>
    </RankingRowWrap>
  )
}

const Statistics = () => {
  const defaultRange = getDefaultDateRange()

  const [filters, setFilters] = useState({
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    datePreset: DATE_PRESET.MONTH_1
  })

  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleChangeDateRange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      datePreset: DATE_PRESET.CUSTOM
    }))
  }, [])

  const handleApplyDatePreset = useCallback((preset) => {
    const range = getDateRangeByPreset(preset)

    setFilters((prev) => ({
      ...prev,
      startDate: range.startDate,
      endDate: range.endDate,
      datePreset: preset
    }))
  }, [])

  const loadStatistics = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const items = await fetchAllLogs({
        start: filters.startDate,
        end: filters.endDate
      })

      setRows(items)
    } catch (error) {
      setRows([])
      setErrorMessage('통계 데이터를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [filters.endDate, filters.startDate])

  useEffect(() => {
    loadStatistics()
  }, [loadStatistics])

  const robotRanking = useMemo(() => buildRanking(rows, getRobotKey, 10), [rows])
  const functionRanking = useMemo(() => buildRanking(rows, getFunctionKey, 10), [rows])
  const hourlyRanking = useMemo(() => buildHourlyRanking(rows), [rows])
  const actionRanking = useMemo(() => buildRecommendedActionRanking(rows, 10), [rows])

  const robotMax = robotRanking[0]?.value ?? 1
  const functionMax = functionRanking[0]?.value ?? 1
  const hourlyMax = Math.max(...hourlyRanking.map((item) => item.value), 1)
  const actionMax = actionRanking[0]?.value ?? 1

  return (
    <StyledPageContent className="column">
      <SectionRobot>
        <SectionMaxWidth>
          <FilterRow>
            <DateInputGroup>
              <DateInput
                type="date"
                value={filters.startDate}
                onChange={(e) => handleChangeDateRange('startDate', e.target.value)}
              />
              <span>~</span>
              <DateInput
                type="date"
                value={filters.endDate}
                onChange={(e) => handleChangeDateRange('endDate', e.target.value)}
              />
            </DateInputGroup>

            <PresetButtonGroup>
              <PresetButton
                type="button"
                $active={filters.datePreset === DATE_PRESET.TODAY}
                onClick={() => handleApplyDatePreset(DATE_PRESET.TODAY)}
              >
                오늘
              </PresetButton>

              <PresetButton
                type="button"
                $active={filters.datePreset === DATE_PRESET.WEEK}
                onClick={() => handleApplyDatePreset(DATE_PRESET.WEEK)}
              >
                일주일
              </PresetButton>

              <PresetButton
                type="button"
                $active={filters.datePreset === DATE_PRESET.MONTH_1}
                onClick={() => handleApplyDatePreset(DATE_PRESET.MONTH_1)}
              >
                1개월
              </PresetButton>

              <PresetButton
                type="button"
                $active={filters.datePreset === DATE_PRESET.MONTH_3}
                onClick={() => handleApplyDatePreset(DATE_PRESET.MONTH_3)}
              >
                3개월
              </PresetButton>

              <PresetButton
                type="button"
                $active={filters.datePreset === DATE_PRESET.MONTH_6}
                onClick={() => handleApplyDatePreset(DATE_PRESET.MONTH_6)}
              >
                6개월
              </PresetButton>

              <PresetButton
                type="button"
                $active={filters.datePreset === DATE_PRESET.YEAR_1}
                onClick={() => handleApplyDatePreset(DATE_PRESET.YEAR_1)}
              >
                1년
              </PresetButton>
            </PresetButtonGroup>
          </FilterRow>

          {isLoading ? <LoadingBox>통계 데이터를 불러오는 중...</LoadingBox> : null}
          {!isLoading && errorMessage ? <ErrorBox>{errorMessage}</ErrorBox> : null}

          {!isLoading && !errorMessage ? (
            <ContentGrid>
              <SectionCard>
                <SectionHeader>
                  <SectionTitle>로봇별 이슈 순위 TOP 10</SectionTitle>
                </SectionHeader>
                <SectionBody>
                  {robotRanking.length > 0 ? (
                    <RankingList>
                      {robotRanking.map((item) => (
                        <RankingRow
                          key={`robot-${item.label}`}
                          label={item.label}
                          value={item.value}
                          maxValue={robotMax}
                        />
                      ))}
                    </RankingList>
                  ) : (
                    <EmptyState>표시할 데이터가 없습니다.</EmptyState>
                  )}
                </SectionBody>
              </SectionCard>

              <SectionCard>
                <SectionHeader>
                  <SectionTitle>기능별 이슈 순위 TOP 10</SectionTitle>
                </SectionHeader>
                <SectionBody>
                  {functionRanking.length > 0 ? (
                    <RankingList>
                      {functionRanking.map((item) => (
                        <RankingRow
                          key={`func-${item.label}`}
                          label={item.label}
                          value={item.value}
                          maxValue={functionMax}
                        />
                      ))}
                    </RankingList>
                  ) : (
                    <EmptyState>표시할 데이터가 없습니다.</EmptyState>
                  )}
                </SectionBody>
              </SectionCard>

              <SectionCard>
                <SectionHeader>
                  <SectionTitle>추천 액션 순위</SectionTitle>
                </SectionHeader>
                <SectionBody>
                  {actionRanking.length > 0 ? (
                    <RankingList>
                      {actionRanking.map((item) => (
                        <RankingRow
                          key={`action-${item.label}`}
                          label={item.label}
                          value={item.value}
                          maxValue={actionMax}
                        />
                      ))}
                    </RankingList>
                  ) : (
                    <EmptyState>표시할 데이터가 없습니다.</EmptyState>
                  )}
                </SectionBody>
              </SectionCard>

              <SectionCard>
                <SectionHeader>
                  <SectionTitle>시간대별 이슈 개수 (KST, 3시간 단위)</SectionTitle>
                </SectionHeader>
                <SectionBody>
                  {hourlyRanking.length > 0 ? (
                    <RankingList>
                      {hourlyRanking.map((item) => (
                        <RankingRow
                          key={`hour-${item.label}`}
                          label={item.label}
                          value={item.value}
                          maxValue={hourlyMax}
                        />
                      ))}
                    </RankingList>
                  ) : (
                    <EmptyState>표시할 데이터가 없습니다.</EmptyState>
                  )}
                </SectionBody>
              </SectionCard>
            </ContentGrid>
          ) : null}
        </SectionMaxWidth>
      </SectionRobot>
    </StyledPageContent>
  )
}

export default Statistics
