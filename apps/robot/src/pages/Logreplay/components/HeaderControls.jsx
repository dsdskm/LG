import React, { useCallback, useMemo } from 'react'
import { Dropdown, Button, Input, Calendar } from '@repo/ui'
import { format } from 'date-fns'
import { S } from '../styles'
import { useTranslation } from 'react-i18next'

export default function HeaderControls({
  robotName,
  deviceId,
  headerLocked,

  // 설정 팝오버
  showSettings,
  settings,
  openSettingsPopover,
  scheduleCloseSettingsPopover,

  // 날짜/목록
  selectedDate,
  onDateChange,
  isLoadingLogs,
  handleFetchListClick,
  handleVisibleRangeChange,

  // 로그
  selectedLogId,
  logOptions,
  onLogChange,
  handleViewLog,
  isEmptyOption,
  handleDownloadLog,
  handleOpenLichtblick,
  isPreparingDownload,

  // 유틸
  formatDate,
  allowedDateKeys
}) {
  // console.log(
  //   '[HeaderControls] Rendering, handleOpenLichtblick:',
  //   typeof handleOpenLichtblick,
  //   'isEmptyOption:',
  //   isEmptyOption
  // )
  const { t } = useTranslation('robot')
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

  const settingsDisabled = !!headerLocked

  return (
    <div id="headerWrap" style={S.headerWrap}>
      <div style={S.topRow1}>
        <div style={S.title}>
          {t('logreplay.header.title')}{' '}
          <span style={{ color: '#6B7280', fontWeight: 600 }}>
            {' '}
            {robotName} ( {deviceId} )
          </span>
        </div>
      </div>

      <div style={S.topRow2}>
        {/* 설정 */}

        <div
          style={{
            ...S.settingsWrapper,
            ...(settingsDisabled ? { opacity: 0.6, pointerEvents: 'none' } : null)
          }}
          onMouseEnter={settingsDisabled ? undefined : openSettingsPopover}
          onMouseLeave={settingsDisabled ? undefined : scheduleCloseSettingsPopover}
        >
          <Button size="sm" theme="tertiary" title={t('logreplay.header.settingsTitle')} disabled={settingsDisabled}>
            {t('logreplay.header.settingsButton')}
          </Button>

          {showSettings && !settingsDisabled && (
            <div style={S.popover} onMouseEnter={openSettingsPopover} onMouseLeave={scheduleCloseSettingsPopover}>
              <div style={S.popoverHeader}>{t('logreplay.settings.popoverTitle')}</div>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.value.showTrajectory}
                  onChange={(e) => settings.set({ ...settings.value, showTrajectory: e.target.checked })}
                />
                {t('logreplay.settings.trajectory')}
              </label>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.value.showGoalAndHeading}
                  onChange={(e) => settings.set({ ...settings.value, showGoalAndHeading: e.target.checked })}
                />
                {t('logreplay.settings.goalAndHeading')}
              </label>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.value.showCostmap}
                  onChange={(e) => settings.set({ ...settings.value, showCostmap: e.target.checked })}
                />
                {t('logreplay.settings.costmap')}
              </label>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.value.showPlannedPath}
                  onChange={(e) => settings.set({ ...settings.value, showPlannedPath: e.target.checked })}
                />
                {t('logreplay.settings.plannedPath')}
              </label>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.value.showLidar}
                  onChange={(e) => settings.set({ ...settings.value, showLidar: e.target.checked })}
                />
                {t('logreplay.settings.lidar')}
              </label>
            </div>
          )}
        </div>

        {/* 날짜 + 조회(목록 조회) */}
        <div style={S.rowGroup}>
          <label style={{ fontSize: 13, color: '#374151' }}>{t('logreplay.header.dateLabel')}</label>
          <Calendar
            startDate={selectedDate}
            onChangeStartDate={(date) => {
              onDateChange(format(date, 'yyyy-MM-dd'))
            }}
            disabled={headerLocked}
            allowedDateKeys={allowedDateKeys}
            filterDate={filterDate}
            onVisibleRangeChange={handleVisibleRangeChange}
          />
          <Button
            size="sm"
            theme="default"
            onClick={handleFetchListClick}
            title={t('logreplay.header.dateQueryTitle')}
            disabled={headerLocked}
          >
            {t('logreplay.header.query')}
          </Button>
        </div>

        {/* 로그 드롭다운 + 조회/다운로드 */}
        <div style={S.rowGroup}>
          <label style={{ fontSize: 13, color: '#374151' }}>{t('logreplay.header.logLabel')}</label>
          <div style={headerLocked ? { pointerEvents: 'none', opacity: 0.6 } : undefined}>
            <Dropdown
              size="sm"
              title={t('logreplay.header.logSelectTitle')}
              value={selectedLogId}
              options={logOptions.map((log) => ({
                name: log.labelKey ? t(log.labelKey) : log.label,
                value: log.id
              }))}
              onChange={(value) => onLogChange(value)}
            />
          </div>
          <Button
            size="sm"
            theme="default"
            onClick={handleViewLog}
            title={t('logreplay.header.logQueryTitle')}
            disabled={headerLocked || isEmptyOption}
          >
            {t('logreplay.header.query')}
          </Button>

          <Button size="sm" onClick={handleDownloadLog} disabled={headerLocked || isPreparingDownload}>
            {isPreparingDownload ? t('logreplay.header.preparingDownload') : t('logreplay.header.download')}
          </Button>

          <Button
            size="sm"
            onClick={handleOpenLichtblick}
            disabled={headerLocked || isEmptyOption || isPreparingDownload}
          >
            Lichtblick
          </Button>
        </div>

        {/* 선택한 날짜 표시 */}
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            color: '#6B7280',
            padding: '6px 8px',
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 8
          }}
          title={t('logreplay.header.selectedDateTitle')}
        >
          {t('logreplay.header.selectedDate', { date: formatDate(selectedDate) })}
        </div>
      </div>
    </div>
  )
}
