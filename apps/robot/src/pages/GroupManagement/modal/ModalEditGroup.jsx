import { useEffect, useState, useMemo, useCallback } from 'react'
import { Modal, ModalButton, Input } from '@repo/ui'
import { useForm } from 'react-hook-form'
import { groupApis } from '@/apis'

const ModalEditGroup = ({ isOpen, t, onClose, onConfirm, groupId, groupInfo }) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      groupName: ''
    }
  })
  const [isBtnValid, setIsBtnValid] = useState(false)
  const [title, setTitle] = useState(t('groupCreate'))
  const groupName = watch('groupName')

  useEffect(() => {
    if (isOpen) {
      setTitle(groupId == 'new' ? t('groupCreate') : t('groupModify'))
      setIsBtnValid(false)
      // 모달 열릴 때 초기값 세팅 + 유효성 재평가
      setValue('groupName', groupInfo?.groupName ?? '', { shouldValidate: true, shouldDirty: false })
      // 초기값 기준으로 버튼 상태 결정
      setIsBtnValid(false)
    }
  }, [isOpen, t])

  // 입력값이 바뀌면 isBtnValid만 컨트롤
  useEffect(() => {
    setIsBtnValid(groupName.trim().length > 0 && groupInfo?.groupName != groupName)
  }, [groupName])

  const onSubmit = async () => {
    try {
      if (groupId == 'new') {
        const _groupInfo1 = {
          groupName: groupName,
          groupBusinessNumber: 'dBusiNumber',
          groupAddressOne: 'dAddrOne',
          groupAddressTwo: 'dAddrTwo',
          groupAddressCity: 'dAddrCity',
          groupAddressState: 'dAddrState',
          groupAddressPostalCode: 'D1234'
        }
        const response1 = await groupApis.postGroups(_groupInfo1)

        onConfirm?.({ resultNo: response1 ? 1 : 3 })
      } else if (groupId) {
        const _groupInfo2 = {
          groupName: groupName
        }
        const response2 = await groupApis.putGroups(groupId, _groupInfo2)

        onConfirm?.({ resultNo: response2 ? 2 : 3 })
      } else {
        onConfirm?.({ resultNo: 3 })
      }
    } catch (error) {
      console.log('error=' + error)
      onConfirm?.({ resultNo: 3 })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={title}
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
              {t('groupName')}
            </p>
            <Input
              type="text"
              placeholder={t('inputGroupName')}
              size="md"
              value={groupName}
              {...register('groupName')}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default ModalEditGroup
