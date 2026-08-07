import { useState, useEffect } from 'react'
import styled from 'styled-components'
import Modal from '../Modal'
import Button from '../Button'
import Checkbox from '../Checkbox'
import { getConfigurableColumns, defaultColumnSettings } from './columnSettings'

// 표시 컬럼 설정 모달 — 테이블/카드 각각 체크. onSave({ table:Set, card:Set })
const ColumnSettingsModal = ({ isOpen, onClose, columns = [], value, onSave, labels = {} }) => {
  const L = {
    title: labels.title || '표시 항목 설정',
    column: labels.column || '항목',
    table: labels.table || '테이블',
    card: labels.card || '카드',
    reset: labels.reset || '기본값',
    confirm: labels.confirm || '확인',
    cancel: labels.cancel || '취소'
  }
  const configurable = getConfigurableColumns(columns)

  const [draft, setDraft] = useState({ table: new Set(), card: new Set() })
  useEffect(() => {
    if (isOpen && value) setDraft({ table: new Set(value.table), card: new Set(value.card) })
  }, [isOpen, value])

  const toggle = (view, id) => {
    setDraft((prev) => {
      const next = new Set(prev[view])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, [view]: next }
    })
  }

  const handleReset = () => setDraft(defaultColumnSettings(columns))
  const handleConfirm = () => {
    onSave?.(draft)
    onClose?.()
  }

  return (
    <Modal
      isOpen={isOpen}
      title={L.title}
      onClose={onClose}
      size="md"
      renderButtonComponent={
        <>
          <Button variant="contained" onClick={handleConfirm}>
            {L.confirm}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {L.cancel}
          </Button>
        </>
      }
    >
      <Body>
        <div className="head">
          <span className="colName">{L.column}</span>
          <span className="colCheck">{L.table}</span>
          <span className="colCheck">{L.card}</span>
        </div>
        {configurable.map((col) => (
          <div className="row" key={col.id}>
            <span className="colName">{col.name}</span>
            <span className="colCheck">
              <Checkbox checked={draft.table.has(col.id)} onChange={() => toggle('table', col.id)} />
            </span>
            <span className="colCheck">
              <Checkbox checked={draft.card.has(col.id)} onChange={() => toggle('card', col.id)} />
            </span>
          </div>
        ))}
        <div className="resetRow">
          <Button size="sm" variant="outline" onClick={handleReset}>
            {L.reset}
          </Button>
        </div>
      </Body>
    </Modal>
  )
}

export default ColumnSettingsModal

const Body = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;

  .head,
  .row {
    display: flex;
    align-items: center;
    padding: 0.7rem 0.4rem;
  }
  .head {
    border-bottom: 2px solid var(--color-neutral-20, #e5e8eb);
    font-weight: 700;
    color: var(--color-neutral-70);
  }
  .row {
    border-bottom: 1px solid var(--color-neutral-10, #f2f4f6);
  }
  .colName {
    flex: 1 1 auto;
    min-width: 0;
  }
  .colCheck {
    flex: 0 0 8rem;
    display: flex;
    justify-content: center;
  }
  .resetRow {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.2rem;
  }
`
