import { createPortal } from 'react-dom'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Tooltip } from 'react-tooltip'
import { format } from 'date-fns'
import { toast } from 'react-toastify'
import { useUserStore, useSideBarStore, useResponsiveStore } from '@repo/stores'
import { getUserInfo, patchUserInfo, postUserPassword, deleteUser } from '@repo/apis'
import { validatePassword } from '@repo/utils'
import Icon from '../../../common/Icon'
import Button from '../../../common/Button'
import Input from '../../../common/Input'
import Tag from '../../../common/Tag'
import Modal from '../../../common/Modal'
import {
  StyledOverlay,
  StyledTopBar,
  StyledTitle,
  StyledCloseButton,
  StyledContent,
  StyledMainColumn,
  StyledSideColumn,
  StyledCard,
  StyledCardTitle,
  StyledField,
  StyledFieldLabel,
  StyledFieldActions,
  StyledIconAction,
  StyledInfoBox,
  StyledInfoRow,
  StyledInfoLabel,
  StyledInfoValue,
  StyledStatusValue,
  StyledPasswordFormSection,
  StyledPasswordActions,
  StyledActionItem,
  StyledPasswordActionItem,
  StyledActionTitle,
  StyledEditableInfo,
  StyledGuideButton
} from './styles'

const ROLE_KEYS = ['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'GROUP_MANAGER', 'SITE_MANAGER', 'TERM_MANAGER']

const MyProfileModal = ({ isOpen, onClose, onLogout }) => {
  const { t } = useTranslation('myProfile')
  const { pathname } = useLocation()
  const session = useUserStore((state) => state.session)
  const compactSideBar = useSideBarStore((state) => state.compactSideBar)
  const { responsiveMode } = useResponsiveStore()
  const sideBarWidth = responsiveMode === 'MOBILE' ? '0rem' : compactSideBar ? '8rem' : '24rem'

  const [profile, setProfile] = useState(null)
  const [nickname, setNickname] = useState('')
  const [draftNickname, setDraftNickname] = useState('')
  const [isEditingNickname, setIsEditingNickname] = useState(false)

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPasswordError, setNewPasswordError] = useState('')
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)

  const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState(false)
  const [isWithdrawDoneOpen, setIsWithdrawDoneOpen] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  const initialPathnameRef = useRef(null)

  useEffect(() => {
    if (isOpen && !initialPathnameRef.current) {
      initialPathnameRef.current = pathname
    } else if (!isOpen) {
      initialPathnameRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && initialPathnameRef.current && initialPathnameRef.current !== pathname) {
      onClose()
    }
  }, [pathname, isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !session?.userId || !session?.accessToken) return

    let ignore = false

    getUserInfo(session.userId, session.accessToken).then((data) => {
      if (ignore) return
      setProfile(data)
      setNickname(data?.userNickname ?? '')
    })

    return () => {
      ignore = true
    }
  }, [isOpen, session?.userId, session?.accessToken])

  if (!isOpen) return null

  const currentRole = profile?.userRole ?? session?.userRole
  const roleLabel = currentRole && ROLE_KEYS.includes(currentRole) ? t(`role.${currentRole}`) : t('empty')
  const isActive = profile?.userStatus === 'ACTIVE'
  const statusLabel = profile?.userStatus ? (isActive ? t('accountStatus.active') : profile.userStatus) : t('empty')
  const createdAtLabel = profile?.createdAt ? format(new Date(profile.createdAt), 'yyyy-MM-dd') : t('empty')

  const isNewPasswordValid = newPassword.length > 0 ? validatePassword(newPassword).isValid : false
  const isPasswordFormValid =
    currentPassword.length > 0 &&
    isNewPasswordValid &&
    confirmPassword === newPassword &&
    !newPasswordError &&
    currentPassword !== newPassword

  const handleStartEditNickname = () => {
    setDraftNickname(nickname)
    setIsEditingNickname(true)
  }

  const handleSaveNickname = async () => {
    try {
      await patchUserInfo(session.userId, session.accessToken, { userNickname: draftNickname })
      setNickname(draftNickname)
      setProfile((prev) => (prev ? { ...prev, userNickname: draftNickname } : prev))
      setIsEditingNickname(false)
      toast.success(t('basicInfo.nicknameSaved'), { autoClose: 2000 })
    } catch (error) {
      // 전역 에러 처리(useErrorStore)에서 처리됨
    }
  }

  const handleCancelEditNickname = () => {
    setIsEditingNickname(false)
  }

  const handleOpenChangePassword = () => {
    setIsChangingPassword(true)
  }

  const handlePasswordFieldFocus = (fieldName) => {
    if (fieldName === 'current') {
      setCurrentPassword('')
    } else if (fieldName === 'new') {
      setNewPassword('')
      setNewPasswordError('')
      setNewPasswordTouched(false)
    } else if (fieldName === 'confirm') {
      setConfirmPassword('')
    }
  }

  const handleCancelChangePassword = () => {
    setIsChangingPassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setNewPasswordError('')
    setNewPasswordTouched(false)
  }

  const handleNewPasswordChange = (value) => {
    setNewPassword(value)
  }

  const handleNewPasswordBlur = () => {
    setNewPasswordTouched(true)
    if (newPassword.length > 0) {
      if (newPassword === currentPassword) {
        setNewPasswordError(t('password.sameAsCurrentPassword'))
      } else {
        const { isValid } = validatePassword(newPassword)
        if (!isValid) {
          setNewPasswordError(t('password.invalid'))
        } else {
          setNewPasswordError('')
        }
      }
    } else {
      setNewPasswordError('')
    }
  }

  const handleSubmitChangePassword = async () => {
    try {
      await postUserPassword(session.userId, session.accessToken, {
        userId: session.userId,
        previousPassword: currentPassword,
        newPassword
      })
      handleCancelChangePassword()
      toast.success(t('password.changeSuccess'), { autoClose: 2000 })
    } catch (error) {
      const errorCode = error?.response?.data?.errorCode

      if (errorCode === 'ACCOUNT_AUTH_40001') {
        toast.error(t('password.currentPasswordInvalid'), { autoClose: 2000 })
      } else {
        toast.error(t('password.changeFailed'), { autoClose: 2000 })
      }
    }
  }

  const handleWithdraw = () => {
    setIsWithdrawConfirmOpen(true)
  }

  const handleCancelWithdraw = () => {
    setIsWithdrawConfirmOpen(false)
  }

  const handleConfirmWithdraw = async () => {
    setIsWithdrawing(true)

    try {
      await deleteUser(session.userId, session.accessToken)
      setIsWithdrawConfirmOpen(false)
      setIsWithdrawDoneOpen(true)
    } catch (error) {
      // 전역 에러 처리(useErrorStore)에서 처리됨
    } finally {
      setIsWithdrawing(false)
    }
  }

  const handleWithdrawDone = () => {
    setIsWithdrawDoneOpen(false)
    onLogout()
  }

  return createPortal(
    <StyledOverlay $sideBarWidth={sideBarWidth}>
      <StyledTopBar>
        <StyledTitle>{t('title')}</StyledTitle>
        <StyledCloseButton type="button" onClick={onClose}>
          <Icon name="close" size={18} />
          {t('close')}
        </StyledCloseButton>
      </StyledTopBar>

      <StyledContent>
        <StyledMainColumn>
          <StyledCard>
            <StyledCardTitle>{t('basicInfo.title')}</StyledCardTitle>

            <StyledInfoBox>
              <StyledInfoRow>
                <StyledInfoLabel>{t('basicInfo.email')}</StyledInfoLabel>
              <StyledEditableInfo>
                <input value={profile?.userEmail ?? session?.email ?? ''} readOnly />
              </StyledEditableInfo>
            </StyledInfoRow>

            <StyledInfoRow>
              <StyledInfoLabel>{t('basicInfo.nickname')}</StyledInfoLabel>
              <StyledEditableInfo>
                <input
                  value={isEditingNickname ? draftNickname : nickname}
                  onChange={(e) => setDraftNickname(e.target.value)}
                  readOnly={!isEditingNickname}
                  placeholder={t('basicInfo.nicknamePlaceholder')}
                  style={isEditingNickname ? {
                    border: '1px solid var(--color-neutral-20)',
                    background: 'var(--color-neutral-10)',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '0.4rem'
                  } : {}}
                />
                <StyledFieldActions>
                  {isEditingNickname ? (
                    <>
                      <StyledIconAction type="button" aria-label="save" onClick={handleSaveNickname}>
                        <Icon name="check" size={16} />
                      </StyledIconAction>
                      <StyledIconAction type="button" aria-label="cancel" onClick={handleCancelEditNickname}>
                        <Icon name="close" size={16} />
                      </StyledIconAction>
                    </>
                  ) : (
                    <StyledIconAction type="button" aria-label="edit" onClick={handleStartEditNickname}>
                      <Icon name="edit" size={16} />
                    </StyledIconAction>
                  )}
                </StyledFieldActions>
              </StyledEditableInfo>
            </StyledInfoRow>

            <StyledInfoRow>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <StyledInfoLabel>{t('roleInfo.role')}</StyledInfoLabel>
                <StyledGuideButton
                  type="button"
                  data-tooltip-id="roleGuide"
                  data-tooltip-content={t('roleInfo.guide')}
                >
                  <Icon name="info" size={16} />
                </StyledGuideButton>
              </div>
              <Tag theme="light">{roleLabel}</Tag>
            </StyledInfoRow>

            <StyledInfoRow>
              <StyledInfoLabel>{t('roleInfo.group')}</StyledInfoLabel>
              <StyledInfoValue>{profile?.groupName ?? t('empty')}</StyledInfoValue>
            </StyledInfoRow>
            <StyledInfoRow>
              <StyledInfoLabel>{t('roleInfo.site')}</StyledInfoLabel>
              <StyledInfoValue>{profile?.siteName ?? t('empty')}</StyledInfoValue>
            </StyledInfoRow>

            <StyledInfoRow>
              <StyledInfoLabel>{t('accountStatus.status')}</StyledInfoLabel>
              {isActive ? (
                <StyledStatusValue>{statusLabel}</StyledStatusValue>
              ) : (
                <StyledInfoValue>{statusLabel}</StyledInfoValue>
              )}
            </StyledInfoRow>
            <StyledInfoRow>
              <StyledInfoLabel>{t('accountStatus.createdAt')}</StyledInfoLabel>
              <StyledInfoValue>{createdAtLabel}</StyledInfoValue>
            </StyledInfoRow>
            </StyledInfoBox>
          </StyledCard>

          <StyledCard>
            <StyledCardTitle>{t('accountManagement.title')}</StyledCardTitle>

            <StyledPasswordActionItem
              onClick={isChangingPassword ? handleCancelChangePassword : handleOpenChangePassword}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <StyledActionTitle>{t('password.title')}</StyledActionTitle>
                <StyledGuideButton
                  type="button"
                  data-tooltip-id="passwordGuide"
                  data-tooltip-content={t('password.guide')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon name="info" size={16} />
                </StyledGuideButton>
              </div>
              {!isChangingPassword && (
                <StyledIconAction
                  type="button"
                  aria-label="expand"
                  style={{ marginLeft: 'auto', pointerEvents: 'auto' }}
                >
                  <Icon name="arrow_down" size={16} />
                </StyledIconAction>
              )}
            </StyledPasswordActionItem>

            {isChangingPassword && (
              <StyledPasswordFormSection>
                <StyledField>
                  <StyledFieldLabel>{t('password.current')}</StyledFieldLabel>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    onFocus={() => handlePasswordFieldFocus('current')}
                    placeholder={t('password.currentPlaceholder')}
                  />
                </StyledField>
                <StyledField>
                  <StyledFieldLabel>{t('password.new')}</StyledFieldLabel>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => handleNewPasswordChange(e.target.value)}
                    onBlur={handleNewPasswordBlur}
                    onFocus={() => handlePasswordFieldFocus('new')}
                    placeholder={t('password.newPlaceholder')}
                    isError={newPasswordTouched && newPassword.length > 0 && !isNewPasswordValid}
                    message={newPasswordTouched ? newPasswordError : ''}
                  />
                </StyledField>
                <StyledField>
                  <StyledFieldLabel>{t('password.confirm')}</StyledFieldLabel>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => handlePasswordFieldFocus('confirm')}
                    placeholder={t('password.confirmPlaceholder')}
                  />
                </StyledField>
                <StyledPasswordActions>
                  <Button theme="tertiary" onClick={handleCancelChangePassword}>
                    {t('password.cancel')}
                  </Button>
                  <Button disabled={!isPasswordFormValid} onClick={handleSubmitChangePassword}>
                    {t('password.submit')}
                  </Button>
                </StyledPasswordActions>
              </StyledPasswordFormSection>
            )}

            <StyledActionItem type="button" onClick={onLogout}>
              <div>
                <StyledActionTitle>{t('accountManagement.logout')}</StyledActionTitle>
              </div>
            </StyledActionItem>

            <StyledActionItem type="button" $danger onClick={handleWithdraw}>
              <div>
                <StyledActionTitle $danger>{t('accountManagement.withdraw')}</StyledActionTitle>
              </div>
            </StyledActionItem>
          </StyledCard>
        </StyledMainColumn>

        <StyledSideColumn></StyledSideColumn>
      </StyledContent>

      <Modal
        isOpen={isWithdrawConfirmOpen}
        title={t('accountManagement.withdrawConfirmTitle')}
        closeButton
        onClose={handleCancelWithdraw}
        renderButtonComponent={
          <>
            <Button theme="tertiary" onClick={handleCancelWithdraw} disabled={isWithdrawing}>
              {t('password.cancel')}
            </Button>
            <Button theme="delete" onClick={handleConfirmWithdraw} disabled={isWithdrawing}>
              {t('accountManagement.withdrawConfirmButton')}
            </Button>
          </>
        }
      >
        <p>{t('accountManagement.withdrawConfirmMessage1')}</p>
        <p style={{ marginTop: '0.6rem' }}>{t('accountManagement.withdrawConfirmMessage2')}</p>
      </Modal>

      <Modal
        isOpen={isWithdrawDoneOpen}
        title={t('accountManagement.withdrawDoneTitle')}
        renderButtonComponent={
          <>
            <Button onClick={handleWithdrawDone}>{t('accountManagement.withdrawDoneButton')}</Button>
          </>
        }
      >
        {t('accountManagement.withdrawDoneMessage')}
      </Modal>

      <Tooltip id="roleGuide" place="top" />
      <Tooltip id="passwordGuide" place="top" />
    </StyledOverlay>,
    document.body
  )
}

export default MyProfileModal
