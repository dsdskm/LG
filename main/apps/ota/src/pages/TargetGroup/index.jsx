import React, { useState, useEffect, Suspense, useCallback } from 'react'
import {
  Dropdown,
  StyledPageContent,
  Section,
  Title,
  NoData,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Button,
  OrganizationSelector
} from '@repo/ui'
import { useNavigate } from 'react-router-dom'
import GroupTable from '@/components/TargetGroup/GroupTable'
import { useTranslation } from 'react-i18next'
import { targetGroupApis } from '@/apis'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { convertDateToString } from '@repo/utils'
import { ButtonWrap } from '@/components/common/styles'
import { toast } from 'react-toastify'

const LIMIT_TARGET_GROUP_PER_ORG = 20

const hoverStyles = {
  rows: {
    highlightOnHoverStyle: {
      backgroundColor: 'var(--color-neutral-20)',
      transitionDuration: '0.15s',
      transitionProperty: 'background-color'
    }
  }
}

const TargetGroup = () => {
  const navigate = useNavigate()
  const session = useUserStore((state) => state.session)
  const { t } = useTranslation('targetGroup')
  const { t: tCommon } = useTranslation('common')
  const { actualOrgs, allOrgs, defaultOrg } = useOrganizationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [filterQuery, setFilterQuery] = useState('all')
  const [modeOptions, setModeOptions] = useState([])

  const tableHeader = () => {
    return {
      columns: [
        {
          name: t('groupName'),
          selector: (row) => row.displayName,
          sortable: 'true'
        },
        {
          name: t('organizationName'),
          selector: (row) => allOrgs.find((org) => org.id === row.organizationId)?.displayName,
          sortable: 'true'
        },
        {
          name: t('memo'),
          selector: (row) => row.memo,
          sortable: 'true'
        },
        {
          name: t('deviceCount'),
          selector: (row) => row.deviceCount || 0,
          sortable: 'true'
        },
        {
          name: t('mode'),
          selector: (row) => {
            return t(row.mode)
          },
          sortable: 'true'
        },
        {
          name: t('date'),
          selector: (row) => row.createdAt,
          sortable: 'true'
        }
      ]
    }
  }

  const [processedData, setProcessedData] = useState([])
  const handleRowClicked = useCallback(
    (row) => {
      navigate(`/ota/target-group/detail/${row.id}?orgId=${row.organizationId}`)
    },
    [navigate]
  )
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const [orgFilter, setOrgFilter] = useState({ actualOrgs: [], matchesOrg: () => false })

  const filteredData = processedData.filter((item) => {
    const displayNameStr = item.displayName || ''
    const searchQueryStr = searchQuery || ''
    const matchesSearch = displayNameStr.toLowerCase().includes(searchQueryStr.toLowerCase())
    const matchesOrg = orgFilter.matchesOrg({ id: item.organizationId })
    const matchesMode = filterQuery === 'all' || filterQuery === '' || item.mode === filterQuery

    return matchesSearch && matchesOrg && matchesMode
  })

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const checkTargetGroupLimitPerOrg = () => {
    const currentOrg = session?.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0 ? defaultOrg : actualOrgs[0]
    const targetGroupCount = processedData.filter((item) => item.organizationId === currentOrg.id).length
    return targetGroupCount < LIMIT_TARGET_GROUP_PER_ORG
  }

  const allOrgIds =
    session?.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0
      ? [...allOrgs, defaultOrg].map((org) => org.id).join(',')
      : actualOrgs.map((org) => org.id).join(',')

  useEffect(() => {
    if (actualOrgs.length === 0 && session?.userRole !== 'SYSTEM_MANAGER') {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const retrieveTargetGroup = async () => {
      try {
        const response = await targetGroupApis.retrieveTargetGroup(allOrgIds.split(','))
        const responseData = response.results
          .filter((item) => item.campaignType === 'update')
          .map((item) => {
            return {
              ...item,
              createdAt: item.createdAt ? convertDateToString(item.createdAt) : '-'
            }
          })
        setProcessedData(responseData)
        const uniqueModes = Array.from(new Set(responseData.map((item) => item.mode).filter(Boolean)))
        setModeOptions([
          { value: 'all', name: t('all') || 'All' },
          ...uniqueModes.map((mode) => ({ value: mode, name: t(mode) || mode }))
        ])
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    retrieveTargetGroup()
  }, [allOrgIds])

  const handleSelectOrg = useCallback((info) => {
    setOrgFilter({ actualOrgs: info.actualOrgs, matchesOrg: info.matchesOrg })
  }, [])

  const handleCreate = () => {
    if (!checkTargetGroupLimitPerOrg()) {
      toast.error(t('targetGroupLimitPerOrg', { limit: LIMIT_TARGET_GROUP_PER_ORG }), { autoClose: 2000 })
      return
    }
    const orgId = session?.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0 ? defaultOrg.id : actualOrgs[0].id
    navigate(`/ota/target-group/detail/?orgId=${orgId}`)
  }

  const handleFilterChange = (value) => {
    setFilterQuery(value)
  }

  return (
    <StyledPageContent className="column">
      <Title>{t('targetGroupTitle')}</Title>
      <OrganizationSelector onChange={handleSelectOrg} allToTop={false} />
      <Section>
        <HeaderTitleGroup>
          <Dropdown
            size="lg"
            minWidth="180px"
            label={t('mode')}
            value={filterQuery}
            placeholder={t('selectMode')}
            options={modeOptions}
            onChange={handleFilterChange}
          />
          <SearchContainer>
            <Search
              value={searchQuery}
              label={t('groupName')}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder')}
              width={'300px'}
            />
          </SearchContainer>
          <ButtonWrap className="alignRight" style={{ marginBottom: '-2rem' }}>
            <Button onClick={handleCreate} disabled={actualOrgs.length !== 1 && session?.userRole !== 'SYSTEM_MANAGER'}>
              {t('create')}
            </Button>
            <Button>{t('delete')}</Button>
          </ButtonWrap>
        </HeaderTitleGroup>
        {!isLoading && filteredData.length === 0 ? (
          <NoData>{tCommon('noData')}</NoData>
        ) : (
          <Suspense fallback={<div>Loading...</div>}>
            <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
              {tCommon('count')} : {filteredData.length}
            </div>
            <GroupTable
              columns={tableHeader().columns}
              data={filteredData}
              noData={tCommon('noData')}
              isLoading={isLoading}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
              onRowClicked={handleRowClicked}
              pointerOnHover
              customStyles={hoverStyles}
            />
          </Suspense>
        )}
      </Section>
    </StyledPageContent>
  )
}

export default TargetGroup
