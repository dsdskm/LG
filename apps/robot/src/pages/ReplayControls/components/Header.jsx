// /components/Header.jsx
import { React, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('robot')
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
          {t('replayControls.header.title')}{' '}
          <span style={{ color: '#6B7280', fontWeight: 600 }}>
            {robotName} ( {deviceId} )
          </span>
        </div>
      </div>

      {/* 컨트롤 영역 */}
      <div style={S.topRow2}>
        {/* 날짜 */}
        <div style={S.rowGroup}>
          <label style={{ fontSize: 13 }}>{t('replayControls.header.dateLabel')}</label>
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
            {t('replayControls.header.query')}
          </Button>
        </div>

        {/* 로그 */}
        <div style={S.rowGroup}>
          <label style={{ fontSize: 13 }}>{t('replayControls.header.logLabel')}</label>
          <Dropdown
            value={selectedLogId}
            size="sm"
            title={t('replayControls.header.logSelectTitle')}
            options={logOptions.map((log) => ({
              name: log.labelKey ? t(log.labelKey) : log.label,
              value: log.id
            }))}
            onChange={(value) => onLogChange(value)}
          />
          <Button size="sm" onClick={handleQueryLog}>
            {t('replayControls.header.query')}
          </Button>
          <Button size="sm" disabled={isPreparingDownload} onClick={onDownload}>
            {t('replayControls.header.download')}
          </Button>

          <Button size="sm" onClick={handleOpenLichtblick} disabled={isPreparingDownload}>
            Lichtblick
          </Button>
        </div>

        {/* 선택 날짜 표시 + (result 화면에서) 처음 버튼 */}
        <div style={S.selectedInfoBox}>
          <span>{t('replayControls.header.selectedDate', { date: selectedDate })}</span>

          {mode === 'result' && (
            <Button size="sm" onClick={onBack} style={{ marginLeft: 10 }}>
              {t('replayControls.header.backToStart')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
