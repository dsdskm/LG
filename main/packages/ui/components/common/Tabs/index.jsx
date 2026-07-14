import React, { useState, useCallback, useMemo } from 'react'
import { StyledTabs, StyledTabList, StyledTabItem } from './styles'
import Tab from '../Tab'

/**
 * Common Tabs component
 *
 * @param {Object} props
 * @param {string} [props.defaultActiveId] - Initial active tab ID
 * @param {string} [props.activeId] - Active tab ID (controlled)
 * @param {function} [props.onChange] - Callback on tab change
 * @param {React.ReactNode} props.children - Tab components
 */
export const Tabs = ({ children, defaultActiveId, activeId: controlledActiveId, onChange }) => {
  const tabs = useMemo(() => {
    return React.Children.toArray(children).filter((child) => child.type === Tab)
  }, [children])

  const [internalActiveId, setInternalActiveId] = useState(defaultActiveId || tabs[0]?.props?.id)

  const activeId = controlledActiveId !== undefined ? controlledActiveId : internalActiveId

  const handleTabClick = useCallback(
    (id) => {
      if (controlledActiveId === undefined) {
        setInternalActiveId(id)
      }
      if (onChange) {
        onChange(id)
      }
    },
    [controlledActiveId, onChange]
  )

  const activeTab = useMemo(() => {
    return tabs.find((tab) => tab.props.id === activeId)
  }, [tabs, activeId])

  return (
    <StyledTabs>
      <StyledTabList>
        {tabs.map((tab) => (
          <StyledTabItem
            key={tab.props.id}
            $active={tab.props.id === activeId}
            onClick={() => handleTabClick(tab.props.id)}
            className="typographyButton3"
          >
            {tab.props.label}
          </StyledTabItem>
        ))}
      </StyledTabList>
      {activeTab}
    </StyledTabs>
  )
}

export default Tabs
