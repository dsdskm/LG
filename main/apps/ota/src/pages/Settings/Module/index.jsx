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
import { moduleApis } from '@/apis'
import { ButtonWrap } from '@/components/common/styles'

const hoverStyles = {
  rows: {
    highlightOnHoverStyle: {
      backgroundColor: 'var(--color-neutral-20)',
      transitionDuration: '0.15s',
      transitionProperty: 'background-color'
    }
  }
}

const Module = () => {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const { company, actualOrgs, setForcedNone } = useOrganizationStore()

  const [modules, setModules] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchModules = async () => {
    try {
      setIsLoading(true)
      const response = await moduleApis.retrieveModules(company.id)
      setModules(response.results)
    } catch (error) {
      console.error('Failed to fetch modules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const orgIds = actualOrgs.map((org) => org.id).join(',')

  useEffect(() => {
    fetchModules()
  }, [orgIds])

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleCreate = () => {
    navigate('/ota/settings/module/detail')
  }

  const handleRowClicked = (row) => {
    navigate(`/ota/settings/module/detail/${row.id}`)
  }

  const filteredData = useMemo(() => {
    return modules.filter((item) => {
      const matchesSearch = item.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [modules, searchQuery])

  useEffect(() => {
    if (company?.orgLinkage) {
      setForcedNone(true)
      return () => {
        setForcedNone(false)
      }
    }
  }, [company?.orgLinkage, setForcedNone])

  const columns = [
    {
      name: t('moduleName'),
      selector: (row) => row.displayName,
      sortable: 'true'
    },
    {
      name: t('memo'),
      selector: (row) => row.memo,
      sortable: 'true'
    },
    {
      name: t('deviceType'),
      selector: (row) =>
        row.DeviceTypes && row.DeviceTypes.length > 0
          ? row.DeviceTypes.map((deviceType) => deviceType.displayName).join(', ')
          : '',
      sortable: 'true'
    },
    {
      name: t('packaging'),
      selector: (row) => row.PackageType?.displayName,
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
      <Title>{t('moduleSettingsTitle')}</Title>
      <OrganizationSelector disabled={company?.orgLinkage} allToTop={false} />
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
          <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
            <Button variant="contained" onClick={handleCreate}>
              {t('create')}
            </Button>
          </ButtonWrap>
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
          onRowClicked={handleRowClicked}
          pointerOnHover
          customStyles={hoverStyles}
          highlightOnHover
        />
      </Section>
    </StyledPageContent>
  )
}

export default Module
