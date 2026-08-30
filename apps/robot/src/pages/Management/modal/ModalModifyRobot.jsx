import { useEffect } from 'react'
import { Modal, ModalButton, Input } from '@repo/ui'
import { useForm } from 'react-hook-form'
import { deviceApis } from '@/apis'

const ModalModifyRobot = ({ isOpen, t, onClose, onConfirm, deviceId, deviceName }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid }
  } = useForm({
    mode: 'onChange'
  })

  // 모달이 열리거나 deviceName이 변경될 때 RHF 값 동기화
  useEffect(() => {
    if (isOpen) {
      reset({ rName: deviceName ?? '' })
    }
  }, [isOpen])

  const onSubmit = async (data) => {
    const rName = data.rName?.trim()
    if (!rName) {
      return
    }
    try {
      const response = await deviceApis.putDeviceInfo(deviceId, data.rName)

      onConfirm?.({ resultYN: !!response })
    } catch (error) {
      console.log('error=' + error)
      onConfirm?.({ resultYN: false })
    }
  }

  const onInvalid = () => {}

  return (
    <Modal
      isOpen={isOpen}
      title={t('robotNameModTitle')}
      onClose={onClose}
      closeButton
      renderButtonComponent={
        <>
          <ModalButton onClick={onClose}>{t('cancel')}</ModalButton>
          <ModalButton onClick={handleSubmit(onSubmit, onInvalid)} theme="primary" disabled={!isValid}>
            {t('confirm')}
          </ModalButton>
        </>
      }
    >
      <div style={{ maxHeight: '400px' }}>
        <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1.6rem' }}>
          {t('robotNameModDesc')}
        </p>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <Input
            type="text"
            placeholder={t('inputRobotName')}
            isError={!!errors.rName}
            message={errors.rName?.message}
            size="md"
            value={deviceName}
            //onKeyDown={handleKeyDown}
            {...register('rName', {
              required: t('inputRobotName'),
              validate: {
                notBlank: (v) => (v?.trim().length ? true : t('inputRobotName'))
              }
            })}
          />
        </form>
      </div>
    </Modal>
  )
}

export default ModalModifyRobot
