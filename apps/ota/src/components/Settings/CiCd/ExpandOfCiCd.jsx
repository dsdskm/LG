import React, { useState, useEffect, useMemo } from 'react'
import { Section, Search, SearchContainer, HeaderTitleGroup } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import DevicesTableInExpand from './DevicesTableInExpand'
import { StyledExpandedWrapper } from '@/components/common/styles'
import { deviceApis } from '@/apis'
import { useOrganizationStore } from '@repo/stores'

const ExpandOfCiCd = ({ data: moduleRow, isClosing, inModal = false, noData }) => {
  const { t } = useTranslation('settings')
  const { actualOrgs } = useOrganizationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [devices, setDevices] = useState([])

  const orgIdsString = actualOrgs?.map((org) => org.id).join(',') || ''

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        if (!orgIdsString) return
        const res = await deviceApis.retrieveDevices(orgIdsString.split(','))
        setDevices(res.results.sort((a, b) => a.displayName.localeCompare(b.displayName)))
      } catch (e) {
        console.error('Failed to retrieve devices:', e)
      }
    }

    // 닫히는 중일 때는 불필요한 API 호출 방지
    if (!isClosing) {
      fetchDevices()
    }
  }, [orgIdsString, isClosing])

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const filteredDevices = useMemo(() => {
    return devices.filter((item) => {
      return !searchQuery || item?.displayName?.toLowerCase()?.includes(searchQuery?.toLowerCase())
    })
  }, [devices, searchQuery])

  return (
    <StyledExpandedWrapper $isClosing={isClosing} $inModal={inModal}>
      <Section>
        <HeaderTitleGroup>
          <SearchContainer style={{ marginBottom: '2rem' }}>
            <Search value={searchQuery} onChange={handleSearchChange} placeholder={t('searchPlaceholder')} />
          </SearchContainer>
        </HeaderTitleGroup>
        <DevicesTableInExpand data={filteredDevices} noData={noData} moduleRow={moduleRow} />
      </Section>
    </StyledExpandedWrapper>
  )
}

export default ExpandOfCiCd
