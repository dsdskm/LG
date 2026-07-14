/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

export type ForcedResult = 'NORMAL' | 'SUCCESS' | 'FAILURE' | 'RUNNING'

export type NodeSimConfig = {
  forced: ForcedResult
  returnValue: string
  breakpoint: boolean
}

export const DEFAULT_NODE_CONFIG: NodeSimConfig = {
  forced: 'NORMAL',
  returnValue: '',
  breakpoint: false
}

const RESULT_OPTIONS: { value: ForcedResult; i18nKey: string }[] = [
  { value: 'NORMAL', i18nKey: 'canvas.viewer.inspect.dialog.normal' },
  { value: 'SUCCESS', i18nKey: 'canvas.viewer.inspect.dialog.success' },
  { value: 'FAILURE', i18nKey: 'canvas.viewer.inspect.dialog.failed' },
  { value: 'RUNNING', i18nKey: 'canvas.viewer.inspect.dialog.running' }
]

type Props = {
  open: boolean
  nodeLabel: string
  config: NodeSimConfig
  // 실행 중 이미 수행 완료된 노드는 '실행 결과 강제'를 바꿀 수 없게 한다.
  forceDisabled?: boolean
  onChange: (next: NodeSimConfig) => void
  onClose: () => void
}

export default function NodeInspectDialog({
  open,
  nodeLabel,
  config,
  forceDisabled = false,
  onChange,
  onClose
}: Props) {
  const { t } = useTranslation('tms')

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return ReactDOM.createPortal(
    <Overlay onClick={onClose}>
      <Dialog role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderLabel>{t('canvas.viewer.inspect.dialog.title')}</HeaderLabel>
          <NodeName title={nodeLabel}>{nodeLabel}</NodeName>
        </Header>

        <Field>
          <FieldLabel>{t('canvas.viewer.inspect.dialog.forceResult')}</FieldLabel>
          <SegmentRow>
            {RESULT_OPTIONS.map(({ value, i18nKey }) => (
              <SegmentButton
                key={value}
                type="button"
                $active={config.forced === value}
                $tone={value}
                disabled={forceDisabled}
                onClick={() => {
                  if (forceDisabled) return
                  onChange({ ...config, forced: value })
                }}
              >
                {t(i18nKey)}
              </SegmentButton>
            ))}
          </SegmentRow>
          {forceDisabled && <FieldHint>{t('canvas.viewer.inspect.dialog.forceLocked')}</FieldHint>}
        </Field>

        <Field>
          <FieldLabel>{t('canvas.viewer.inspect.dialog.returnValue')}</FieldLabel>
          <TextInput
            value={config.returnValue}
            placeholder={t('canvas.viewer.inspect.dialog.returnValuePlaceholder')}
            onChange={(e) => onChange({ ...config, returnValue: e.target.value })}
          />
        </Field>

        <CheckboxRow
          onClick={() => onChange({ ...config, breakpoint: !config.breakpoint })}
          role="checkbox"
          aria-checked={config.breakpoint}
        >
          <Checkbox $checked={config.breakpoint}>{config.breakpoint ? '✓' : ''}</Checkbox>
          <CheckboxLabel>{t('canvas.viewer.inspect.dialog.breakpoint')}</CheckboxLabel>
        </CheckboxRow>

        <Footer>
          <CloseButton type="button" onClick={onClose}>
            {t('canvas.viewer.inspect.dialog.close')}
          </CloseButton>
        </Footer>
      </Dialog>
    </Overlay>,
    document.body
  )
}

const TONE: Record<ForcedResult, { border: string; bg: string; text: string }> = {
  NORMAL: { border: '#cbd5e1', bg: '#f1f5f9', text: '#334155' },
  SUCCESS: { border: '#34d399', bg: '#ecfdf5', text: '#065f46' },
  FAILURE: { border: '#fb7185', bg: '#fff1f2', text: '#be123c' },
  RUNNING: { border: '#60a5fa', bg: '#eff6ff', text: '#1d4ed8' }
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
  width: min(440px, calc(100vw - 32px));
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);
  padding: 24px;
`

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
`

const HeaderLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
`

const NodeName = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
`

const FieldLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #475569;
`

const SegmentRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`

const SegmentButton = styled.button<{ $active?: boolean; $tone: ForcedResult }>`
  height: 38px;
  border-radius: 10px;
  border: 1px solid ${({ $active, $tone }) => ($active ? TONE[$tone].border : '#d1d5db')};
  background: ${({ $active, $tone }) => ($active ? TONE[$tone].bg : '#ffffff')};
  color: ${({ $active, $tone }) => ($active ? TONE[$tone].text : '#475569')};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${({ $tone }) => TONE[$tone].border};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &:disabled:hover {
    border-color: ${({ $active, $tone }) => ($active ? TONE[$tone].border : '#d1d5db')};
  }
`

const FieldHint = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
`

const TextInput = styled.input`
  height: 40px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  color: #0f172a;

  &:focus {
    outline: none;
    border-color: #94a3b8;
  }
`

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
`

const Checkbox = styled.span<{ $checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid ${({ $checked }) => ($checked ? '#dc2626' : '#cbd5e1')};
  background: ${({ $checked }) => ($checked ? '#dc2626' : '#ffffff')};
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CheckboxLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #334155;
`

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
`

const CloseButton = styled.button`
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #1d4ed8;
  }
`
