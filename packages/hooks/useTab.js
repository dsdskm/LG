import { useState } from 'react'

export const useTab = (initialState) => {
  const [selectedTab, setSelectedTab] = useState(initialState)

  const onClickSelectedTab = (selected) => {
    setSelectedTab(selected)
  }

  return { selectedTab, onClickSelectedTab }
}
