import React, { useState, useMemo } from 'react'
import { Section, Search, SearchContainer, HeaderTitleGroup } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import ModulesTableInExpand from './ModulesTableInExpand'
import { StyledExpandedWrapper } from '@/components/common/styles'

const ExpandOfDevice = ({ data: deviceData, isClosing, inModal = false, noData, allModules = [] }) => {
  const { t } = useTranslation('device')

  // Show modules inside the expandable row
  const deviceModuleInfo = deviceData.ModuleInfos || []

  const mergedModules = useMemo(() => {
    console.log('allModules', allModules)
    return allModules.map((moduleItem) => {
      const match = deviceModuleInfo.find((info) => info.Module?.id === moduleItem.id)
      if (match) {
        return { ...match.Module }
      }
      return moduleItem
    })
  }, [allModules, deviceModuleInfo])

  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const filteredModules = useMemo(() => {
    return mergedModules.filter((item) => {
      return !searchQuery || item?.displayName?.toLowerCase()?.includes(searchQuery?.toLowerCase())
    })
  }, [mergedModules, searchQuery])

  return (
    <StyledExpandedWrapper $isClosing={isClosing} $inModal={inModal}>
      <Section>
        <HeaderTitleGroup>
          <SearchContainer style={{ marginBottom: '2rem' }}>
            <Search value={searchQuery} onChange={handleSearchChange} placeholder={t('searchModulePlaceholder')} />
          </SearchContainer>
        </HeaderTitleGroup>
        <ModulesTableInExpand data={filteredModules} noData={noData} />
      </Section>
    </StyledExpandedWrapper>
  )
}

export default ExpandOfDevice
