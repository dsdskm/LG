import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  Search,
  Section,
  HeaderTitleGroup,
  SearchContainer,
  ToggleSwitch,
  Title,
  StyledPageContent,
  Modal,
  TableLoading,
  OrganizationSelector
} from '@repo/ui'
import { convertDateToString } from '@repo/utils'
import { roleApis } from '@/apis'
import { ClipLoader } from 'react-spinners'

const RoleToggle = ({ row, onChange }) => {
  const isChecked = row.reason === 'admin'
  const toggleText = isChecked ? 'Admin' : 'Member'

  const handleChange = (e) => {
    onChange(row, e.target.checked)
  }

  return <ToggleSwitch checked={isChecked} onChange={handleChange} label={toggleText} />
}

const Role = () => {
  const { t } = useTranslation('management')
  const { t: tCampaign } = useTranslation('campaign')
  const { t: tCommon } = useTranslation('common')

  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [userIdSearch, setUserIdSearch] = useState('')
  const [selectedOrgIds, setSelectedOrgIds] = useState([])
  const [processingRole, setProcessingRole] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const response = await roleApis.retrieveUsers(selectedOrgIds.length > 0 ? selectedOrgIds : undefined)
        const rawData = response.results || []
        const flattened = []
        rawData.forEach((org) => {
          if (org.users && Array.isArray(org.users)) {
            org.users.forEach((user) => {
              flattened.push({
                ...user,
                organization: org,
                joinedAt: org.joinedAt,
                // Assign mapping for the toggle component
                reason: user.roleName || user.reason
              })
            })
          }
        })
        setData(flattened)
      } catch (error) {
        console.error('Failed to fetch roles:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [selectedOrgIds])

  const handleOrgChange = ({ actualOrgs }) => {
    const ids = actualOrgs.map((org) => org.id)
    setSelectedOrgIds(ids)
  }

  const handleToggleChange = async (row, isChecked) => {
    const newRole = isChecked ? 'admin' : 'member'
    setProcessingRole({ row, newRole })
    try {
      const response = await roleApis.updateUserRole({ userId: row.id, orgId: row.organization.id, roleName: newRole })
      setData((prevData) =>
        prevData.map((item) => {
          if (item.id === row.id && item.organization.id === row.organization.id) {
            return { ...item, reason: newRole, roleName: newRole }
          }
          return item
        })
      )
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setProcessingRole(null)
    }
  }

  const filteredData = useMemo(() => {
    let filtered = data
    if (selectedOrgIds.length > 0) {
      filtered = filtered.filter((item) => selectedOrgIds.includes(item.organization?.id))
    }
    if (userIdSearch) {
      filtered = filtered.filter((item) => (item.userId || '').toLowerCase().includes(userIdSearch.toLowerCase()))
    }
    return filtered
  }, [data, userIdSearch, selectedOrgIds])

  const columns = [
    {
      name: tCampaign('organization'),
      selector: (row) => row.organization?.displayName,
      sortable: 'true'
    },
    {
      name: t('user'),
      // The user wants key: users[i].id -> we map this to row.id since row represents users[i]
      selector: (row) => row.id,
      cell: (row) => row.userId || row.id,
      sortable: 'true'
    },
    {
      name: t('role'),
      cell: (row) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <RoleToggle row={row} onChange={handleToggleChange} />
        </div>
      ),
      sortable: 'true',
      sortFunction: (rowA, rowB) => {
        const a = rowA.reason || ''
        const b = rowB.reason || ''
        return a.localeCompare(b)
      }
    },
    {
      name: t('joinedDate'),
      selector: (row) => convertDateToString(row.joinedAt),
      sortable: 'true'
    }
  ]

  return (
    <StyledPageContent className="column">
      <Title>{t('roleTitle')}</Title>
      <OrganizationSelector onChange={handleOrgChange} allToTop={false} />
      <Section>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              placeholder={t('searchPlaceholder') || 'Search placeholder'}
              value={userIdSearch}
              onChange={(e) => setUserIdSearch(e.target.value)}
            />
          </SearchContainer>
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count')} : {filteredData.length}
        </div>
        {isLoading ? <TableLoading /> : <Table columns={columns} data={filteredData} noData={tCommon('noData')} />}

        {/* Loading Modal for Role Processing */}
        <Modal isOpen={!!processingRole} size="xs">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <ClipLoader color={'#36d7b7'} loading={true} size={50} />
            <div style={{ marginTop: '20px' }}>
              {processingRole
                ? t('changingRole', {
                    user: processingRole.row.userId || processingRole.row.id,
                    organization: processingRole.row.organization?.displayName || '',
                    role: processingRole.newRole === 'admin' ? t('admin') : t('member'),
                    defaultValue: `${processingRole.row.userId || processingRole.row.id}의 ${processingRole.row.organization?.displayName || ''}의 권한을 ${processingRole.newRole === 'admin' ? '관리자' : '멤버'}로 변경 중입니다.`
                  })
                : ''}
            </div>
          </div>
        </Modal>
      </Section>
    </StyledPageContent>
  )
}

export default Role
