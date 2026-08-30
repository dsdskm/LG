import React, { useCallback, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { Input, Button, Tag } from '@repo/ui'
import { VersionContainer } from '@repo/ui/styles'
import useClickOutSide from '@repo/hooks/useClickOutSide'
import { toast } from 'react-toastify'

const LABEL_LIMIT_COUNT = 5
const MAX_LABEL_LENGTH = 20 // label.displayName VARCHAR(20)

const SuggestionList = styled.ul`
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  z-index: 10;
  width: 20rem;
  max-height: 20rem;
  overflow-y: auto;
  margin: 0;
  padding: 0.4rem;
  list-style: none;
  background: var(--color-neutral-10);
  border: 1px solid var(--color-secondary-20);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-01);
`

const SuggestionItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.8rem 1rem;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: var(--font-size-body-5);
  color: var(--color-neutral-80);
  border-radius: var(--radius-xs);

  &:hover {
    background: var(--color-secondary-10);
  }
`

const LabelManager = ({ id, labels, setLabels, reservedLabels = [], options = [], t }) => {
  const [editingLabel, setEditingLabel] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const boxRef = useRef(null)

  const closeSuggest = useCallback(() => setIsOpen(false), [])
  useClickOutSide(boxRef, closeSuggest)

  // 입력 텍스트로 등록 라벨 추천 (이미 선택된 라벨/예약 라벨 제외)
  const suggestions = useMemo(() => {
    const q = editingLabel.trim().toLowerCase()
    if (!q) return []
    return options
      .filter((o) => !labels.includes(o) && !reservedLabels.includes(o))
      .filter((o) => o.toLowerCase().includes(q))
      .slice(0, 8)
  }, [editingLabel, options, labels, reservedLabels])

  const addLabel = (raw) => {
    const name = (raw ?? '').trim()
    if (!name) return
    if (name.length > MAX_LABEL_LENGTH) {
      toast.error(`${t('labelTooLong', { max: MAX_LABEL_LENGTH })}`, { autoClose: 2000 })
      return
    }
    if (reservedLabels.includes(name)) {
      toast.error(`${t('labelReserved', { defaultValue: '예약된 라벨은 추가할 수 없습니다.' })}`, { autoClose: 2000 })
      return
    }
    if (labels.includes(name)) {
      toast.error(`${t('labelAlreadyExists')}`, { autoClose: 2000 })
      return
    }
    if (labels.length >= LABEL_LIMIT_COUNT) {
      toast.error(`${t('labelLimit', { limit: LABEL_LIMIT_COUNT })}`, { autoClose: 2000 })
      return
    }
    setLabels([...labels, name])
    setEditingLabel('')
    setIsOpen(false)
  }

  const handleDeleteTag = (index) => {
    setLabels(labels.filter((_, i) => i !== index))
  }

  return (
    <VersionContainer>
      <div className="version-label">Label</div>
      <div className="version-wrapper">
        <div ref={boxRef} style={{ position: 'relative' }}>
          <div className="version-input-group">
            <Input
              value={editingLabel}
              size="sm"
              style={{ width: '20rem' }}
              type="text"
              onChange={(e) => {
                setEditingLabel(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => e.key === 'Enter' && editingLabel && addLabel(editingLabel)}
            />
            <Button variant="contained" onClick={() => addLabel(editingLabel)}>
              +
            </Button>
          </div>
          {isOpen && suggestions.length > 0 && (
            <SuggestionList>
              {suggestions.map((opt) => (
                <li key={opt}>
                  <SuggestionItem type="button" onClick={() => addLabel(opt)}>
                    {opt}
                  </SuggestionItem>
                </li>
              ))}
            </SuggestionList>
          )}
        </div>
        <div className="version-list">
          {labels.map((label, index) => (
            <div key={index} className="tag">
              <Tag variant="contained" size="sm" onClick={() => handleDeleteTag(index)}>
                {label}
                {
                  <span
                    className="close-icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTag(index)
                    }}
                  >
                    ✕
                  </span>
                }
              </Tag>
            </div>
          ))}
        </div>
      </div>
    </VersionContainer>
  )
}

export default LabelManager
