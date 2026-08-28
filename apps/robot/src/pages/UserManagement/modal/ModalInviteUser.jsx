import { useEffect, useState, useMemo, useCallback } from 'react'
import { Modal, ModalButton, Dropdown, Input, Textarea } from '@repo/ui'
import { useForm } from 'react-hook-form'
import { groupApis, siteApis, invitationApis } from '@/apis'
import { allRoles, getUserLevelByuserRole } from '@/utils/roleUtils'
import { useUserStore } from '@repo/stores'

const EMPTYVALUE = ''
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 초대 모달에 노출되는 역할 순서 (userLevel과 무관하게 사이트 관리자 ~ 그룹 관리자 사이에 설치 관리자 배치)
const ROLE_DISPLAY_ORDER = ['SITE_MANAGER', 'INSTALL_MANAGER', 'GROUP_MANAGER', 'SYSTEM_MANAGER', 'SYSTEM_ADMIN', 'TERM_MANAGER']

const ModalInviteUser = ({ isOpen, t, onClose, onConfirm }) => {
  const { handleSubmit } = useForm({ mode: 'onChange' })
  const { session } = useUserStore()

  const [filterRole, setFilterRole] = useState(EMPTYVALUE)
  const [filterGroup, setFilterGroup] = useState(EMPTYVALUE)
  const [filterSite, setFilterSite] = useState(EMPTYVALUE)
  const [userEmail, setUserEmail] = useState('')
  const [inviteReason, setInviteReason] = useState('')
  const [groupsSites, setGroupsSites] = useState([])
  const [siteOptions, setSiteOptions] = useState([])
  const [emailError, setEmailError] = useState(false)

  const roleOptions = useMemo(() => {
    // 세션 사용자 역할 기준으로 초대 가능한 역할만 노출 (최대 SYSTEM_MANAGER 레벨까지)
    const sessionLevel = getUserLevelByuserRole(session?.userRole) ?? -1
    const maxLevel = Math.min(sessionLevel, 2)
    const isSystemAdmin = session?.userRole === 'SYSTEM_ADMIN'

    return allRoles
      .filter((r) => {
        // TERM_MANAGER는 SYSTEM_ADMIN일 때만 노출
        if (r.value === 'TERM_MANAGER') return isSystemAdmin
        // INSTALL_MANAGER는 그룹 관리자 이상(자기 그룹 대상)만 초대 가능
        if (r.value === 'INSTALL_MANAGER') return sessionLevel >= 1
        return (r.userLevel ?? Infinity) <= maxLevel
      })
      .sort((a, b) => ROLE_DISPLAY_ORDER.indexOf(a.value) - ROLE_DISPLAY_ORDER.indexOf(b.value)) // SITE_MANAGER → INSTALL_MANAGER → GROUP_MANAGER → SYSTEM_MANAGER → SYSTEM_ADMIN → TERM_MANAGER 순
      .map((r) => ({ value: r.value, name: t(r.roleName) }))
  }, [session?.userRole, t])

  const groupOptions = useMemo(() => {
    return groupsSites.map((r) => ({ value: r.value, name: r.name }))
  }, [groupsSites])

  // 선택한 역할에 따른 그룹/사이트 노출 여부
  // 사이트 관리자(level 0): 그룹 + 사이트 / 그룹 관리자(level 1), 설치 관리자: 그룹만 / 그 이상: 노출 안 함
  const selectedLevel = getUserLevelByuserRole(filterRole)
  const showGroup = selectedLevel === 0 || selectedLevel === 1 || filterRole === 'INSTALL_MANAGER'
  const showSite = selectedLevel === 0

  // 저장 버튼 활성화 조건: 노출된 Select 를 모두 선택하고 이메일 형식이 유효할 때
  const isBtnValid = useMemo(() => {
    if (!filterRole) return false
    if (showGroup && !filterGroup) return false
    if (showSite && !filterSite) return false
    if (!EMAIL_REGEX.test(userEmail)) return false
    return true
  }, [filterRole, showGroup, showSite, filterGroup, filterSite, userEmail])

  useEffect(() => {
    if (isOpen) {
      setFilterRole(EMPTYVALUE)
      setFilterGroup(EMPTYVALUE)
      setFilterSite(EMPTYVALUE)
      setUserEmail('')
      setInviteReason('')
      setSiteOptions([])
      setEmailError(false)
      loadGetGroupsSites()
    }
  }, [isOpen])

  const loadGetGroupsSites = useCallback(async () => {
    try {
      const data = await groupApis.getGroups({})
      const dataGroups = data.content

      const data2 = await siteApis.getSites({})
      const dataSites = data2.content

      let _groupsSites = []
      for (let i = 0; i < dataGroups.length; i++) {
        let tempGroup = {}
        tempGroup.value = dataGroups[i].groupId
        tempGroup.name = dataGroups[i].groupName
        let _sites = []
        for (let j = 0; j < dataSites.length; j++) {
          if (dataSites[j].groupId == dataGroups[i].groupId) {
            _sites.push({ value: dataSites[j].siteId, name: dataSites[j].siteName })
          }
        }
        tempGroup.sites = _sites
        _groupsSites.push(tempGroup)
      }
      setGroupsSites(_groupsSites)
    } catch (err) {
      console.error('Error loadGetGroupsSites:', err)
    }
  }, [])

  const getSite = (groupId) => {
    let _sites = []
    groupsSites.map((r) => {
      if (r.value == groupId) {
        _sites = r.sites
      }
    })
    return _sites
  }

  const handleRoleChange = (value) => {
    setFilterRole(value)
    // 역할 변경 시 그룹/사이트 선택 초기화
    setFilterGroup(EMPTYVALUE)
    setFilterSite(EMPTYVALUE)
    setSiteOptions([])
  }

  const handleGroupChange = (value) => {
    setFilterGroup(value)
    setFilterSite(EMPTYVALUE)
    setSiteOptions(getSite(value))
  }

  const handleSiteChange = (value) => {
    setFilterSite(value)
  }

  const onSubmit = async () => {
    if (!isBtnValid) return
    try {
      const payload = {
        userRole: filterRole,
        inviteeUserEmail: userEmail,
        inviterUserId: session?.userId,
        invitationReason: inviteReason
      }
      // groupId, siteId 는 노출될 때만 포함하는 optional 값
      if (showGroup) payload.groupId = filterGroup
      if (showSite) payload.siteId = filterSite

      await invitationApis.postInvitations(payload)
      onConfirm?.(payload)
    } catch (err) {
      // 이미 사용 중인 이메일(USER_40901)인 경우 이메일 입력창 아래 에러 노출
      if (err?.response?.data?.errorCode === 'USER_40901') {
        setEmailError(true)
      } else {
        console.error('Error postInvitations:', err)
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={t('inviteUser')}
      onClose={onClose}
      closeButton
      renderButtonComponent={
        <>
          <ModalButton onClick={onClose}>{t('cancel')}</ModalButton>
          <ModalButton onClick={handleSubmit(onSubmit)} theme="primary" disabled={!isBtnValid}>
            {t('save')}
          </ModalButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ maxHeight: '500px', marginLeft: '1rem' }}>
          <div>
            <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
              {t('userRole')}
            </p>
            <Dropdown
              size="lg"
              minWidth="300px"
              placeholder={t('selectUserRole')}
              value={filterRole}
              options={roleOptions}
              onChange={handleRoleChange}
            />
          </div>

          {showGroup && (
            <div style={{ marginTop: '1.6rem' }}>
              <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {t('group')}
              </p>
              <Dropdown
                size="lg"
                minWidth="300px"
                placeholder={t('selectGroup')}
                value={filterGroup}
                options={groupOptions}
                onChange={handleGroupChange}
              />
            </div>
          )}

          {showSite && (
            <div style={{ marginTop: '1.6rem' }}>
              <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {t('site')}
              </p>
              <Dropdown
                size="lg"
                minWidth="300px"
                placeholder={t('selectSite')}
                value={filterSite}
                options={siteOptions}
                onChange={handleSiteChange}
              />
            </div>
          )}

          <div style={{ marginTop: '1.6rem' }}>
            <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
              {t('userEmail')}
            </p>
            <Input
              type="text"
              size="md"
              placeholder={t('inputUserEmail')}
              value={userEmail}
              onChange={(e) => {
                setUserEmail(e.target.value)
                setEmailError(false)
              }}
              isError={emailError}
              message={emailError ? t('emailInUse') : undefined}
            />
          </div>

          <div style={{ marginTop: '1.6rem' }}>
            <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
              {t('inviteReason')}
            </p>
            <Textarea placeholder={t('inputInviteReason')} onChange={(e) => setInviteReason(e.target.value)}></Textarea>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default ModalInviteUser
