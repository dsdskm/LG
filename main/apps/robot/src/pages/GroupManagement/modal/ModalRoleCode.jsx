import { Modal, ModalButton, Input } from '@repo/ui'
import styled from 'styled-components'
import { Copy } from 'lucide-react'
import { toast } from 'react-toastify'

const RoleCodeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 10px 0;
`

const CopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 10px;
  gap: 4px;
  border: 1px solid var(--color-primary-60, #0073e6);
  border-radius: var(--radius-xs, 4px);
  color: var(--color-primary-60, #0073e6);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:hover {
    background: var(--color-primary-10, #ebf3ff);
  }
`

const ModalRoleCode = ({ isOpen, onClose, t, locationId }) => {
  const handleCopy = () => {
    if (!locationId) return
    navigator.clipboard.writeText(locationId)
    toast.success(t('copied'), { autoClose: 2000 })
  }

  return (
    <Modal
      isOpen={isOpen}
      title={t('roleCode')}
      onClose={onClose}
      closeButton
      size="xs"
      renderButtonComponent={
        <ModalButton onClick={onClose} theme="primary">
          {t('confirm')}
        </ModalButton>
      }
    >
      <RoleCodeRow>
        <Input type="text" size="md" value={locationId ?? ''} readOnly />
        <CopyBtn type="button" onClick={handleCopy}>
          <Copy size={14} />
          {t('copy')}
        </CopyBtn>
      </RoleCodeRow>
    </Modal>
  )
}

export default ModalRoleCode
