import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  Search,
  Section,
  HeaderTitleGroup,
  SearchContainer,
  Title,
  StyledPageContent,
  TableLoading,
  OrganizationSelector
} from '@repo/ui'
import { convertDateToString } from '@repo/utils'
import { requestApis } from '@/apis'

const Request = () => {
  const { t } = useTranslation('management')
  const { t: tCampaign } = useTranslation('campaign')
  const { t: tCommon } = useTranslation('common')

  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [orgSearch, setOrgSearch] = useState('')
  const [selectedOrgIds, setSelectedOrgIds] = useState([])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await requestApis.retrieveRequest({ ids: selectedOrgIds })
      setData(response.results)
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedOrgIds])

  const handleOrgChange = ({ actualOrgs }) => {
    const ids = actualOrgs.map((org) => org.id)
    setSelectedOrgIds(ids)
  }

  const filteredData = useMemo(() => {
    let filtered = data
    if (selectedOrgIds.length > 0) {
      filtered = filtered.filter((item) => selectedOrgIds.includes(item.organization?.id))
    }
    if (orgSearch) {
      filtered = filtered.filter((item) =>
        (item.organization?.displayName || '').toLowerCase().includes(orgSearch.toLowerCase())
      )
    }
    return filtered
  }, [data, orgSearch, selectedOrgIds])

  const columns = [
    {
      name: tCampaign('organization'),
      selector: (row) => row.organization?.displayName,
      sortable: 'true'
    },
    {
      name: tCampaign('status'),
      selector: (row) => row.status,
      sortable: 'true'
    },
    {
      name: t('reason'),
      selector: (row) => row.reason,
      sortable: 'true'
    },
    {
      name: t('requestDate'),
      selector: (row) => convertDateToString(row.requestedDate),
      sortable: 'true'
    }
  ]

  return (
    <StyledPageContent className="column">
      <Title>{t('requestTitle')}</Title>
      <OrganizationSelector onChange={handleOrgChange} allToTop={false} />
      <Section>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              placeholder={tCampaign('organization')}
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
            />
          </SearchContainer>
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count')} : {filteredData.length}
        </div>
        {isLoading ? <TableLoading /> : <Table columns={columns} data={filteredData} noData={tCommon('noData')} />}
      </Section>
    </StyledPageContent>
  )
}

export default Request
