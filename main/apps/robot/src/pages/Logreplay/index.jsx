import React, { useMemo, useState, useEffect } from 'react'
import { useLogReplayLogic } from './hooks/useLogReplayLogic'
import { useSearchParams } from 'react-router-dom'
import { deviceApis } from '@/apis'

// 분리된 UI 컴포넌트
import HeaderControlsOrig from './components/HeaderControls'
import MapPanelsOrig from './components/MapPanels'
import PlayerBarOrig from './components/PlayerBar'
import LogsSectionOrig from './components/LogsSection'
import useLogSearch from './hooks/useLogSearch'

// 스타일
import { S } from './styles'

/* ============================================
   보조: 얕은 비교 + Header 전용 props 비교 함수
   ============================================ */

// 얕은 비교(참조 동일성 위주). 필요한 키만 비교해 비용 최소화.
function shallowEqualKeys(a, b, keys) {
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    if (a[k] !== b[k]) return false
  }
  return true
}

// ★ 헤더는 느리게 변하는 값만 비교: 불필요 리렌더 완전 차단
const HeaderControls = React.memo(HeaderControlsOrig, (prev, next) => {
  // 반드시 헤더에 필요한 값만 비교하세요.
  return shallowEqualKeys(prev, next, [
    'robotName',
    'deviceId',
    'headerLocked',
    'showSettings',
    'settings',
    'selectedDate',
    'selectedLogId',
    'isEmptyOption',
    'isPreparingDownload',
    'formatDate',
    // 함수 레퍼런스는 훅에서 useCallback으로 고정되어 있다는 전제
    'openSettingsPopover',
    'scheduleCloseSettingsPopover',
    'handleFetchListClick',
    'handleVisibleRangeChange',
    'allowedDateKeys',
    'onLogChange',
    'handleViewLog',
    'handleDownloadLog',
    'handleOpenLichtblick',
    // 배열은 참조 동일성 유지가 중요 (훅에서 useMemo로 보장)
    'logOptions'
  ])
})

// ★ 나머지도 기본 메모 적용 (props가 바뀌지 않으면 스킵)
const MapPanels = React.memo(MapPanelsOrig)
const PlayerBar = React.memo(PlayerBarOrig)
const LogsSection = React.memo(LogsSectionOrig)

/* ============================================
   유틸: msToClock - 컴포넌트 외부로 이동(참조 고정)
   ============================================ */
function msToClock(ms) {
  try {
    if (typeof ms !== 'number' || !isFinite(ms)) return '00:00.000'
    const sign = ms < 0 ? '-' : ''
    const abs = Math.abs(ms)
    const minutes = Math.floor(abs / 60000)
    const seconds = Math.floor((abs % 60000) / 1000)
    const millis = Math.floor(abs % 1000)
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    const SSS = String(millis).padStart(3, '0')
    return `${sign}${mm}:${ss}.${SSS}`
  } catch {
    return '00:00.000'
  }
}

/* ============================================
   A 방안: 컨테이너 두 층으로 분리
   - HeaderContainer: headerProps만 받아서 고정
   - BodyContainer: 나머지 무거운 본문 전용
   ============================================ */

// HeaderContainer는 headerProps 레퍼런스만 비교하여 스킵
const HeaderContainer = React.memo(
  function HeaderContainerInner({ headerProps }) {
    return <HeaderControls {...headerProps} />
  },
  (prev, next) => prev.headerProps === next.headerProps
)

// BodyContainer는 본문 상태 변화에만 반응
const BodyContainer = React.memo(
  function BodyContainerInner(props) {
    const {
      // 스타일/레이아웃
      topRatio,

      // 맵/플레이어 공통
      canvasRef,
      threeMountRef,
      currentTimestampMs,
      durationMs,
      formattedCurrentTime,
      formattedDuration,
      isLoadingLogs,
      canPlay,
      loadPhase,
      leftPlayable,
      onCanvasMouseDown,
      hoverVisible,
      hoverMs,
      hoverRatio,
      hoverAbsLabel,

      // 공통 유틸
      msToClock,

      // 커버리지/맵 데이터
      mapGrid,
      coveragePathPoints,

      gridData,
      pathPoints,
      lidarScans,
      localCostmapFrames,
      dwaGoals,
      t0EpochMs,

      odomChart1,
      odomChart2,
      chartLoading,
      // 토글
      showSensor,
      setShowSensor,

      // 플레이어 바
      progressBarRef,
      onProgressMouseEnter,
      onProgressMouseMove,
      onProgressMouseLeave,
      handleProgressPointerDown,
      playRatio,
      playFillStartRatio,
      bufferRatio,
      handlePrevFrame,
      handleTogglePlay,
      handleNextFrame,
      playbackRate,
      setPlaybackRate,
      isPlaying,

      // 로그 영역
      selectedLabel,
      selectedDate,
      logError,
      logLines,
      filteredLines,
      displayLines,
      detectLevel,
      logContainerRef,
      levelFilter,
      toggleLevel,
      pendingKeyword,
      setPendingKeyword,
      handleKeywordSearchClick,
      appliedKeyword,
      emptyLogMessage,
      formatDate,

      // 드래그 바
      onDragStart
    } = props

    return (
      <>
        {/* 상단(맵) */}
        <div style={{ ...S.topPane, height: `calc(${topRatio}% - 4px)` }}>
          <MapPanels
            // 캔버스/3D
            canvasRef={canvasRef}
            threeMountRef={threeMountRef}
            // 시간 표시
            currentTimestampMs={currentTimestampMs}
            durationMs={durationMs}
            formattedCurrentTime={formattedCurrentTime}
            formattedDuration={formattedDuration}
            // 상태
            isLoadingLogs={isLoadingLogs}
            canPlay={canPlay}
            loadPhase={loadPhase}
            leftPlayable={leftPlayable}
            // 인터랙션
            onCanvasMouseDown={onCanvasMouseDown}
            // onCanvasWheel={onCanvasWheel} // non-passive로 addEventListener 등록했다면 주석 유지
            msToClock={msToClock}
            // 이동면적(오른쪽 패널)
            coverageGrid={mapGrid}
            coveragePathPoints={coveragePathPoints}
            gridData={gridData}
            pathPoints={pathPoints}
            lidarScans={lidarScans}
            localCostmapFrames={localCostmapFrames}
            dwaGoals={dwaGoals}
            t0EpochMs={t0EpochMs}
            // 신규 추가
            showSensor={showSensor}
            setShowSensor={setShowSensor}
            odomChart1={odomChart1}
            odomChart2={odomChart2}
            chartLoading={chartLoading}
          />

          {/* 공통 플레이어 바 (두 맵 하단 전체 폭) */}
          <PlayerBar
            // 게이팅
            canPlay={canPlay}
            isPlaying={isPlaying}
            // 프레임 스텝/토글
            handlePrevFrame={handlePrevFrame}
            handleTogglePlay={handleTogglePlay}
            handleNextFrame={handleNextFrame}
            // 진행바
            progressBarRef={progressBarRef}
            handleProgressPointerDown={handleProgressPointerDown}
            onProgressMouseEnter={onProgressMouseEnter}
            onProgressMouseMove={onProgressMouseMove}
            onProgressMouseLeave={onProgressMouseLeave}
            playRatio={playRatio}
            playFillStartRatio={playFillStartRatio}
            bufferRatio={bufferRatio}
            // 시간 라벨
            currentTimestampMs={currentTimestampMs}
            durationMs={durationMs}
            formattedCurrentTime={formattedCurrentTime}
            formattedDuration={formattedDuration}
            msToClock={msToClock}
            // 배속 UX 연결
            playbackRate={playbackRate}
            onChangePlaybackRate={setPlaybackRate}
            // 스텝 가능 여부는 경로 준비 기준
            canStep={leftPlayable}
            hoverVisible={hoverVisible}
            hoverMs={hoverMs}
            hoverRatio={hoverRatio}
            hoverAbsLabel={hoverAbsLabel}
          />
        </div>

        {/* 드래그 바 */}
        <div style={S.dragBar} onMouseDown={onDragStart} title="위/아래 영역 높이를 드래그로 조절" />

        {/* 하단(로그 영역) */}
        <LogsSection
          selectedLabel={selectedLabel}
          selectedDate={selectedDate}
          // 로그 데이터
          isLoadingLogs={isLoadingLogs}
          logError={logError}
          logLines={logLines}
          filteredLines={filteredLines}
          detectLevel={detectLevel}
          logContainerRef={logContainerRef}
          // 필터
          levelFilter={levelFilter}
          toggleLevel={toggleLevel}
          pendingKeyword={pendingKeyword}
          setPendingKeyword={setPendingKeyword}
          handleKeywordSearchClick={handleKeywordSearchClick}
          appliedKeyword={appliedKeyword}
          emptyLogMessage={emptyLogMessage}
          loadPhase={loadPhase}
          // 유틸
          formatDate={formatDate}
        />
      </>
    )
  },
  (prev, next) => {
    // ✅ loadPhase가 init 전환 시 → 1 frame defer 후 re-render
    //    click handler 동기 blocking 방지
    if (next.loadPhase === 'init' && prev.loadPhase !== 'init') {
      // 다음 tick에서 강제 re-render 트리거
      setTimeout(() => next._forceUpdate?.(), 0)
      return true // 이번 render는 skip
    }

    const keys = Object.keys(next)
    for (let i = 0; i < keys.length; i++) {
      if (prev[keys[i]] !== next[keys[i]]) return false
    }
    return true
  }
)

export default function Logreplay({ robotName = '로봇 명', initialDate }) {
  // ✅ BodyContainer deferred re-render용
  const [bodyKey, setBodyKey] = useState(0)

  const [searchParams] = useSearchParams()
  const deviceId = searchParams.get('deviceId')
  const [deviceName, setDeviceName] = useState('')

  const {
    // 시간 표시
    currentTimestampMs,
    durationMs,
    formattedCurrentTime,
    formattedDuration,

    // 상태/데이터
    logOptions,
    selectedDate,
    selectedLogId,
    isPlaying,
    playIndex,
    showSettings,
    settings,
    dateInputRef,
    logLines,
    isLoadingLogs,
    logError,
    levelFilter,
    pendingKeyword,
    appliedKeyword,
    emptyLogMessage,
    topRatio,
    containerRef,
    filteredLines,
    displayLines,
    isPreparingDownload,

    // 게이팅
    loadPhase,
    canPlay,
    leftPlayable,

    // ref
    threeMountRef,
    canvasRef,
    progressBarRef,
    logContainerRef,

    // 진행비율(시간 기반)
    playRatio,
    playFillStartRatio,
    bufferRatio,

    // 유틸
    formatDate,
    detectLevel,

    // 핸들러
    openSettingsPopover,
    scheduleCloseSettingsPopover,
    handlePrevFrame,
    handleTogglePlay,
    handleNextFrame,
    handleDownloadLog,
    handleViewLog,
    handleKeywordSearchClick,
    handleFetchListClick,
    handleVisibleRangeChange,
    allowedDateKeys,
    handleOpenLichtblick,
    toggleLevel,
    onDragStart,
    onDateChange,
    onLogChange,
    setPendingKeyword,

    // 캔버스/진행바 인터랙션
    handleProgressPointerDown,
    onCanvasWheel, // non-passive로 바인딩되어 있어도 prop으로 유지(필요 시 재연결 가능)
    onCanvasMouseDown,

    // 커버리지 패널용
    mapGrid,
    coveragePathPoints,

    gridData,
    pathPoints,
    lidarScans,
    localCostmapFrames,
    dwaGoals,
    t0EpochMs,

    odomChart1,
    odomChart2,
    chartLoading,

    // 배속 (훅에서 제공)
    playbackRate,
    setPlaybackRate,

    // ▼ 진행바 Hover 툴팁(로직은 훅에서 계산)
    onProgressMouseEnter,
    onProgressMouseMove,
    onProgressMouseLeave,
    hoverVisible,
    hoverMs,
    hoverRatio,
    hoverAbsLabel
  } = useLogReplayLogic({ initialDate, deviceId })

  const getDeviceName = async () => {
    try {
      const data = await deviceApis.getDeviceInfo(deviceId)
      if (!data?.deviceName) return
      setDeviceName((prev) => (prev === data.deviceName ? prev : data.deviceName))
    } catch (err) {
      console.error('Error loadGetDevices:', err)
    }
  }

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const data = await deviceApis.getDeviceInfo(deviceId)
        if (!canceled && data?.deviceName) {
          setDeviceName((prev) => (prev === data.deviceName ? prev : data.deviceName))
        }
      } catch (e) {
        console.error('Error loadGetDevices:', e)
      }
    })()
    return () => {
      canceled = true
    }
  }, [deviceId])

  const selectedLabel = useMemo(() => {
    return logOptions.find((l) => l.id === selectedLogId)?.label ?? (logOptions[0]?.label || '로그 없음')
  }, [logOptions, selectedLogId])

  const isEmptyOption = selectedLogId === '__empty__'
  const headerLocked = isPlaying || isLoadingLogs

  // ★ 센서 토글 상태 (MapPanels에 전달)
  const [showSensor, setShowSensor] = useState(false)

  // ★★★ 헤더에 전달할 props 묶음을 안정 레퍼런스로 고정
  const headerProps = useMemo(
    () => ({
      robotName: deviceName || robotName,
      deviceId,
      headerLocked,
      showSettings,
      settings,
      openSettingsPopover,
      scheduleCloseSettingsPopover,
      selectedDate,
      onDateChange,
      handleFetchListClick,
      handleVisibleRangeChange,
      allowedDateKeys,
      selectedLogId,
      logOptions,
      onLogChange,
      handleViewLog,
      isEmptyOption,
      handleDownloadLog,
      handleOpenLichtblick,
      isPreparingDownload,
      formatDate
    }),
    [
      deviceName,
      robotName,
      headerLocked,
      showSettings,
      settings,
      openSettingsPopover,
      scheduleCloseSettingsPopover,
      selectedDate,
      onDateChange,
      handleFetchListClick,
      handleVisibleRangeChange,
      allowedDateKeys,
      selectedLogId,
      logOptions,
      onLogChange,
      handleViewLog,
      isEmptyOption,
      handleDownloadLog,
      handleOpenLichtblick,
      isPreparingDownload,
      formatDate
    ]
  )

  return (
    <div ref={containerRef} style={S.page}>
      {/* 헤더: 별도 컨테이너로 분리, 안정 props + memo로 고정 */}
      <HeaderContainer headerProps={headerProps} />

      {/* 본문: 무거운 렌더는 여기로 격리 */}
      <div style={S.content}>
        <BodyContainer
          key={bodyKey}
          _forceUpdate={() => setBodyKey((k) => k + 1)}
          // 레이아웃
          topRatio={topRatio}
          // 맵/플레이어 공통
          canvasRef={canvasRef}
          threeMountRef={threeMountRef}
          currentTimestampMs={currentTimestampMs}
          durationMs={durationMs}
          formattedCurrentTime={formattedCurrentTime}
          formattedDuration={formattedDuration}
          isLoadingLogs={isLoadingLogs}
          canPlay={canPlay}
          loadPhase={loadPhase}
          leftPlayable={leftPlayable}
          onCanvasMouseDown={onCanvasMouseDown}
          // 유틸
          msToClock={msToClock}
          // 커버리지
          mapGrid={mapGrid}
          coveragePathPoints={coveragePathPoints}
          gridData={gridData}
          pathPoints={pathPoints}
          lidarScans={lidarScans}
          localCostmapFrames={localCostmapFrames}
          dwaGoals={dwaGoals}
          t0EpochMs={t0EpochMs}
          odomChart1={odomChart1}
          odomChart2={odomChart2}
          chartLoading={chartLoading}
          // 토글
          showSensor={showSensor}
          setShowSensor={setShowSensor}
          // 플레이어 바
          progressBarRef={progressBarRef}
          handleProgressPointerDown={handleProgressPointerDown}
          playRatio={playRatio}
          playFillStartRatio={playFillStartRatio}
          bufferRatio={bufferRatio}
          handlePrevFrame={handlePrevFrame}
          handleTogglePlay={handleTogglePlay}
          handleNextFrame={handleNextFrame}
          playbackRate={playbackRate}
          setPlaybackRate={setPlaybackRate}
          isPlaying={isPlaying}
          // 진행바 Hover 툴팁(이벤트/값 전달)
          onProgressMouseEnter={onProgressMouseEnter}
          onProgressMouseMove={onProgressMouseMove}
          onProgressMouseLeave={onProgressMouseLeave}
          hoverVisible={hoverVisible}
          hoverMs={hoverMs}
          hoverRatio={hoverRatio}
          hoverAbsLabel={hoverAbsLabel}
          // 로그
          selectedLabel={selectedLabel}
          selectedDate={selectedDate}
          logError={logError}
          logLines={logLines}
          filteredLines={filteredLines}
          displayLines={displayLines}
          detectLevel={detectLevel}
          logContainerRef={logContainerRef}
          levelFilter={levelFilter}
          toggleLevel={toggleLevel}
          pendingKeyword={pendingKeyword}
          setPendingKeyword={setPendingKeyword}
          handleKeywordSearchClick={handleKeywordSearchClick}
          appliedKeyword={appliedKeyword}
          emptyLogMessage={emptyLogMessage}
          formatDate={formatDate}
          // 드래그 바
          onDragStart={onDragStart}
        />
      </div>
    </div>
  )
}
