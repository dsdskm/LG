import { useState, useCallback } from 'react'

const useSearch = (initialFilters, executeSearch, fetchData) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState(initialFilters)

  const handleSearchQueryChange = useCallback((e) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleFilterChange = useCallback((filterName, value) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filterName]: value
    }))
  }, [])

  const performSearch = useCallback(async () => {
    await fetchData(() => executeSearch({ ...filters, searchQuery }))
  }, [filters, searchQuery, fetchData])

  const handleKeyPress = useCallback(
    async (e) => {
      if (e.key === 'Enter') {
        await performSearch()
      }
    },
    [performSearch]
  )

  return {
    searchQuery,
    handleSearchQueryChange,
    filters,
    handleFilterChange,
    performSearch,
    handleKeyPress
  }
}

export default useSearch
