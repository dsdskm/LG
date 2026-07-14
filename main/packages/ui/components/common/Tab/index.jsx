import React from 'react'
import { StyledTabContent } from './styles'

/**
 * Tab component to be used inside Tabs
 *
 * @param {Object} props
 * @param {string} props.id - Unique ID for the tab
 * @param {string} props.label - Label to display in the tab list
 * @param {React.ReactNode} props.children - Content of the tab
 */
export const Tab = ({ children }) => {
  return <StyledTabContent>{children}</StyledTabContent>
}

export default Tab
