import { useEffect, useState, useMemo, useCallback } from 'react'
import { Modal, ModalButton, Input } from '@repo/ui'
import { useForm } from 'react-hook-form'
import { deviceApis } from '@/apis'

const ModalEditRobot = ({ isOpen, t, onClose, onConfirm, deviceId, deviceInfo }) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      deviceName: ''
    }
  })
  const [isBtnValid, setIsBtnValid] = useState(false)
  const deviceName = watch('deviceName')

  useEffect(() => {
    if (isOpen) {
      setIsBtnValid(false)
      // 모달 열릴 때 초기값 세팅 + 유효성 재평가
      setValue('deviceName', deviceInfo?.name ?? '', { shouldValidate: true, shouldDirty: false })
      // 초기값 기준으로 버튼 상태 결정
      setIsBtnValid(false)
    }
  }, [isOpen, t])

  // 입력값이 바뀌면 isBtnValid만 컨트롤
  useEffect(() => {
    setIsBtnValid(deviceName.trim().length > 0 && deviceInfo?.name != deviceName)
  }, [deviceName])

  const onSubmit = async () => {
    try {
      const response = await deviceApis.putDeviceInfo(deviceId, deviceName)

      onConfirm?.({ resultNo: response ? 2 : 3 })
    } catch (error) {
      console.log('error=' + error)
      onConfirm?.({ resultNo: 3 })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={t('robotNameModTitle')}
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
        <div style={{ maxHeight: '400px', marginLeft: '1rem' }}>
          <div>
            <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
              {t('robotName')}
            </p>
            <Input
              type="text"
              placeholder={t('inputRobotName')}
              size="md"
              value={deviceName}
              {...register('deviceName')}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default ModalEditRobot
