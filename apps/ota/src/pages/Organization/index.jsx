import React, { useState, useMemo, useEffect, Suspense } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  Dropdown,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Button,
  Table,
  NoData,
  Modal,
  OrganizationSelector
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import { convertDateToString } from '@repo/utils'
import { organizationApis } from '@repo/apis'
import { useUserStore, useOrganizationStore } from '@repo/stores'
import { standardizeOrganization } from '@repo/utils'
import { ButtonWrap } from '@/components/common/styles'

const Organization = () => {
  const { t } = useTranslation('organization')
  const { t: tCommon } = useTranslation('common')
  const { session } = useUserStore()
  const userId = session?.email

  const navigate = useNavigate()
  const { allOrgs, company, setAllOrgs, setForcedNone } = useOrganizationStore()

  const [filterRole, setFilterRole] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isJoinConfirmModalOpen, setIsJoinConfirmModalOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const roleOptions = useMemo(() => {
    if (!allOrgs) return [{ value: 'all', name: t('all') }]
    const roleNames = new Set(allOrgs.map((org) => org.roleName).filter(Boolean))
    return [
      { value: 'all', name: t('all') },
      ...Array.from(roleNames).map((roleName) => ({ value: roleName, name: t(roleName) }))
    ]
  }, [allOrgs, t])

  const handleFilterChange = (value) => {
    setFilterRole(value)
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleCreate = () => {
    navigate('/ota/organization/detail')
  }

  const filteredData = useMemo(() => {
    if (!allOrgs) return []
    return allOrgs.filter((org) => {
      const matchesRole = filterRole === 'all' || org.roleName === filterRole
      const displayNameStr = org.displayName || ''
      const matchesSearch = displayNameStr.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesRole && matchesSearch
    })
  }, [allOrgs, filterRole, searchQuery])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const orgIds = allOrgs.map((org) => org.id)
      const response = await organizationApis.retrieveOrganizationUser(orgIds)
      const standardizedOrgs = (response.results || []).map((org) => standardizeOrganization(org, 'ORGANIZATION'))
      const sortedResults = standardizedOrgs.sort((a, b) => b.displayName.localeCompare(a.displayName))
      setAllOrgs(sortedResults)
    } catch (error) {
      console.error('Error retrieving organization:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinLeaveClick = async (row) => {
    const role = (row.roleName || '').toLowerCase()
    const isMemberOrAdmin = role === 'admin' || role === 'member'
    setSelectedRow(row)
    if (isMemberOrAdmin) {
      setIsProcessing(true)
      try {
        await organizationApis.withdraw({ id: row.id, userId })
      } catch (error) {
        console.error('Failed to leave:', error)
      } finally {
        setIsProcessing(false)
        setSelectedRow(null)
        await fetchData()
      }
    } else {
      setIsJoinConfirmModalOpen(true)
    }
  }

  const confirmJoin = async () => {
    setIsProcessing(true)
    try {
      await organizationApis.requestJoin({ id: selectedRow.id, userId })
    } catch (error) {
      console.error('Failed to join:', error)
    } finally {
      setIsProcessing(false)
      setIsJoinConfirmModalOpen(false)
      setSelectedRow(null)
      await fetchData()
    }
  }

  const columns = [
    {
      name: t('organizationName'),
      selector: (row) => row.displayName,
      cell: (row) => (
        <Button as="NavLink" to={`/ota/organization/detail/${row.id}`} theme="link">
          {row.displayName}
        </Button>
      ),
      sortable: 'true'
    },
    {
      name: t('memo'),
      selector: (row) => row.memo,
      sortable: 'true'
    },
    {
      name: t('role'),
      selector: (row) => (row.roleName === 'Admin' ? t('admin') : t('member')),
      sortable: 'true'
    },
    {
      name: t('join'),
      cell: (row) => {
        const role = (row.roleName || '').toLowerCase()

        return (
          role !== 'admin' && (
            <Button variant="outlined" theme={'primary'} onClick={() => handleJoinLeaveClick(row)}>
              {t(role === 'member' ? 'leave' : 'join')}
            </Button>
          )
        )
      },
      center: 'true'
    },
    {
      name: t('date'),
      selector: (row) => (row.createdAt ? convertDateToString(row.createdAt) : '-'),
      sortable: 'true'
    }
  ]

  useEffect(() => {
    if (company?.orgLinkage) {
      setForcedNone(true)
      fetchData()
      return () => {
        setForcedNone(false)
      }
    }
  }, [company?.orgLinkage, setForcedNone])

  return (
    <StyledPageContent className="column">
      <Title>{t('organizationTitle')}</Title>
      <OrganizationSelector disabled={company?.orgLinkage} allToTop={false} />
      <Section>
        <HeaderTitleGroup>
          <Dropdown
            size="lg"
            minWidth="180px"
            defaultValue={filterRole}
            options={roleOptions}
            onChange={handleFilterChange}
          />
          <SearchContainer>
            <Search
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder') || 'Search...'}
            />
          </SearchContainer>
          {!company?.orgLinkage && (
            <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
              <Button variant="contained" onClick={handleCreate}>
                {t('create')}
              </Button>
            </ButtonWrap>
          )}
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>개수 : {filteredData.length}</div>
        {!isLoading && filteredData.length === 0 ? (
          <NoData>{tCommon('noData')}</NoData>
        ) : (
          <Suspense fallback={<div>Loading...</div>}>
            <Table
              columns={columns}
              data={filteredData}
              noData={tCommon('noData')}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
            />
          </Suspense>
        )}
      </Section>
      <Modal
        isOpen={isJoinConfirmModalOpen}
        title={t('join')}
        size="xs"
        onClose={() => setIsJoinConfirmModalOpen(false)}
        renderButtonComponent={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
            <Button variant="contained" theme="primary" onClick={confirmJoin}>
              {t('confirm')}
            </Button>
            <Button variant="outlined" theme="primary" onClick={() => setIsJoinConfirmModalOpen(false)}>
              {t('cancel')}
            </Button>
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {t('joinConfirm', { orgDisplayName: selectedRow?.displayName })}
        </div>
      </Modal>

      <Modal isOpen={isProcessing} size="xs">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <ClipLoader color={'#36d7b7'} loading={true} size={50} />
          <div style={{ marginTop: '20px' }}>{t('processing')}</div>
        </div>
      </Modal>
    </StyledPageContent>
  )
}

export default Organization
