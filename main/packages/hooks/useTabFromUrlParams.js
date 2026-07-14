import { useSearchParams } from 'react-router-dom'
import { useTab } from './useTab'
import { useEffect } from 'react'

export const useTabFromUrlParams = (tabList) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabUrlParam = tabList.find((tab) => tab.name === searchParams.get('tab')) || tabList[0]
  const { selectedTab, onClickSelectedTab } = useTab(tabUrlParam)

  useEffect(() => {
    const currentTab = searchParams.get('tab')
    if (currentTab !== selectedTab.name) {
      searchParams.set('tab', selectedTab.name)
      setSearchParams({ tab: selectedTab.name })
    }
  }, [selectedTab, searchParams, setSearchParams])

  return { selectedTab, onClickSelectedTab }
}
