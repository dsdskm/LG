// /components/Header.jsx
import { React, useMemo } from 'react'
import { Dropdown, Button, Calendar } from '@repo/ui'
import { S } from '../styles'
import { format } from 'date-fns'

export default function Header({
  robotName,
  deviceId,

  selectedDate,
  onDateChange,
  logOptions,
  selectedLogId,
  onLogChange,
  isPreparingDownload,
  handleOpenLichtblick,
  handleVisibleRangeChange,

  // ✅ 추가
  mode = 'landing', // 'landing' | 'result'
  onQuery, // ({source}) => void
  onBack, // () => void
  onDownload,

  allowedDateKeys
}) {
  const handleQueryDate = () => onQuery?.({ source: 'date' })
  const handleQueryLog = () => onQuery?.({ source: 'log' })

  const filterDate = useMemo(() => {
    if (allowedDateKeys === null) {
      return () => true
    }

    const allowedSet = new Set(allowedDateKeys || [])
    return (date) => {
      if (allowedSet.size === 0) return false
      try {
        const key = format(date, 'yyyy-MM-dd')
        return allowedSet.has(key)
      } catch {
        return false
      }
    }
  }, [allowedDateKeys])

  return (
    <div id="headerWrap" style={S.headerWrap}>
      {/* 상단 타이틀 */}
      <div style={S.topRow1}>
        <div style={S.title}>
          로봇 관리 | 조작 로그 리플레이{' '}
          <span style={{ color: '#6B7280', fontWeight: 600 }}>
            {robotName} ( {deviceId} )
          </span>
        </div>
      </div>

      {/* 컨트롤 영역 */}
      <div style={S.topRow2}>
        {/* 날짜 */}
        <div style={S.rowGroup}>
          <label style={{ fontSize: 13 }}>날짜</label>
          <div style={{ paddingLeft: 12 }}>
            <Calendar
              startDate={selectedDate}
              onChangeStartDate={(date) => {
                onDateChange(format(date, 'yyyy-MM-dd'))
              }}
              allowedDateKeys={allowedDateKeys}
              filterDate={filterDate}
              onVisibleRangeChange={handleVisibleRangeChange}
            />
          </div>
          <Button size="sm" onClick={handleQueryDate}>
            조회
          </Button>
        </div>

        {/* 로그 */}
        <div style={S.rowGroup}>
          <label style={{ fontSize: 13 }}>로그</label>
          <Dropdown
            value={selectedLogId}
            size="sm"
            title="로그 선택"
            options={logOptions.map((log) => ({
              name: log.label,
              value: log.id
            }))}
            onChange={(value) => onLogChange(value)}
          />
          <Button size="sm" onClick={handleQueryLog}>
            조회
          </Button>
          <Button size="sm" disabled={isPreparingDownload} onClick={onDownload}>
            다운로드
          </Button>

          <Button size="sm" onClick={handleOpenLichtblick} disabled={isPreparingDownload}>
            Lichtblick
          </Button>
        </div>

        {/* 선택 날짜 표시 + (result 화면에서) 처음 버튼 */}
        <div style={S.selectedInfoBox}>
          <span>선택 날짜: {selectedDate}</span>

          {mode === 'result' && (
            <Button size="sm" onClick={onBack} style={{ marginLeft: 10 }}>
              ← 처음
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
