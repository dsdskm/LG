import React, { useState, useEffect, Suspense, useCallback } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  NoData,
  Modal,
  OrganizationSelector,
  Checkbox,
  Button,
  Search,
  SearchContainer,
  HeaderTitleGroup
} from '@repo/ui'
import { useNavigate } from 'react-router-dom'
import PolicyTable from '@/components/Policy/PolicyTable'
import { policyApis } from '@/apis'
import { useTranslation } from 'react-i18next'
import { convertDateToString } from '@repo/utils'
import { toast } from 'react-toastify'
import { ButtonWrap } from '@/components/common/styles'
import { useOrganizationStore, useUserStore } from '@repo/stores'

const hoverStyles = {
  rows: {
    highlightOnHoverStyle: {
      backgroundColor: 'var(--color-neutral-20)',
      transitionDuration: '0.15s',
      transitionProperty: 'background-color'
    }
  }
}

const Policy = () => {
  const navigate = useNavigate()
  const session = useUserStore((state) => state.session)
  const [processedData, setProcessedData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { t } = useTranslation('policy')
  const { t: tCommon } = useTranslation('common')
  const handleRowSelected = (row) => {
    setSelectedPolicies((prev) => {
      const isSelected = prev.find((item) => item.id === row.id)
      if (isSelected) {
        return prev.filter((item) => item.id !== row.id)
      }
      return [...prev, row]
    })
  }
  const handleRowClicked = (row) => {
    navigate(`/ota/policy/detail/${row.id}?orgId=${row.Organization?.id}`)
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [filterQuery, setFilterQuery] = useState('all')
  const [selectedPolicies, setSelectedPolicies] = useState([])
  const [deleteMode, setDeleteMode] = useState(false)
  const [orgFilter, setOrgFilter] = useState({ actualOrgs: [], matchesOrg: () => false })
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const { allOrgs, actualOrgs, defaultOrg } = useOrganizationStore()

  const filteredData = processedData.filter((item) => {
    const matchesStatus = filterQuery === 'all' || item.type.toLowerCase() === filterQuery
    const matchesSearch = item.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesOrg = item.Organization ? orgFilter.matchesOrg(item.Organization) : false

    return matchesStatus && matchesSearch && matchesOrg
  })

  const handleAllCheck = (e) => {
    if (e.target.checked) {
      setSelectedPolicies(filteredData)
    } else {
      setSelectedPolicies([])
    }
  }

  const isAllSelected =
    filteredData.length > 0 &&
    filteredData.every((item) => selectedPolicies.find((selected) => selected.id === item.id))

  const displayData = filteredData.map((item) => ({
    ...item,
    checked: !!selectedPolicies.find((selected) => selected.id === item.id)
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
                      handleRowSelected(row)
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
          selector: (row) => row.Organization.displayName,
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

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleFilterChange = (value) => {
    setFilterQuery(value)
  }

  const handleCreate = () => {
    navigate(
      `/ota/policy/detail?orgId=${session.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0 ? defaultOrg.id : actualOrgs[0].id}`
    )
  }

  const handleDelete = async () => {
    if (!deleteMode) {
      setDeleteMode((prev) => !prev)
      return
    }
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    try {
      await policyApis.deletePolicies(selectedPolicies.map((item) => item.id))
      toast.success(tCommon('success'), { autoClose: 2000 })
      fetchData()
    } catch (error) {
      toast.error(tCommon('error'), { autoClose: 2000 })
    } finally {
      setDeleteMode(false)
      setSelectedPolicies([])
      setIsDeleteModalOpen(false)
    }
  }

  const handleCancel = () => {
    setDeleteMode((prev) => !prev)
    setSelectedPolicies([])
  }

  const isDisabled = () => {
    return selectedPolicies.length === 0 && deleteMode
  }

  const orgIds =
    session.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0
      ? [...allOrgs, defaultOrg].map((org) => org.id).join(',')
      : actualOrgs.map((org) => org.id).join(',')

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await policyApis.retrievePolicy(orgIds.split(',').sort((a, b) => a - b))
      const mappedData = response.results.map((policy) => ({
        ...policy,
        createdAt: policy.createdAt ? convertDateToString(policy.createdAt) : '-'
      }))
      setProcessedData(mappedData)
    } catch (error) {
      console.error('Error retrieving artifacts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [orgIds])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectOrg = useCallback((info) => {
    setOrgFilter({ actualOrgs: info.actualOrgs, matchesOrg: info.matchesOrg })
  }, [])

  return (
    <StyledPageContent className="column">
      <Title>{t('policyTitle')}</Title>
      <OrganizationSelector onChange={handleSelectOrg} allToTop={false} />
      <Section>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder')}
              width={'300px'}
            />
          </SearchContainer>
          <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
            {!deleteMode && (
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={orgFilter.actualOrgs.length !== 1 && session.userRole !== 'SYSTEM_MANAGER'}
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
            <PolicyTable
              data={displayData}
              columns={tableHeader().columns}
              noData={tCommon('noData')}
              isLoading={isLoading}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
              onRowClicked={deleteMode ? handleRowSelected : handleRowClicked}
              pointerOnHover
              customStyles={hoverStyles}
            />
          </Suspense>
        )}
      </Section>
      <Modal
        isOpen={isDeleteModalOpen}
        // title={t('confirm')}
        size="xs"
        onClose={() => setIsDeleteModalOpen(false)}
        renderButtonComponent={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
            <Button variant="contained" theme="primary" onClick={confirmDelete}>
              {t('confirm')}
            </Button>
            <Button variant="outlined" theme="primary" onClick={() => setIsDeleteModalOpen(false)}>
              {t('cancel')}
            </Button>
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>{t('deleteConfirm')}</div>
      </Modal>
    </StyledPageContent>
  )
}

export default Policy
