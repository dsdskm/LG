import { parseISO, isValid, addDays, format } from 'date-fns'
import { useEffect, useState } from 'react'

export const useCalendar = (initialDate) => {
  let startDateInit = addDays(new Date(), 7)

  if (initialDate) {
    const parsedDate = parseISO(initialDate)
    if (isValid(parsedDate)) {
      startDateInit = parsedDate
    }
  }

  const [startDate, setStartDate] = useState(startDateInit)
  const [endDate, setEndDate] = useState(null)

  useEffect(() => {
    if (initialDate) {
      const parsedDate = parseISO(initialDate)
      if (isValid(parsedDate)) {
        setStartDate(parsedDate)
      } else {
        setStartDate(addDays(new Date(), 7))
      }
    }
  }, [initialDate])

  const onChangeDate = (date) => {
    if (Array.isArray(date) && date.length) {
      const [start, end] = date
      setStartDate(start)
      setEndDate(end)
    } else if (date) {
      setStartDate(date)
      setEndDate(null)
    }
  }

  return {
    startDate,
    endDate,
    onChangeDate
  }
}
