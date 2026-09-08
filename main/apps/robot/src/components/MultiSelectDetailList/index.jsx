import React from 'react'
import { MultiSelectList } from '../../../../../packages/ui/src/components/MultiSelectList'
import { buildNavigationPath } from '../../../../../packages/ai/src/rules/robot/actions/robot-move-page.js'

/**
 * 디바이스/사이트 선택 공용 컴포넌트
 * @param {Object} props
 * @param {Array} props.items - 선택 항목 배열
 * @param {string} props.message - 표시할 메시지
 * @param {Object} props.rule - Rule 객체
 * @param {string} props.idKey - ID 필드명 ('deviceId' | 'siteId')
 * @param {Function} props.renderItem - 항목 렌더링 함수
 * @param {Function} props.onSelect - 선택 콜백
 */
export function MultiSelectDetailList({
  items = [],
  message = '',
  rule = null,
  idKey = 'deviceId',
  renderItem = null,
  onSelect
}) {
  const handleSelect = (item) => {
    if (rule) {
      const path = buildNavigationPath(rule, [item[idKey]])
      window.location.href = path
    }
    if (onSelect) {
      onSelect(item[idKey])
    }
  }

  return (
    <MultiSelectList
      items={items}
      message={message}
      onSelect={handleSelect}
      renderItem={renderItem}
    />
  )
}

export default MultiSelectDetailList
