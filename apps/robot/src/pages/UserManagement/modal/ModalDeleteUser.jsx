import { useEffect, useState, useMemo } from 'react'
import { Modal, ModalButton, Dropdown } from '@repo/ui'
import { useForm } from 'react-hook-form'
import { userApis } from '@/apis'
import { allRoles } from '@/utils/roleUtils'

const ModalDeleteUser = ({ isOpen, t, onClose, onConfirm, userId, userEmail }) => {
  const {
    handleSubmit,
    formState: { errors }
  } = useForm({
    mode: 'onChange'
  })
  const [deleteEmail, setDeleteEmail] = useState(userEmail)

  useEffect(() => {
    if (isOpen) {
      setDeleteEmail(userEmail)
    }
  }, [isOpen])

  const onSubmit = async () => {
    try {
      const response = await userApis.deleteUser(userId)

      onConfirm?.({ resultYN: !!response })
    } catch (error) {
      console.log('error=' + error)
      onConfirm?.({ resultYN: false })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={t('accountDeleteConfirm')}
      onClose={onClose}
      closeButton
      renderButtonComponent={
        <>
          <ModalButton onClick={onClose}>{t('cancel')}</ModalButton>
          <ModalButton onClick={handleSubmit(onSubmit)} theme="primary">
            {t('delete')}
          </ModalButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ maxHeight: '400px' }}>
          <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '3rem' }}>
            {t('accountDeleteMessage')}
          </p>
          <p className="typographyBody3" style={{ whiteSpace: 'pre-wrap', marginBottom: '1.6rem', marginLeft: '10px' }}>
            {deleteEmail}
          </p>
        </div>
      </form>
    </Modal>
  )
}

export default ModalDeleteUser
