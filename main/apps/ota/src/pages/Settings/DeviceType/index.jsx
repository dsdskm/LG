import React, { useState, useEffect, Suspense } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  NoData,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Button,
  Table,
  OrganizationSelector
} from '@repo/ui'
import { useNavigate } from 'react-router-dom'
import { useOrganizationStore } from '@repo/stores'
import { deviceTypeApis } from '@/apis'
import { convertDateToString } from '@repo/utils'
import { ButtonWrap } from '@/components/common/styles'
import { useTranslation } from 'react-i18next'

const hoverStyles = {
  rows: {
    highlightOnHoverStyle: {
      backgroundColor: 'var(--color-neutral-20)',
      transitionDuration: '0.15s',
      transitionProperty: 'background-color'
    }
  }
}

const DeviceType = () => {
  const { company } = useOrganizationStore()
  const navigate = useNavigate()
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const { setSelectedOrgs, setForcedNone } = useOrganizationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [processedData, setProcessedData] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  const columns = [
    {
      name: t('deviceTypeName'),
      selector: (row) => row.displayName,
      sortable: 'true'
    },
    {
      name: t('memo'),
      selector: (row) => row.memo,
      sortable: 'true'
    },
    {
      name: t('code'),
      selector: (row) => row.code,
      sortable: 'true'
    },
    {
      name: t('createdAt'),
      selector: (row) => row.createdAt,
      sortable: 'true'
    }
  ]

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const filteredData = processedData.filter((item) => {
    const displayNameStr = item.displayName || ''
    const searchQueryStr = searchQuery || ''
    return displayNameStr.toLowerCase().includes(searchQueryStr.toLowerCase())
  })

  useEffect(() => {
    const retrieveDeviceType = async () => {
      setIsLoading(true)
      try {
        const response = await deviceTypeApis.retrieveDeviceTypes(company.id)
        const responseData = response.results.map((item) => {
          return {
            ...item,
            createdAt: item.createdAt ? convertDateToString(item.createdAt) : '-'
          }
        })
        setProcessedData(responseData)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    retrieveDeviceType()
  }, [])

  useEffect(() => {
    if (company?.orgLinkage) {
      setForcedNone(true)
      return () => {
        setForcedNone(false)
      }
    }
  }, [company?.orgLinkage, setForcedNone])

  const handleCreate = () => {
    navigate('/ota/settings/device-type/detail')
  }

  const handleRowClicked = (row) => {
    navigate(`/ota/settings/device-type/detail/${row.id}`)
  }

  return (
    <StyledPageContent className="column">
      <Title>{t('deviceTypeTitle')}</Title>
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
          {tCommon('count')} : {filteredData.length}
        </div>

        {!isLoading && filteredData.length === 0 ? (
          <NoData>{tCommon('noData')}</NoData>
        ) : (
          <Suspense fallback={<div>Loading...</div>}>
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
          </Suspense>
        )}
      </Section>
    </StyledPageContent>
  )
}

export default DeviceType
