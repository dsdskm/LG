import React, { useCallback, useMemo } from 'react'
import { Dropdown, Button, Input, Calendar } from '@repo/ui'
import { format } from 'date-fns'
import { S } from '../styles'

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
          로봇 관리 | 주행 로그 리플레이{' '}
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
          <Button size="sm" theme="tertiary" title="설정" disabled={settingsDisabled}>
            ⚙️ 설정
          </Button>

          {showSettings && !settingsDisabled && (
            <div style={S.popover} onMouseEnter={openSettingsPopover} onMouseLeave={scheduleCloseSettingsPopover}>
              <div style={S.popoverHeader}>표시 옵션</div>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.value.showTrajectory}
                  onChange={(e) => settings.set({ ...settings.value, showTrajectory: e.target.checked })}
                />
                Trajectory
              </label>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.value.showGoalAndHeading}
                  onChange={(e) => settings.set({ ...settings.value, showGoalAndHeading: e.target.checked })}
                />
                Goal & Heading
              </label>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.value.showCostmap}
                  onChange={(e) => settings.set({ ...settings.value, showCostmap: e.target.checked })}
                />
                Costmap
              </label>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.value.showPlannedPath}
                  onChange={(e) => settings.set({ ...settings.value, showPlannedPath: e.target.checked })}
                />
                Planned Path
              </label>
            </div>
          )}
        </div>

        {/* 날짜 + 조회(목록 조회) */}
        <div style={S.rowGroup}>
          <label style={{ fontSize: 13, color: '#374151' }}>날짜</label>
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
            title="선택 날짜의 파일 목록 조회"
            disabled={headerLocked}
          >
            조회
          </Button>
        </div>

        {/* 로그 드롭다운 + 조회/다운로드 */}
        <div style={S.rowGroup}>
          <label style={{ fontSize: 13, color: '#374151' }}>로그</label>
          <div style={headerLocked ? { pointerEvents: 'none', opacity: 0.6 } : undefined}>
            <Dropdown
              size="sm"
              title="로그 선택"
              value={selectedLogId}
              options={logOptions.map((log) => ({
                name: log.label,
                value: log.id
              }))}
              onChange={(value) => onLogChange(value)}
            />
          </div>
          <Button
            size="sm"
            theme="default"
            onClick={handleViewLog}
            title="로그 조회"
            disabled={headerLocked || isEmptyOption}
          >
            조회
          </Button>

          <Button size="sm" onClick={handleDownloadLog} disabled={headerLocked || isPreparingDownload}>
            {isPreparingDownload ? '준비 중...' : '다운로드'}
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
          title="선택한 날짜"
        >
          선택 날짜: {formatDate(selectedDate)}
        </div>
      </div>
    </div>
  )
}
