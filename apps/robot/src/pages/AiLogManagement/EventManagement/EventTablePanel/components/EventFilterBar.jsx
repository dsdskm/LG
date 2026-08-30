import { useCallback } from 'react'
import styled from 'styled-components'
import { Dropdown, Search, SearchContainer, HeaderTitleGroup } from '@repo/ui'
import { ALL_VALUE, SEVERITY_OPTIONS, STATUS_OPTIONS } from '../../constants'

const DateFilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`

const DateInputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const DateInput = styled.input`
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  font-size: 14px;
`

const PresetButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const PresetButton = styled.button`
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#d0d7de')};
  background-color: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#2563eb' : '#111827')};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    border-color: #94a3b8;
  }
`

const EventFilterBar = ({
  filters,
  functionOptions,
  datePresetMap,
  onChangeFilter,
  onChangeDateRange,
  onApplyDatePreset,
  isDetailOpen
}) => {
  const searchQuery = filters.searchQuery || ''
  const severityFilter = filters.severity || ALL_VALUE
  const funcFilter = filters.func || ALL_VALUE
  const statusFilter = filters.status || ALL_VALUE
  const startDate = filters.startDate || ''
  const endDate = filters.endDate || ''
  const activeDatePreset = filters.datePreset || datePresetMap.CUSTOM

  const handleSearchChange = useCallback(
    (e) => {
      onChangeFilter('searchQuery', e.target.value)
    },
    [onChangeFilter]
  )

  const handleResetSearch = useCallback(() => {
    onChangeFilter('searchQuery', '')
  }, [onChangeFilter])

  const handleStartDateChange = useCallback(
    (e) => {
      onChangeDateRange('startDate', e.target.value)
    },
    [onChangeDateRange]
  )

  const handleEndDateChange = useCallback(
    (e) => {
      onChangeDateRange('endDate', e.target.value)
    },
    [onChangeDateRange]
  )

  return (
    <>
      <DateFilterRow>
        <DateInputGroup>
          <DateInput type="date" value={startDate} onChange={handleStartDateChange} />
          <span>~</span>
          <DateInput type="date" value={endDate} onChange={handleEndDateChange} />
        </DateInputGroup>

        <PresetButtonGroup>
          <PresetButton
            type="button"
            $active={activeDatePreset === datePresetMap.TODAY}
            onClick={() => onApplyDatePreset(datePresetMap.TODAY)}
          >
            오늘
          </PresetButton>

          <PresetButton
            type="button"
            $active={activeDatePreset === datePresetMap.WEEK}
            onClick={() => onApplyDatePreset(datePresetMap.WEEK)}
          >
            일주일
          </PresetButton>

          <PresetButton
            type="button"
            $active={activeDatePreset === datePresetMap.MONTH_1}
            onClick={() => onApplyDatePreset(datePresetMap.MONTH_1)}
          >
            1개월
          </PresetButton>

          <PresetButton
            type="button"
            $active={activeDatePreset === datePresetMap.MONTH_3}
            onClick={() => onApplyDatePreset(datePresetMap.MONTH_3)}
          >
            3개월
          </PresetButton>
        </PresetButtonGroup>
      </DateFilterRow>

      <HeaderTitleGroup>
        <SearchContainer>
          <Search
            style={{
              width: isDetailOpen ? 320 : 400,
              transition: 'width 0.25s ease'
            }}
            value={searchQuery}
            onChange={handleSearchChange}
            onReset={handleResetSearch}
          />
        </SearchContainer>

        <Dropdown
          size="lg"
          minWidth="140px"
          value={severityFilter}
          options={SEVERITY_OPTIONS}
          onChange={(value) => onChangeFilter('severity', value)}
        />

        <Dropdown
          size="lg"
          minWidth="140px"
          value={funcFilter}
          options={functionOptions}
          onChange={(value) => onChangeFilter('func', value)}
        />

        <Dropdown
          size="lg"
          minWidth="140px"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(value) => onChangeFilter('status', value)}
        />
      </HeaderTitleGroup>
    </>
  )
}

export default EventFilterBar
