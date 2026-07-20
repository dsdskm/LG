import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { forwardRef, useRef, useState, useMemo } from 'react'
import { parseISO, isValid, addDays, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import 'react-time-picker/dist/TimePicker.css'
import 'react-clock/dist/Clock.css'
import styled from 'styled-components'
import { StyledCalendarContainer, StyledCalendarHeaderWrap, StyledCalendarInputWrap } from './styles'
import Icon from '../Icon'
import useClickOutSide from '@repo/hooks/useClickOutSide'
import { getRandomId } from '@repo/utils'

const range = (start, end) => {
  const arr = []
  for (let i = start; i < end; i += 1) {
    arr.push(i)
  }
  return [...arr].reverse()
}

const CustomInput = forwardRef(({ value, onClick, isActive = false, disabled }, ref) => {
  const id = getRandomId()
  return (
    <StyledCalendarInputWrap htmlFor={id} ref={ref} $isActive={isActive} $isDisabled={disabled}>
      <input className="typographyBody5" id={id} onClick={onClick} value={value} disabled={disabled} readOnly />
      <Icon name="calendar" size={20} />
    </StyledCalendarInputWrap>
  )
})

CustomInput.displayName = 'CustomInput'

const Calendar = ({
  type = 'date',
  startDate,
  endDate,
  onChangeStartDate,
  disabled,
  timestamp,
  allowedDateKeys, // [ADD] e.g., ['2026-03-01','2026-03-11',...]
  onVisibleRangeChange, // { start: Date, end: Date } => void
  ilterDate
}) => {
  const [isActiveCalendar, setIsActiveCalendar] = useState(false)
  const [showYearOption, setShowYearOption] = useState(false)
  const dropdownRef = useRef(null)
  const years = range(1990, new Date().getFullYear() + 1)
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]

  const startDateValue = useMemo(() => {
    if (startDate instanceof Date) return startDate
    if (typeof startDate === 'string') {
      const parsed = parseISO(startDate)
      return isValid(parsed) ? parsed : null
    }
    return null
  }, [startDate])

  const endDateValue = useMemo(() => {
    if (endDate instanceof Date) return endDate
    if (typeof endDate === 'string') {
      const parsed = parseISO(endDate)
      return isValid(parsed) ? parsed : null
    }
    return null
  }, [endDate])

  const dataFormat = type === 'month' ? 'yyyy.MM' : timestamp ? 'yyyy.MM.dd hh:mm:ss' : 'yyyy.MM.dd'
  // const minDate = timestamp ? undefined : isActiveCalendar ? addDays(new Date(), 7) : new Date(0)

  const handleCalendarClose = () => setIsActiveCalendar(false)
  const handleCalendarOpen = () => setIsActiveCalendar(true)

  const handleShowYearOption = () => {
    setShowYearOption(true)
  }

  const handleHideYearOption = (value, changeYearFn) => {
    if (value && changeYearFn) changeYearFn(value)
    setShowYearOption(false)
  }

  useClickOutSide(dropdownRef, handleHideYearOption)

  const toKey = (d) => format(d, 'yyyy-MM-dd')
  const allowedSet = useMemo(() => {
    // undefined/null → 필터 비활성 (전체 enable)
    if (allowedDateKeys == null) return null
    // 배열인 경우만 필터 활성
    return new Set(allowedDateKeys) // [] 이면 size===0 → 전체 disable
  }, [allowedDateKeys])
  const latestRef = useRef({
    type,
    timestamp,
    allowedSet,
    onVisibleRangeChange
  })
  latestRef.current.type = type
  latestRef.current.timestamp = timestamp
  latestRef.current.allowedSet = allowedSet
  latestRef.current.onVisibleRangeChange = onVisibleRangeChange
  const calcVisibleRange = (anchorDate) => {
    const startDate = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 0 })
    const endDate = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 0 })
    return { startDate, endDate }
  }
  const filterDateFn = (date) => {
    const { type, timestamp, allowedSet } = latestRef.current
    // 옵션 미전달(undefined/null) → 전체 enable
    if (allowedSet === null) return true
    // 필터 동작 (배열 전달됨)
    const shouldFilter = type === 'date' || !!timestamp
    if (!shouldFilter) return true
    if (allowedSet.size === 0) return false // [] → 전부 disable
    return allowedSet.has(toKey(date))
  }
  const handleMonthChange = (date) => {
    const { onVisibleRangeChange } = latestRef.current
    if (!onVisibleRangeChange) return
    onVisibleRangeChange(calcVisibleRange(date))
  }
  const handleYearChange = (date) => {
    const { onVisibleRangeChange } = latestRef.current
    if (!onVisibleRangeChange) return
    onVisibleRangeChange(calcVisibleRange(date))
  }
  return (
    <StyledCalendarContainer>
      <DatePicker
        selected={startDateValue}
        onChange={(date) => onChangeStartDate(date)}
        startDate={startDateValue}
        // minDate={minDate}
        endDate={endDateValue}
        customInput={<CustomInput isActive={isActiveCalendar} disabled={disabled} />}
        dateFormat={dataFormat}
        showMonthYearPicker={type === 'month'}
        selectsRange={type === 'range'}
        showWeekPicker={type === 'week'}
        onCalendarClose={handleCalendarClose}
        onCalendarOpen={handleCalendarOpen}
        enableTabLoop={false}
        disabled={disabled}
        filterDate={filterDateFn}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        renderCustomHeader={({
          date,
          changeYear,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled
        }) => (
          <StyledCalendarHeaderWrap $isOpen={showYearOption}>
            <div className="dropdownWrap" ref={dropdownRef}>
              <button
                type="button"
                className="dropdownArea"
                onClick={handleShowYearOption}
                onChange={({ target: { value } }) => changeYear(value)}
              >
                <div className="dropdownText typographyHeading4">
                  {type !== 'month' && `${months[date.getMonth()]} `}
                  {date.getFullYear()}
                  <Icon name="arrow_down" size={18} />
                </div>
              </button>
              <div className="dropdownOptionList typographyBody5">
                {years.map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      className={option === date.getFullYear() ? 'selected' : ''}
                      onClick={() => handleHideYearOption(option, changeYear)}
                      onKeyDown={({ key }) => {
                        if (key === 'Enter') handleHideYearOption(option, changeYear)
                      }}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </div>
            </div>

            <div className="calendarBtnGroup">
              <button
                type="button"
                className="calendarPrevBtn"
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
              >
                <Icon name="arrow_left" size={24} />
              </button>
              <button
                type="button"
                className="calendarNextBtn"
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
              >
                <Icon name="arrow_right" size={24} />
              </button>
            </div>
          </StyledCalendarHeaderWrap>
        )}
      >
        <StyledTimePicker>
          {timestamp && (
            <StyledTimePicker>
              <input type="text" placeholder="hh:mm:ss AM/PM" />
              <input type="text" placeholder="hh:mm:ss AM/PM" />
            </StyledTimePicker>
          )}
        </StyledTimePicker>
      </DatePicker>
    </StyledCalendarContainer>
  )
}

const StyledTimePicker = styled.div`
  width: 100%;
  position: absolute;
  bottom: 0;
  left: 0;
  padding: 5px;
  display: flex;
  justify-content: center;

  & input {
    padding: 5px;
    border-radius: 4px;
    margin-right: 10px;
  }
`

export default Calendar
