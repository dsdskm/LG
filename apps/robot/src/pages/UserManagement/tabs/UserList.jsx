import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { SectionRobot, Dropdown, Search, SearchContainer, HeaderTitleGroup, Button, Table, Modal } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@repo/stores'
import { userApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'
import { ManageActions, SuspendButton, EditButton, DeleteButton } from '../styles'
import { allRoles, getUserLevelByuserRole, allUserStatus } from '@/utils/roleUtils'
import ModalModifyUser from '../modal/ModalEditUser'
import ModalDeleteUser from '../modal/ModalDeleteUser'
import { useModalState } from '@repo/hooks'

const ALLVALUE = 'all'

const UserList = () => {
  const { t } = useTranslation('robot')
  const { t: tCommon } = useTranslation('common')
  const { session } = useUserStore()

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [userId, setUserId] = useState('')
  const [userInfo, setUserInfo] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  const [confirmMessage, setConfirmMessage] = useState('')

  function setTableList(tList) {
    let loopList = []
    for (var i = 0; i < tList.length; i++) {
      //userLevel이 더 높은 계정은 리스트에서 제외
      if (getUserLevelByuserRole(tList[i].userRole) > session.userLevel) {
        continue
      }
      tList[i].createdAt = toYmdHmKST(tList[i].createdAt)
      loopList.push(tList[i])
    }

    setFilteredUsers(loopList)
  }

  const loadUserList = useCallback(async () => {
    try {
      let page = 0
      let allContent = []
      let hasNext = true

      while (hasNext) {
        const data = await userApis.getUsers({ page })
        allContent = allContent.concat(data.content)
        hasNext = data.hasNext
        page += 1
      }

      setUsers(allContent)
      setTableList(allContent)
    } catch (err) {
      console.error('Error useCallback:', err)
    }
  }, [])

  useEffect(() => {
    loadUserList()
  }, [])

  const handleStatusChange = (value) => {
    setFilterStatus(value)
  }

  const handleRoleChange = (value) => {
    setFilterRole(value)
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleSuspend = (temporaryUserId, userEmail) => {
    let params = {
      userEmail: userEmail,
      reviewerEmail: session?.email,
      reason: 'approve'
    }
    approveUser(temporaryUserId, params)
  }

  const handleDelete = (temporaryUserId, userEmail) => {
    let params = {
      userEmail: userEmail,
      reviewerEmail: session?.email,
      reason: 'reject'
    }
    rejectUser(temporaryUserId, params)
  }

  const EditUserModal = useModalState()

  const openModalEditUser = (_userId, jsonUserInfo) => {
    setUserId(_userId)
    setUserInfo(jsonUserInfo)
    EditUserModal.onOpen()
  }

  const conformModalEditUser = (resultYN) => {
    EditUserModal.onClose()
    setConfirmMessage(resultYN ? t('modifyUserInfo') : t('errorReport'))
    setIsConfirmModalOpen(true)
  }

  const conformModal = () => {
    setIsConfirmModalOpen(false)
    loadUserList()
  }

  const DeleteUserModal = useModalState()

  const openModalDeleteUser = (_userId, _userEmail) => {
    setUserId(_userId)
    setUserEmail(_userEmail)
    DeleteUserModal.onOpen()
  }

  const conformModalDeleteUser = (resultYN) => {
    DeleteUserModal.onClose()
    setConfirmMessage(resultYN ? t('deleteAccount') : t('errorReport'))
    setIsConfirmModalOpen(true)
  }

  useEffect(() => {
    filterTableList()
  }, [filterStatus, filterRole, searchQuery])

  function filterTableList() {
    const filteredList = users.filter((r) => {
      const matchRole = !filterRole ? true : filterRole === ALLVALUE ? true : r.userRole === filterRole
      const matchStatus = !filterStatus ? true : filterStatus === ALLVALUE ? true : r.userStatus === filterStatus
      const matchSearchEmail =
        !searchQuery || (r.userEmail && r.userEmail.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchSearchNick =
        !searchQuery || (r.userNickname && r.userNickname.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchRole && matchStatus && (matchSearchEmail || matchSearchNick)
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
      name: t('state'),
      selector: (row) => (row.userStatus ? row.userStatus : ''),
      sortable: true
    },
    {
      name: t('joinDate'),
      selector: (row) => row.createdAt,
      sortable: true
    },
    {
      name: t('approver'),
      selector: (row) => (row.requestedAt ? row.requestedAt : ''),
      sortable: true
    },
    {
      name: t('management'),
      cell: (row) => {
        const isEditDisable = getUserLevelByuserRole(row.userRole) > 1 ? true : false
        const jsonUserInfo = {
          userRole: row.userRole,
          groupId: row.groupId,
          siteId: row.siteId
        }
        return (
          <ManageActions>
            {/*정지기능 API 준비 안*/}
            <SuspendButton type="button" disabled={true} onClick={() => handleSuspend(row.userId, row.userEmail)}>
              {t('suspend')}
            </SuspendButton>
            <EditButton
              type="button"
              disabled={isEditDisable}
              onClick={() => openModalEditUser(row.userId, jsonUserInfo)}
            >
              {t('modify')}
            </EditButton>
            <DeleteButton type="button" onClick={() => openModalDeleteUser(row.userId, row.userEmail)}>
              {t('delete')}
            </DeleteButton>
          </ManageActions>
        )
      },
      sortable: false
    }
  ]

  const statusOptions = useMemo(() => {
    return [
      { value: ALLVALUE, name: t('totalState') },
      ...allUserStatus.map((r) => ({ value: r.value, name: t(r.statusName) }))
    ]
  }, [allUserStatus, t])

  const roleOptions = useMemo(() => {
    return [
      { value: ALLVALUE, name: t('totalRole') },
      ...allRoles
        .filter((r) => (r.userLevel ?? Infinity) <= session.userLevel)
        .map((r) => ({ value: r.value, name: t(r.roleName) }))
    ]
  }, [allRoles, t])

  return (
    <>
      <SectionRobot style={{ maxWidth: '1600px' }}>
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
            defaultValue={filterStatus}
            options={statusOptions}
            onChange={handleStatusChange}
          />
          <Dropdown
            size="lg"
            minWidth="180px"
            defaultValue={filterRole}
            options={roleOptions}
            onChange={handleRoleChange}
          />
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {t('count')} : {filteredUsers.length}
        </div>

        <Table
          columns={columns}
          data={filteredUsers}
          noData={tCommon('noData')}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </SectionRobot>
      <ModalModifyUser
        isOpen={EditUserModal.isOpen}
        onClose={EditUserModal.onClose}
        onConfirm={conformModalEditUser}
        t={t}
        userId={userId}
        userInfo={userInfo}
      />
      <ModalDeleteUser
        isOpen={DeleteUserModal.isOpen}
        onClose={DeleteUserModal.onClose}
        onConfirm={conformModalDeleteUser}
        t={t}
        userId={userId}
        userEmail={userEmail}
      />

      <Modal
        isOpen={isConfirmModalOpen}
        size="xs"
        onClose={() => setIsConfirmModalOpen(false)}
        renderButtonComponent={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
            <Button variant="contained" theme="primary" onClick={conformModal}>
              {t('confirm')}
            </Button>
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p className="typographyBody2" style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>
            {confirmMessage}
          </p>
        </div>
      </Modal>
    </>
  )
}

export default UserList
