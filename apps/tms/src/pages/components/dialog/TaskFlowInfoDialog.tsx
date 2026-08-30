import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

type TaskFlowInfoValue = {
  name: string
  description: string
}

type TaskFlowInfoDialogProps = {
  open: boolean
  title: string
  description?: string
  initialName?: string
  initialDescription?: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  onClose: () => void
  onConfirm: (value: TaskFlowInfoValue) => void | Promise<void>
}

export default function TaskFlowInfoDialog({
  open,
  title,
  description,
  initialName = '',
  initialDescription = '',
  confirmText,
  cancelText,
  loading = false,
  onClose,
  onConfirm
}: TaskFlowInfoDialogProps) {
  const { t } = useTranslation(['tms', 'common'])

  const [name, setName] = React.useState(initialName)
  const [desc, setDesc] = React.useState(initialDescription)
  const [touched, setTouched] = React.useState(false)

  const validateName = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return t('infoDialog.nameRequired')
    if (trimmed.length > 100) return t('infoDialog.nameTooLong')
    return null
  }

  const validateDescription = (value: string) => {
    if (value.trim().length > 300) return t('infoDialog.descriptionTooLong')
    return null
  }

  const titleId = React.useId()
  const descriptionId = React.useId()
  const nameInputRef = React.useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return

    setName(initialName)
    setDesc(initialDescription)
    setTouched(false)

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus()
    }, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(timer)
    }
  }, [open, initialName, initialDescription, loading, onClose])

  const nameError = validateName(name)
  const descError = validateDescription(desc)

  const showNameError = touched && !!nameError
  const showDescError = touched && !!descError
  const hasError = !!nameError || !!descError

  const handleConfirm = async () => {
    setTouched(true)
    if (loading || hasError) return

    await onConfirm({
      name: name.trim(),
      description: desc.trim()
    })
  }

  if (!open) return null

  return ReactDOM.createPortal(
    <Overlay>
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <Title id={titleId}>{title}</Title>
        {description ? <Desc id={descriptionId}>{description}</Desc> : null}

        <FieldLabel>{t('infoDialog.nameLabel')}</FieldLabel>
        <NameInput
          ref={nameInputRef}
          value={name}
          disabled={loading}
          aria-invalid={showNameError}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleConfirm()
            }
          }}
        />
        {showNameError ? <ErrorText>{nameError}</ErrorText> : null}

        <FieldLabel>{t('infoDialog.descriptionLabel')}</FieldLabel>
        <DescriptionArea
          value={desc}
          disabled={loading}
          aria-invalid={showDescError}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={4}
        />
        {showDescError ? <ErrorText>{descError}</ErrorText> : <Spacer />}

        <Actions>
          <GhostBtn
            type="button"
            onClick={() => {
              if (loading) return
              onClose()
            }}
            disabled={loading}
          >
            {cancelText ?? t('common:cancel')}
          </GhostBtn>

          <PrimaryBtn
            type="button"
            onClick={handleConfirm}
            disabled={loading || hasError}
          >
            {loading ? t('infoDialog.processing') : (confirmText ?? t('common:confirm'))}
          </PrimaryBtn>
        </Actions>
      </Dialog>
    </Overlay>,
    document.body
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;

  display: flex;
  align-items: center;
  justify-content: center;

  background: rgba(15, 23, 42, 0.45);
`

const Dialog = styled.div`
  width: min(520px, calc(100vw - 32px));
  max-width: 520px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);
  padding: 24px;
`

const Title = styled.div`
  font-size: 16px;
  font-weight: 900;
  color: #111827;
`

const Desc = styled.div`
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  line-height: 1.5;
  white-space: pre-line;
`

const FieldLabel = styled.div`
  margin-top: 12px;
  font-size: 12px;
  font-weight: 800;
  color: #475569;
`

const NameInput = styled.input`
  margin-top: 6px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(17, 24, 39, 0.18);
  outline: none;
  font-size: 14px;
  font-weight: 800;
  color: #111827;

  &:focus {
    border-color: rgba(100, 180, 255, 0.95);
    box-shadow: 0 0 0 3px rgba(100, 180, 255, 0.2);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`

const DescriptionArea = styled.textarea`
  margin-top: 6px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(17, 24, 39, 0.18);
  outline: none;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  resize: vertical;

  &:focus {
    border-color: rgba(100, 180, 255, 0.95);
    box-shadow: 0 0 0 3px rgba(100, 180, 255, 0.2);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`

const ErrorText = styled.div`
  margin-top: 8px;
  font-size: 12px;
  font-weight: 800;
  color: #b91c1c;
`

const Spacer = styled.div`
  height: 20px;
  margin-top: 8px;
`

const Actions = styled.div`
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const GhostBtn = styled.button`
  padding: 8px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.18);
  color: #111827;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const PrimaryBtn = styled.button`
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(100, 180, 255, 0.95);
  border: 1px solid rgba(100, 180, 255, 1);
  color: #0b1220;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;

  &:hover:not(:disabled) {
    filter: brightness(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`