import { createContext, useContext, useState, useCallback } from 'react'

const noop = () => {}

const defaultContext = {
  selectedGroup: '',
  selectedSite: '',
  setSelectedGroup: noop,
  setSelectedSite: noop
}

const AppContext = createContext(defaultContext)

export function AppProvider({ children }) {
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedSite, setSelectedSite] = useState('')

  return (
    <AppContext.Provider
      value={{
        selectedGroup,
        selectedSite,
        setSelectedGroup,
        setSelectedSite
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  return useContext(AppContext)
}
