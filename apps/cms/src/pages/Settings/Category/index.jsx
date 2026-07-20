import React, { useState, useMemo, useEffect } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Button,
  Table,
  OrganizationSelector
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { convertDateToString } from '@repo/utils'
import { useOrganizationStore } from '@repo/stores'
import { categoryTreeApis, externalServiceApis } from '@/apis'
import { ButtonWrap } from '@/components/common/styles'

const Category = () => {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const { company, actualOrgs, setForcedNone } = useOrganizationStore()

  const [extService, setExtService] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const orgIds = actualOrgs.map((org) => org.id).join(',')

  // useEffect(() => {
  //   fetchModules()
  // }, [orgIds])

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleCreate = () => {
    navigate('/cms/settings/category/detail')
  }

  const filteredData = useMemo(() => {
    const extServiceArray = Array.isArray(extService) ? extService : extService?.tree || []
    return extServiceArray.filter((item) => {
      const name = item.displayName || item.display_name?.default || ''
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [extService, searchQuery])

  // useEffect(() => {
  //   if (company?.orgLinkage) {
  //     setForcedNone(true)
  //     return () => {
  //       setForcedNone(false)
  //     }
  //   }
  // }, [company?.orgLinkage, setForcedNone])

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const response = await externalServiceApis.getExternalServices()
        setExtService(response?.results || [])
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const columns = [
    {
      name: t('externalService'),
      selector: (row) => row.displayName || row.externalServiceCode,
      cell: (row) => (
        <Button as="NavLink" to={`/cms/settings/category/detail/${row.id}`} state={{ service: row }} theme="link">
          {row.displayName || row.externalServiceCode}
        </Button>
      ),
      sortable: 'true'
    },
    {
      name: t('createdAt'),
      selector: (row) => (row.createdAt ? convertDateToString(row.createdAt) : '-'),
      sortable: 'true'
    }
  ]

  return (
    <StyledPageContent className="column">
      <Title>{t('categorySettingsTitle')}</Title>
      <OrganizationSelector disabled={company?.orgLinkage} supportAlls={[false, false]} />
      <Section>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder')}
            />
          </SearchContainer>
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count') || 'Count'} : {filteredData.length}
        </div>

        <Table
          columns={columns}
          data={filteredData}
          noData={tCommon('noData')}
          isLoading={isLoading}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </Section>
    </StyledPageContent>
  )
}

export default Category
