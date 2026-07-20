import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { SectionRobot, Dropdown, Search, SearchContainer, HeaderTitleGroup, Button, Table } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@repo/stores'
import { authApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'
import { ManageActions, ApproveButton, RejectButton, ReApproveButton } from '../styles'
import { toast } from 'react-toastify'
import { allRoles } from '@/utils/roleUtils'

const ALLVALUE = 'all'

const PermissionApproval = () => {
  const { t } = useTranslation('robot')
  const { t: tCommon } = useTranslation('common')
  const { session } = useUserStore()

  const [filterRole, setFilterRole] = useState(ALLVALUE)
  const [searchQuery, setSearchQuery] = useState('')
  const [requests, setRequests] = useState([])
  const [filteredRequests, setFilteredRequests] = useState([])

  const roleOptions = useMemo(() => {
    return [
      { value: ALLVALUE, name: t('totalRole') },
      ...allRoles
        .filter((r) => (r.userLevel ?? Infinity) <= session.userLevel)
        .map((r) => ({ value: r.value, name: t(r.roleName) }))
    ]
  }, [allRoles, t])

  function setTableList(tList) {
    let loopList = []
    for (var i = 0; i < tList.length; i++) {
      tList[i].createdAt = toYmdHmKST(tList[i].createdAt)
      loopList.push(tList[i])
    }

    setFilteredRequests(loopList)
  }

  const loadUserList = useCallback(async (searchParams = {}) => {
    try {
      const data = await authApis.getSignupRequests({})
      setRequests(data.content)
      setTableList(data.content)
    } catch (err) {
      console.error('Error useCallback:', err)
    } finally {
    }
  }, [])

  useEffect(() => {
    loadUserList()
  }, [])

  const handleFilterChange = (value) => {
    setFilterRole(value)
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const approveUser = useCallback(async (temporaryUserId, params) => {
    try {
      const response = await authApis.approveSignupRequest(temporaryUserId, params)

      if (response || response == '') {
        toast.success(t('approveUser'), { autoClose: 2000 })
      }
    } catch (err) {
      console.error('Error useCallback:', err)
      toast.error(t('errorReport'), { autoClose: 2000 })
    } finally {
      loadUserList()
    }
  }, [])

  const rejectUser = useCallback(async (temporaryUserId, params) => {
    try {
      const response = await authApis.rejectSignupRequest(temporaryUserId, params)

      if (response || response == '') {
        toast.success(t('rejectUser'), { autoClose: 2000 })
      }
    } catch (err) {
      console.error('Error useCallback:', err)
      toast.error(t('errorReport'), { autoClose: 2000 })
    } finally {
      loadUserList()
    }
  }, [])

  const handleApprove = (temporaryUserId, userEmail) => {
    let params = {
      userEmail: userEmail,
      reviewerEmail: session?.email,
      reason: 'approve'
    }
    approveUser(temporaryUserId, params)
  }

  const handleReject = (temporaryUserId, userEmail) => {
    let params = {
      userEmail: userEmail,
      reviewerEmail: session?.email,
      reason: 'reject'
    }
    rejectUser(temporaryUserId, params)
  }

  useEffect(() => {
    filterTableList()
  }, [filterRole, searchQuery])

  function filterTableList() {
    const filteredList = requests.filter((r) => {
      const matchRole = !filterRole ? true : filterRole === ALLVALUE ? true : r.userRole === filterRole
      const matchSearch =
        !searchQuery ||
        (r.userEmail &&
          r.userNickname &&
          (r.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.userNickname.toLowerCase().includes(searchQuery.toLowerCase())))

      return matchRole && matchSearch
    })

    setTableList(filteredList)
  }

  const columns = [
    {
      name: t('accountEmail'),
      selector: (row) => row.userEmail,
      sortable: true,
      width: '15%'
    },
    {
      name: t('nickname'),
      selector: (row) => (row.userNickname ? row.userNickname : ''),
      sortable: true
    },
    {
      name: t('role'),
      selector: (row) => row.userRole,
      sortable: true
    },
    {
      name: t('assignGroup'),
      selector: (row) => row.groupName,
      sortable: true
    },
    {
      name: t('assignSite'),
      selector: (row) => (row.siteName ? row.siteName : ''),
      sortable: true
    },
    {
      name: t('requestDate'),
      selector: (row) => (row.createdAt ? row.createdAt : ''),
      sortable: true
    },
    {
      name: t('management'),
      cell: (row) => {
        const PrimaryButton = row.isApproving === true ? ReApproveButton : ApproveButton
        return (
          <ManageActions>
            <PrimaryButton type="button" onClick={() => handleApprove(row.temporaryUserId, row.userEmail)}>
              {row.isApproving === true ? t('reapprove') : t('approve')}
            </PrimaryButton>

            <RejectButton type="button" onClick={() => handleReject(row.temporaryUserId, row.userEmail)}>
              {t('reject')}
            </RejectButton>
          </ManageActions>
        )
      },
      sortable: false
    }
  ]

  return (
    <>
      <SectionRobot>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder') || 'Search...'}
            />
          </SearchContainer>
          <Dropdown
            size="lg"
            minWidth="180px"
            defaultValue={filterRole}
            options={roleOptions}
            onChange={handleFilterChange}
          />
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {t('count')} : {filteredRequests.length}
        </div>

        <Table
          columns={columns}
          data={filteredRequests}
          noData={tCommon('noData')}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </SectionRobot>
    </>
  )
}

export default PermissionApproval
