import { useEffect, useState } from 'react'
import { Modal, ModalButton, ToggleSwitch } from '@repo/ui'
import { toast } from 'react-toastify'
import { termsApis } from '@/apis'

const ModalEditTerm = ({ isOpen, t, term, onClose, onConfirm }) => {
  const [isRequired, setIsRequired] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 모달이 열릴 때마다 현재 약관 값으로 초기화
  useEffect(() => {
    if (isOpen && term) {
      setIsRequired(!!term.isRequired)
      setIsActive(!!term.isActive)
      setIsSubmitting(false)
    }
  }, [isOpen, term])

  const onSubmit = async () => {
    if (!term?.termId || isSubmitting) return

    setIsSubmitting(true)
    try {
      await termsApis.patchTerms(term.termId, { isRequired, isActive })
      onConfirm?.()
    } catch (e) {
      console.error('약관 수정 실패:', e)
      toast.error(t('termManagement.editFailMessage'), { autoClose: 2000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={t('termManagement.editTitle')}
      onClose={onClose}
      closeButton
      renderButtonComponent={
        <>
          <ModalButton onClick={onClose}>{t('cancel')}</ModalButton>
          <ModalButton onClick={onSubmit} theme="primary" disabled={isSubmitting}>
            {t('save')}
          </ModalButton>
        </>
      }
    >
      <div style={{ marginLeft: '1rem', paddingRight: '1rem' }}>
        {/* 필수 여부 / 활성화 */}
        <div style={{ display: 'flex', gap: '3rem' }}>
          <div>
            <p className="typographyBody4" style={{ marginBottom: '1rem' }}>
              {t('termManagement.requiredLabel')}
            </p>
            <ToggleSwitch
              checked={isRequired}
              onChange={() => setIsRequired((prev) => !prev)}
              label={isRequired ? t('termManagement.required') : t('termManagement.optional')}
            />
          </div>
          <div>
            <p className="typographyBody4" style={{ marginBottom: '1rem' }}>
              {t('termManagement.active')}
            </p>
            <ToggleSwitch
              checked={isActive}
              onChange={() => setIsActive((prev) => !prev)}
              label={isActive ? t('termManagement.active') : t('termManagement.inactive')}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ModalEditTerm
