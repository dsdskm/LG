import { Modal, ModalButton } from '@repo/ui'

const ModalResult = ({ isOpen, t, onConfirm, resultYN }) => {
  const descText = resultYN == true ? t('completeModify') : t('errorReport')
  return (
    <Modal
      isOpen={isOpen}
      renderButtonComponent={
        <>
          <ModalButton theme={'secondary'} onClick={onConfirm}>
            {t('confirm')}
          </ModalButton>
        </>
      }
    >
      <div style={{ maxHeight: '400px' }}>
        <p className="typographyBody2" style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>
          {descText}
        </p>
      </div>
    </Modal>
  )
}

export default ModalResult
