import React, { useState, useEffect, useCallback } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Modal,
  OrganizationSelector
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { deviceApis, moduleApis } from '@/apis'
import DeviceTable from '@/components/Device/DeviceTable'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { ClipLoader } from 'react-spinners'

const Device = () => {
  const { t } = useTranslation('device')
  const { t: tCommon } = useTranslation('common')

  const [processedData, setProcessedData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [orgFilter, setOrgFilter] = useState({ actualOrgs: [], matchesOrg: () => false })
  const [isProcessing, setIsProcessing] = useState(false)
  const { actualOrgs, allOrgs, defaultOrg, company } = useOrganizationStore()
  const { session } = useUserStore()
  const [allModules, setAllModules] = useState([])

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleSelectOrg = useCallback((info) => {
    setOrgFilter({ actualOrgs: info.actualOrgs, matchesOrg: info.matchesOrg })
  }, [])

  const filteredData = processedData.filter((device) => {
    const displayNameStr = device.displayName || ''
    const searchQueryStr = searchQuery || ''
    const matchesSearch = displayNameStr.toLowerCase().includes(searchQueryStr.toLowerCase())
    const matchesOrg = device.Organization ? orgFilter.matchesOrg(device.Organization) : false

    return matchesSearch && matchesOrg
  })

  const orgIds =
    session?.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0
      ? [...allOrgs, defaultOrg]
          .map((org) => org?.id)
          .sort((a, b) => a - b)
          .join(', ')
      : actualOrgs.map((org) => org.id).join(', ')

  const parsedOrgIds = orgIds ? orgIds.split(',').map((id) => Number(id.trim())) : []

  const fetchDevices = async () => {
    if (actualOrgs.length === 0 && session?.userRole !== 'SYSTEM_MANAGER') return

    setIsLoading(true)
    try {
      const response = await deviceApis.retrieveDevices(parsedOrgIds)
      const sortedResults = (response.results || []).sort((a, b) =>
        (a.displayName || '').localeCompare(b.displayName || '')
      )
      setProcessedData(sortedResults)
    } catch (error) {
      console.error('Failed to retrieve devices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (actualOrgs.length === 0 && session?.userRole !== 'SYSTEM_MANAGER') return

    fetchDevices()

    const fetchModules = async () => {
      setIsLoading(true)
      try {
        const response = await moduleApis.retrieveModules(company.id)
        setAllModules(response.results)
      } catch (error) {
        console.error('Failed to retrieve modules:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchModules()
  }, [orgIds])

  return (
    <StyledPageContent className="column">
      <Title>{t('deviceTitle')}</Title>
      <OrganizationSelector onChange={handleSelectOrg} allToTop={false} />
      <Section>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              label={t('deviceName')}
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={t('searchPlaceholder')}
              width={'300px'}
            />
          </SearchContainer>
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count')} : {filteredData.length}
        </div>
        <DeviceTable
          data={filteredData}
          noData={tCommon('noData')}
          isLoading={isLoading}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
          allModules={allModules}
        />
        <Modal isOpen={isProcessing} size="xs">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <ClipLoader color={'#36d7b7'} loading={true} size={50} />
            <div style={{ marginTop: '20px' }}>{t('processing')}</div>
          </div>
        </Modal>
      </Section>
    </StyledPageContent>
  )
}

export default Device
