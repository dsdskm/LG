import { useCallback, useMemo } from 'react'

const useRowClick = (data = [], setData) => {
  const handleClick = useCallback(
    (row) => {
      setData((prev) =>
        prev.map((item) => ({
          ...item,
          selected: row.tableRowId === item.tableRowId
        }))
      )
    },
    [setData]
  )

  const selectedTableRow = useMemo(() => (Array.isArray(data) ? data.find((item) => item.selected) : null), [data])

  return { handleClick, selectedTableRow }
}

export default useRowClick
