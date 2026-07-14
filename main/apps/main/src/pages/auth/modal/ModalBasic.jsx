import { Modal, ModalButton } from '@repo/ui'

const ModalBasic = ({ isOpen, t, onConfirm, descIdx, btnIdx }) => {
  const descTable = [{ idx: 0, desc: t('completed') }]
  const btnTable = [{ idx: 0, desc: t('confirm') }]

  return (
    <Modal
      isOpen={isOpen}
      renderButtonComponent={
        <>
          <ModalButton theme={'secondary'} onClick={onConfirm}>
            {btnTable[btnIdx].desc}
          </ModalButton>
        </>
      }
    >
      <div style={{ maxHeight: '400px' }}>
        <p className="typographyBody2" style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>
          {descTable[descIdx].desc}
        </p>
      </div>
    </Modal>
  )
}

export default ModalBasic
