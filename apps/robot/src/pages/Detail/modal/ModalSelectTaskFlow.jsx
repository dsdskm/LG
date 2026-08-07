import React, { useMemo, useState } from 'react'
import { Modal, ModalButton } from '@repo/ui'
import { GamePad } from '@/assets/icon'
import styled from 'styled-components'

// ── Styled Components (ModalMoveLocation과 동일한 디자인 톤 유지) ──────

const GroupLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
  span {
    color: #888;
    font-weight: 400;
  }
`

const TaskFlowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
`

const TaskFlowItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 2px solid ${({ $selected }) => ($selected ? '#3b82f6' : 'transparent')};
  background-color: ${({ $selected }) => ($selected ? '#eff6ff' : 'transparent')};
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background-color: ${({ $selected }) => ($selected ? '#eff6ff' : '#f8fafc')};
  }
`

const RadioCircle = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ $selected }) => ($selected ? '#3b82f6' : '#d1d5db')};
  background-color: ${({ $selected }) => ($selected ? '#3b82f6' : '#fff')};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &::after {
    content: '';
    display: ${({ $selected }) => ($selected ? 'block' : 'none')};
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #fff;
  }
`

const TaskFlowIconWrap = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg {
    width: 16px;
    height: 16px;
    color: #3b82f6;
  }
`

const TaskFlowName = styled.span`
  font-size: 14px;
  color: #222;
  flex: 1;
`

const CheckMark = styled.span`
  color: #3b82f6;
  font-size: 16px;
  font-weight: bold;
`

// ── Component ──────────────────────────────────────────────────

/**
 * Props
 *  isOpen    : boolean
 *  onClose   : () => void
 *  onConfirm : (taskFlow) => void  — 선택된 taskFlow 객체({id, name, ...}) 전달
 *  taskFlows : Array               — data.tms.taskFlowState.taskFlows
 *  t         : i18n translate fn
 */
const ModalSelectTaskFlow = ({ isOpen, onClose, onConfirm, taskFlows, t }) => {
  const [selectedId, setSelectedId] = useState(null)

  const list = useMemo(() => taskFlows ?? [], [taskFlows])
  const selectedTaskFlow = useMemo(() => list.find((tf) => tf.id === selectedId) ?? null, [list, selectedId])

  const handleConfirm = () => {
    if (!selectedTaskFlow) return
    onConfirm(selectedTaskFlow)
    handleClose()
  }

  const handleClose = () => {
    setSelectedId(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{t('taskFlowSelect')}</div>}
      onClose={handleClose}
      renderButtonComponent={
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
          <ModalButton variant="outlined" theme="default" onClick={handleClose}>
            {t('cancel')}
          </ModalButton>
          <ModalButton variant="contained" theme="primary" onClick={handleConfirm} disabled={!selectedId}>
            {t('taskStart')}
          </ModalButton>
        </div>
      }
    >
      <div style={{ padding: '4px 0' }}>
        <GroupLabel>
          {t('task')} <span>({list.length})</span>
        </GroupLabel>

        <TaskFlowList>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, padding: '20px 0' }}>
              {t('noTaskFlows')}
            </div>
          ) : (
            list.map((tf) => {
              const isSelected = tf.id === selectedId
              return (
                <TaskFlowItem key={tf.id} $selected={isSelected} onClick={() => setSelectedId(tf.id)}>
                  <RadioCircle $selected={isSelected} />
                  <TaskFlowName>{tf.name}</TaskFlowName>
                  {isSelected && <CheckMark>✓</CheckMark>}
                </TaskFlowItem>
              )
            })
          )}
        </TaskFlowList>
      </div>
    </Modal>
  )
}

export default ModalSelectTaskFlow
