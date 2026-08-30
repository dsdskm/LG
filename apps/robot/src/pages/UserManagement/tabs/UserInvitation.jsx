import React, { useState, useEffect, useCallback } from 'react'
import { StyleSheetManager } from 'styled-components'
import { SectionRobot, HeaderTitleGroup, Button, Table, Modal } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@repo/stores'
import { invitationApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'
import { useModalState } from '@repo/hooks'
import { ManageActions, DeleteButton } from '../styles'
import ModalInviteUser from '../modal/ModalInviteUser'

const ALLVALUE = 'all'

// react-data-table-component v7 이 컬럼 옵션(grow, minWidth 등)을 styled-components v6 로
// 그대로(비표준 prop) 흘려보내 "unknown prop" 콘솔 워닝이 발생한다.
// DOM 으로 넘기면 안 되는 RDT 전용 prop 을 차단해 워닝을 제거한다.
const RDT_NON_DOM_PROPS = new Set([
  'grow',
  'button',
  'center',
  'compact',
  'hide',
  'right',
  'allowOverflow',
  'minWidth',
  'maxWidth'
])
const shouldForwardProp = (prop) => !RDT_NON_DOM_PROPS.has(prop)

const UserInvitation = () => {
  const { t } = useTranslation('robot')
  const { t: tCommon } = useTranslation('common')
  const { session } = useUserStore()

  const [filteredUsers, setFilteredUsers] = useState([])
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')

  const loadInvitationList = useCallback(async (searchParams = {}) => {
    try {
      const data = await invitationApis.getInvitations({})
      setFilteredUsers(data.content)
    } catch (err) {
      console.error('Error useCallback:', err)
    } finally {
    }
  }, [])

  useEffect(() => {
    loadInvitationList()
  }, [])

  const InviteUserModal = useModalState()

  const conformModalInviteUser = () => {
    // 초대 API 성공 후처리: 초대 모달 닫고 완료 팝업 노출
    InviteUserModal.onClose()
    setConfirmMessage(t('invEmailSent'))
    setIsConfirmModalOpen(true)
  }

  const conformModal = () => {
    setIsConfirmModalOpen(false)
    loadInvitationList()
  }

  // 초대 상태 판정 (우선순위: 가입 완료 > 취소됨 > 만료됨 > 대기 중)
  // ※ API 응답의 취소 필드가 icCanceled 로 내려오는 케이스가 있어 isCanceled 와 함께 방어적으로 확인
  const getInvitationStatus = (row) => {
    if (row.isAccepted) return t('invStatusAccepted')
    if (row.isCanceled ?? row.icCanceled) return t('invStatusCanceled')
    if (row.expiredAt && new Date(row.expiredAt).getTime() < Date.now()) return t('invStatusExpired')
    return t('invStatusWaiting')
  }

  // 초대 취소 API 연동: 성공 시 완료 팝업 노출 후 목록 갱신
  const handleCancelInvitation = async (invitationId) => {
    try {
      await invitationApis.cancelInvitations(invitationId, {})
      setConfirmMessage(t('invCanceled'))
      setIsConfirmModalOpen(true)
    } catch (err) {
      console.error('Error cancelInvitation:', err)
    }
  }

  const columns = [
    {
      name: t('accountEmail'),
      selector: (row) => row.inviteeUserEmail,
      // 계정(이메일)에 마우스를 올리면 초대 사유 툴팁 노출
      cell: (row) => (
        <span title={`${t('inviteReason')} : ${row.invitationReason ?? '-'}`}>{row.inviteeUserEmail}</span>
      ),
      grow: 2,
      sortable: true
    },
    {
      name: t('role'),
      selector: (row) => row.userRole,
      grow: 1,
      sortable: true
    },
    {
      name: t('assignGroup'),
      selector: (row) => (row.groupName ? row.groupName : '-'),
      grow: 1,
      sortable: true
    },
    {
      name: t('assignSite'),
      selector: (row) => (row.siteName ? row.siteName : '-'),
      grow: 1,
      sortable: true
    },
    {
      name: t('state'),
      selector: (row) => getInvitationStatus(row),
      grow: 0.6,
      sortable: true
    },
    {
      name: t('inviter'),
      selector: (row) => (row.inviterUserNickname ? row.inviterUserNickname : '-'),
      grow: 1,
      sortable: true
    },
    {
      name: t('joinDate'),
      selector: (row) => (row.createdAt ? toYmdHmKST(row.createdAt) : '-'),
      grow: 1,
      sortable: true
    },
    {
      name: t('management'),
      cell: (row) => {
        // 대기 중 상태에서만 취소 가능
        const cancelable = getInvitationStatus(row) === t('invStatusWaiting')
        return (
          <ManageActions>
            <DeleteButton type="button" disabled={!cancelable} onClick={() => handleCancelInvitation(row.invitationId)}>
              {t('cancel')}
            </DeleteButton>
          </ManageActions>
        )
      },
      grow: 0.6,
      sortable: false,
      minWidth: '85px'
    }
  ]

  return (
    <>
      <SectionRobot style={{ maxWidth: '1600px' }}>
        <HeaderTitleGroup>
          <div className="alignRight" style={{ marginBottom: '0', minWidth: '90px', marginLeft: 'auto' }}>
            <Button onClick={InviteUserModal.onOpen}>{t('invNew')}</Button>
          </div>
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {t('count')} : {filteredUsers.length}
        </div>

        <StyleSheetManager shouldForwardProp={shouldForwardProp}>
          <Table
            columns={columns}
            data={filteredUsers}
            noData={tCommon('noData')}
            pagination
            paginationRowsPerPageOptions={[10, 30, 50, 100]}
          />
        </StyleSheetManager>
      </SectionRobot>

      <ModalInviteUser
        isOpen={InviteUserModal.isOpen}
        onClose={InviteUserModal.onClose}
        onConfirm={conformModalInviteUser}
        t={t}
      />
      <Modal
        isOpen={isConfirmModalOpen}
        size="xs"
        onClose={() => setIsConfirmModalOpen(false)}
        renderButtonComponent={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
            <Button theme="primary" onClick={conformModal}>
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

export default UserInvitation
