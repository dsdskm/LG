import React from 'react'
import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
`

const SelectButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #1890ff;
    background: #f0f7ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
  }

  &:active {
    transform: scale(0.98);
  }
`

const Message = styled.div`
  font-size: 13px;
  color: #262626;
  margin-bottom: 8px;
  font-weight: 500;
`

/**
 * 일반화된 선택 리스트 컴포넌트
 * @param {Object} props
 * @param {Array} props.items - 선택 항목 배열
 * @param {string} props.message - 표시할 메시지
 * @param {Function} props.renderItem - 항목 렌더링 함수 (커스텀 UI)
 * @param {Function} props.onSelect - 항목 선택 시 콜백
 */
export function MultiSelectList({
  items = [],
  message = '',
  renderItem = null,
  onSelect = null
}) {
  if (!items || items.length === 0) {
    return null
  }

  const handleItemClick = (item) => {
    if (onSelect) {
      onSelect(item)
    }
  }

  return (
    <Container>
      {message && <Message>{message}</Message>}
      {items.map((item, index) => {
        const key = item.id || item.deviceId || index

        return (
          <SelectButton
            key={key}
            onClick={() => handleItemClick(item)}
          >
            {renderItem ? (
              renderItem(item)
            ) : (
              // 기본 렌더링
              <div>{JSON.stringify(item)}</div>
            )}
          </SelectButton>
        )
      })}
    </Container>
  )
}

export default MultiSelectList
