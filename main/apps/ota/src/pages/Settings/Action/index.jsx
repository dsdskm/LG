import React, { useState, useEffect, Suspense, useCallback } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  NoData,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Checkbox,
  Button,
  OrganizationSelector
} from '@repo/ui'
import { useNavigate } from 'react-router-dom'
import ActionTable from '@/components/Settings/Action/ActionTable'
import { actionApis } from '@/apis'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { convertDateToString } from '@repo/utils'
import { useOrganizationStore, useUserStore } from '@repo/stores'
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

const Action = () => {
  const navigate = useNavigate()
  const session = useUserStore((state) => state.session)
  const [processedData, setProcessedData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const toggleRowSelection = (row) => {
    setSelectedActions((prev) => {
      const isSelected = prev.find((item) => item.id === row.id)
      if (isSelected) {
        return prev.filter((item) => item.id !== row.id)
      }
      return [...prev, row]
    })
  }
  const handleRowClicked = (row) => {
    if (deleteMode) {
      toggleRowSelection(row)
      return
    }
    navigate(`/ota/settings/action/detail/${row.id}?orgId=${row.organizationId}`)
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [filterQuery, setFilterQuery] = useState('all')
  const [selectedActions, setSelectedActions] = useState([])
  const [deleteMode, setDeleteMode] = useState(false)
  const { actualOrgs, allOrgs, defaultOrg } = useOrganizationStore()
  const [orgFilter, setOrgFilter] = useState({
    actualOrgs: [],
    matchesOrg: () => false
  })

  const filteredData = processedData.filter((item) => {
    const typeStr = item.type || ''
    const displayNameStr = item.displayName || ''
    const searchQueryStr = searchQuery || ''

    const matchesStatus = filterQuery === 'all' || typeStr.toLowerCase() === filterQuery
    const matchesSearch = displayNameStr.toLowerCase().includes(searchQueryStr.toLowerCase())

    return matchesStatus && matchesSearch
  })

  const handleAllCheck = (e) => {
    if (e.target.checked) {
      setSelectedActions(filteredData)
    } else {
      setSelectedActions([])
    }
  }

  const isAllSelected =
    filteredData.length > 0 && filteredData.every((item) => selectedActions.find((selected) => selected.id === item.id))

  const displayData = filteredData.map((item) => ({
    ...item,
    checked: !!selectedActions.find((selected) => selected.id === item.id)
  }))

  const tableHeader = () => {
    return {
      columns: [
        ...(deleteMode
          ? [
              {
                name: <Checkbox checked={isAllSelected} onChange={handleAllCheck} />,
                cell: (row) => (
                  <Checkbox
                    checked={row.checked}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleRowSelection(row)
                    }}
                  />
                ),
                width: '50px'
              }
            ]
          : []),
        {
          name: t('title'),
          selector: (row) => row.displayName,
          sortable: 'true'
        },
        {
          name: t('organizationName'),
          selector: (row) => row.organizationId,
          cell: (row) => allOrgs.find((org) => org.id === row.organizationId)?.displayName,
          sortable: 'true'
        },
        {
          name: t('memo'),
          selector: (row) => row.memo,
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleFilterChange = (value) => {
    setFilterQuery(value)
  }

  const handleCreate = () => {
    navigate(
      `/ota/settings/action/detail/?orgId=${orgFilter.actualOrgs.length === 0 ? defaultOrg.id : orgFilter.actualOrgs[0].id}`
    )
  }

  const fetchData = useCallback(async () => {
    if (actualOrgs.length === 0 && session.userRole !== 'SYSTEM_MANAGER') {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const orgIds =
        session.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0
          ? [...allOrgs, defaultOrg].map((org) => org.id).join(',')
          : actualOrgs.map((org) => org.id).join(',')
      const response = await actionApis.retrieveAction(orgIds.split(',').sort((a, b) => a - b))
      const mappedData = response.results.map((item) => ({
        ...item,
        action: item.displayName,
        target: 'N/A', // or some other field if available
        createdAt: item.createdAt ? convertDateToString(item.createdAt) : '-'
      }))
      setProcessedData(mappedData)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [orgFilter])

  const handleDelete = () => {
    deleteMode
      ? actionApis
          .deleteAction({ ids: selectedActions.map((item) => item.id) })
          .then((response) => {
            toast.success(tCommon('success'), { autoClose: 2000 })
            fetchData()
            setDeleteMode(false)
            setSelectedActions([])
          })
          .catch((error) => {
            console.error(error)
            toast.error(tCommon('error'), { autoClose: 2000 })
          })
      : setDeleteMode((prev) => !prev)
  }

  const handleCancel = () => {
    setDeleteMode((prev) => !prev)
    setSelectedActions([])
  }

  const isDisabled = () => {
    return selectedActions.length === 0 && deleteMode
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectOrg = useCallback((info) => {
    setOrgFilter({ actualOrgs: info.actualOrgs, matchesOrg: info.matchesOrg })
  }, [])

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  return (
    <StyledPageContent className="column">
      <Title>{t('actionTitle')}</Title>
      <OrganizationSelector onChange={handleSelectOrg} allToTop={false} />
      <Section>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              label={t('title')}
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder')}
              width={'300px'}
            />
          </SearchContainer>
          <ButtonWrap className="alignRight" style={{ marginBottom: '-2rem' }}>
            {!deleteMode && (
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={actualOrgs.length !== 1 && session.userRole !== 'SYSTEM_MANAGER'}
              >
                {t('create')}
              </Button>
            )}
            <Button variant="contained" onClick={handleDelete} disabled={isDisabled()}>
              {t('delete')}
            </Button>
            {deleteMode && (
              <Button variant="contained" onClick={handleCancel}>
                {t('cancel')}
              </Button>
            )}
          </ButtonWrap>
        </HeaderTitleGroup>
        {!isLoading && displayData.length === 0 ? (
          <NoData>{tCommon('noData')}</NoData>
        ) : (
          <Suspense fallback={<div>Loading...</div>}>
            <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
              {tCommon('count')} : {filteredData.length}
            </div>
            <ActionTable
              data={displayData}
              columns={tableHeader().columns}
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

export default Action
