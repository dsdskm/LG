// hooks/useLogReplayLogic.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useLogReplayPlayer2D from './useLogReplayPlayer2D.js'
import useLogReplayData from './useLogReplayData.js'
import { makeMapPlaceholder, detectLevel } from '../logReplayRender.js'

const INITIAL_HINT = 'mcap 파일 선택 후 조회 버튼을 눌러주세요'

export function useLogReplayLogic({ initialDate, deviceId }) {
  // 상/하단 레이아웃
  const [topRatio, setTopRatio] = useState(60)
  const containerRef = useRef(null)
  const isDraggingRef = useRef(false)
  const onDragging = useCallback((e) => {
    if (!isDraggingRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const headerHeight = containerRef.current.querySelector('#headerWrap')?.getBoundingClientRect().height || 0
    const y = e.clientY - rect.top - headerHeight
    const contentHeight = rect.height - headerHeight
    if (contentHeight <= 0) return
    let ratio = (y / contentHeight) * 100
    const minTopPx = 200
    const minBottomPx = 120
    const minTopRatio = (minTopPx / contentHeight) * 100
    const maxTopRatio = 100 - (minBottomPx / contentHeight) * 100
    ratio = Math.max(minTopRatio, Math.min(maxTopRatio, ratio))
    setTopRatio(ratio)
  }, [])
  const onDragEnd = useCallback(() => {
    isDraggingRef.current = false
    document.removeEventListener('mousemove', onDragging)
    document.removeEventListener('mouseup', onDragEnd)
  }, [onDragging])
  const onDragStart = useCallback(
    (e) => {
      e.preventDefault()
      isDraggingRef.current = true
      document.addEventListener('mousemove', onDragging)
      document.addEventListener('mouseup', onDragEnd)
    },
    [onDragging, onDragEnd]
  )

  // 데이터 상태
  const [pathPoints, setPathPoints] = useState([])
  const [gridData, setGridData] = useState(null)
  const [localCostmapData, setLocalCostmapData] = useState(null)
  const [localCostmapFrames, setLocalCostmapFrames] = useState([])
  const [plannedPathPoints, setPlannedPathPoints] = useState([])
  const [lidarScans, setLidarScans] = useState([])
  const [dwaGoals, setDwaGoals] = useState([])
  const [t0EpochMs, setT0EpochMs] = useState(null)
  const [durationMs, setDurationMs] = useState(0) // ✅ ADD
  const [loadPhase, setLoadPhase] = useState('init')
  // 설정 팝오버
  const [showSettings, setShowSettings] = useState(false)
  const settingsHoverTimer = useRef(null)
  const [settingsValue, setSettings] = useState({
    showTrajectory: true, // 실제 주행 궤적
    showPlannedPath: true, // 계획 경로
    showCostmap: true, // local costmap / obstacles
    showGoalAndHeading: true // DWA goal + 로봇 방향
  })
  const settings = useMemo(() => ({ value: settingsValue, set: setSettings }), [settingsValue])

  // 플레이어(2D/3D/뷰/재생/시간/버퍼/렌더)
  const player = useLogReplayPlayer2D({
    pathPoints,
    plannedPathPoints,
    gridData,
    localCostmapData,
    localCostmapFrames,
    lidarScans,
    dwaGoals,
    renderOptions: settingsValue,
    loadPhase,
    t0EpochMs,
    durationMs
  })
  const {
    canvasRef,
    renderNow,
    updateBuffer,
    isPlaying,
    setIsPlaying,
    playIndex,
    setPlayIndex,
    playTimeSec,
    setPlayTimeSec,
    playbackRate,
    setPlaybackRate,
    playRatio,
    playFillStartRatio,
    bufferRatio,
    view,
    setView,
    resetView,
    onCanvasWheel,
    onCanvasMouseDown,
    progressBarRef,
    handleProgressPointerDown,

    // ▼ 진행바 Hover 툴팁 (반드시 전달)
    onProgressMouseEnter,
    onProgressMouseMove,
    onProgressMouseLeave,
    hoverVisible,
    hoverMs,
    hoverRatio,
    hoverAbsLabel,

    handlePrevFrame,
    handleTogglePlay,
    handleNextFrame,
    canPlay,
    leftPlayable,
    controlsDisabled,
    currentTimestampMs,
    formattedCurrentTime,
    formattedDuration,
    threeMountRef,
    poses3d,
    setPoses3d,
    durationSec,
    currentTimeSec,
    resetPlaybackRefs
  } = player

  // ✅ ref로 읽어서 함수 참조를 안정화 (무한 렌더 루프 방지)
  const playTimeSecValRef = useRef(0)
  useEffect(() => {
    playTimeSecValRef.current = playTimeSec
  }, [playTimeSec])

  const getPlayTimeSec = useCallback(() => {
    return Number(playTimeSecValRef.current) || 0
  }, []) // ← 빈 deps: 함수 참조 불변

  // ✅ 재생 여부도 ref로 안정화 → tick이 seek/재생을 추측이 아닌 "실제 상태"로 판정
  const isPlayingValRef = useRef(false)
  useEffect(() => {
    isPlayingValRef.current = isPlaying
  }, [isPlaying])
  const getIsPlaying = useCallback(() => !!isPlayingValRef.current, [])

  // 데이터/검색/서버/다운로드
  const data = useLogReplayData({
    setPathPoints,
    setGridData,
    setLocalCostmapData,
    setLocalCostmapFrames,
    setPlannedPathPoints,
    setLidarScans,
    setDwaGoals,
    setLoadPhase,
    setT0EpochMs,
    setDurationMs,
    updateBuffer,
    renderNow,
    resetView,
    deviceId,
    // ✅ ADD
    getPlayTimeSec,
    getIsPlaying
  })

  const {
    logOptions,
    selectedDate,
    selectedLogId,
    onDateChange,
    onLogChange,
    handleFetchListClick,
    handleVisibleRangeChange,
    allowedDateKeys,
    logLines,
    filteredLines,
    isLoadingLogs,
    hasAnyTarLogs,
    isLoadingTar,
    tarError,
    logError,
    levelFilter,
    setLevelFilter,
    pendingKeyword,
    setPendingKeyword,
    appliedKeyword,
    handleKeywordSearchClick,
    isPreparingDownload,
    handleDownloadLog,
    handleOpenLichtblick,
    loadPhase: _loadPhaseFromData,
    rightOverlayVisible,
    rightOverlayText,
    formatDate,
    handleViewLog,
    queryWindow,

    odomChart1,
    odomChart2,
    chartLoading,
    clearReplaySession
  } = data
  const WINDOW_SEC = 10
  const windowTimerRef = useRef(0)
  const [windowLogLines, setWindowLogLines] = useState([])
  const [windowFilteredLines, setWindowFilteredLines] = useState([])

  // - false: 타임라인(windowQuery)과 일치하는 로그만 표시
  // - true : 타임라인 무시(전체 로그 표시) + 검색도 항상 전체 기준(global search)으로 동작
  // ※ UI로 노출하지 않음. 소스에서만 true/false로 직접 변경.
  const IGNORE_TIMELINE_FOR_LOGS = true

  const activeLevelsForWindow = useMemo(() => {
    const lv = levelFilter || {}
    return Object.entries(lv)
      .filter(([, v]) => !!v)
      .map(([k]) => k)
  }, [levelFilter])
  useEffect(() => {
    if (!queryWindow) return

    // ✅ 소스 플래그가 true면 windowQuery를 돌리지 않음(표시/검색 모두 global 소스 사용)
    if (IGNORE_TIMELINE_FOR_LOGS) {
      // ✅ 이미 비어있으면 setState 하지 않기 (렌더 루프 방지)
      setWindowLogLines((prev) => (Array.isArray(prev) && prev.length === 0 ? prev : []))
      setWindowFilteredLines((prev) => (Array.isArray(prev) && prev.length === 0 ? prev : []))
      return
    }

    if (!activeLevelsForWindow || activeLevelsForWindow.length === 0) {
      setWindowLogLines([])
      setWindowFilteredLines([])
      return
    }

    // ✅ 이미 예약된 실행이 있으면 중복 예약하지 않음 (throttle/coalesce)
    if (windowTimerRef.current) return
    windowTimerRef.current = setTimeout(async () => {
      // 콜백 시작과 동시에 pending 해제 (다음 예약 허용)
      windowTimerRef.current = 0

      // ✅ 플레이바와 동일한 시간축(절대 epoch ms)을 사용

      // ✅ currentTimestampMs가 0(초기값/센티널)이면 epoch로 쓰지 말고 t0EpochMs 기반으로 계산
      const hasValidEpochTs =
        typeof currentTimestampMs === 'number' &&
        Number.isFinite(currentTimestampMs) &&
        currentTimestampMs > 1_000_000_000_000 // 2001년 이후 epoch(ms) 대략 스케일 체크

      const baseMs = hasValidEpochTs
        ? currentTimestampMs
        : typeof t0EpochMs === 'number' && Number.isFinite(t0EpochMs) && t0EpochMs > 0
          ? t0EpochMs + Math.round((Number(currentTimeSec) || 0) * 1000)
          : Math.round((Number(currentTimeSec) || 0) * 1000)

      const fromMs = baseMs - WINDOW_SEC * 1000
      const toMs = baseMs

      try {
        const raw = await queryWindow({
          levels: activeLevelsForWindow,
          keyword: '',
          fromMs,
          toMs,
          limit: 5000
        })
        setWindowLogLines(raw)
        const kw = (appliedKeyword || '').trim()
        if (kw) {
          const searched = await queryWindow({
            levels: activeLevelsForWindow,
            keyword: kw,
            fromMs,
            toMs,
            limit: 5000
          })
          setWindowFilteredLines(searched)
        } else {
          setWindowFilteredLines([])
        }
      } catch {
        setWindowLogLines([])
        setWindowFilteredLines([])
      }
    }, 80)

    return () => {
      if (windowTimerRef.current) clearTimeout(windowTimerRef.current)
      windowTimerRef.current = 0
    }
  }, [queryWindow, currentTimeSec, currentTimestampMs, t0EpochMs, appliedKeyword, activeLevelsForWindow])

  // 초기 날짜 적용
  useEffect(() => {
    if (initialDate) onDateChange(initialDate)
  }, [initialDate, onDateChange])

  // 맵(플레이스홀더)
  const mapSrc2 = useMemo(() => makeMapPlaceholder(INITIAL_HINT), [])

  // 로그 영역 ref
  const logContainerRef = useRef(null)
  const isLogLoading = isLoadingLogs || isLoadingTar

  const emptyLogMessage = useMemo(() => {
    if (isLoadingLogs) return '' // 로딩 중은 LogsSection이 처리

    // ✅ 타임라인 무시 모드에서는 "타임라인 불일치" 문구를 쓰지 않음
    if (!IGNORE_TIMELINE_FOR_LOGS && hasAnyTarLogs) {
      return '현재 타임라인과 일치하는 로그가 없습니다.'
    }
    return '표시할 로그가 없습니다.'
  }, [isLoadingLogs, hasAnyTarLogs])
  // 변경 시 초기화

  // ✅ 최종 UI 표시용 소스 선택
  const uiLogLines = IGNORE_TIMELINE_FOR_LOGS ? logLines : windowLogLines
  const uiFilteredLines = IGNORE_TIMELINE_FOR_LOGS ? filteredLines : windowFilteredLines

  const resetViews = useCallback(async () => {
    try {
      resetPlaybackRefs?.()
    } catch {}

    setIsPlaying(false)
    setPlayIndex(0)
    setPlayTimeSec(0)
    setPlannedPathPoints([])
    setPathPoints([])
    setGridData(null)
    setLocalCostmapData?.(null)
    setLocalCostmapFrames([])
    setLidarScans([])
    setDwaGoals([])
    setPoses3d([])
    setLoadPhase('init')
    setT0EpochMs(null)
    setDurationMs(0)

    updateBuffer(0)
    resetView()
    renderNow()
  }, [
    setIsPlaying,
    setPlayIndex,
    setPlayTimeSec,
    setPlannedPathPoints,
    setPathPoints,
    setGridData,
    setLocalCostmapData,
    setLocalCostmapFrames,
    setLidarScans,
    setDwaGoals,
    setPoses3d,
    setLoadPhase,
    setT0EpochMs,
    setDurationMs, // ✅ dep 추가
    updateBuffer,
    resetView,
    renderNow,
    resetPlaybackRefs
  ])

  const onDateChangeAndReset = useCallback(
    (date) => {
      const isDifferent = date !== selectedDate
      onDateChange(date)
      if (isDifferent) {
        resetViews()
        clearReplaySession() // ✅ 핵심: 이전 세션 완전 종료
      }
    },
    [selectedDate, onDateChange, resetViews]
  )

  const onLogChangeAndReset = useCallback(
    (value) => {
      const isDifferent = value !== selectedLogId
      onLogChange(value)
      if (isDifferent) resetViews()
    },
    [selectedLogId, onLogChange, resetViews]
  )

  return {
    // 데이터/상태
    logOptions,
    selectedDate,
    selectedLogId,
    lidarScans,
    dwaGoals,
    isPlaying,
    playIndex,
    showSettings,
    settings,

    // UI/refs
    logLines: uiLogLines,
    isLoadingLogs: isLogLoading, // ✅ 의미 교체 (이름 유지)
    emptyLogMessage,
    tarError,
    logError,
    levelFilter,
    pendingKeyword,
    appliedKeyword,
    topRatio,
    containerRef,
    logContainerRef,

    // 맵/캔버스
    mapSrc2,
    canvasRef,

    // 진행바
    progressBarRef,

    // 시간 표시
    currentTimestampMs,
    durationMs,
    formattedCurrentTime,
    formattedDuration,

    // 진행비율
    playRatio,
    playFillStartRatio,
    bufferRatio,

    // 뷰/줌·팬
    view,
    setView,
    resetView,

    // 3D
    threeMountRef,
    poses3d,
    durationSec,
    currentTimeSec,

    // 2D 플레이어 시간
    playTimeSec,

    // 배속
    playbackRate,
    setPlaybackRate,

    // 게이팅
    loadPhase,
    canPlay,
    leftPlayable,
    controlsDisabled,
    rightOverlayVisible,
    rightOverlayText,

    // 리스트/검색
    filteredLines: uiFilteredLines,
    isPreparingDownload,

    // 핸들러/유틸
    handleOpenLichtblick,
    formatDate,
    detectLevel,

    // 핸들러
    openSettingsPopover: useCallback(() => {
      if (settingsHoverTimer.current) clearTimeout(settingsHoverTimer.current)
      setShowSettings(true)
    }, []),
    scheduleCloseSettingsPopover: useCallback(() => {
      if (settingsHoverTimer.current) clearTimeout(settingsHoverTimer.current)
      settingsHoverTimer.current = setTimeout(() => setShowSettings(false), 150)
    }, []),
    handlePrevFrame,
    handleTogglePlay,
    handleNextFrame,
    handleDownloadLog,
    handleViewLog,
    handleKeywordSearchClick,
    handleFetchListClick,
    handleVisibleRangeChange,
    allowedDateKeys,
    toggleLevel: useCallback((lv) => setLevelFilter((f) => ({ ...f, [lv]: !f[lv] })), [setLevelFilter]),
    onDragStart,
    onDateChange: onDateChangeAndReset,
    onLogChange: onLogChangeAndReset,
    setPendingKeyword,
    setPlayIndex,

    // 진행/캔버스 인터랙션
    handleProgressPointerDown,
    onCanvasWheel,
    onCanvasMouseDown,

    // ▼ 진행바 Hover 툴팁 (반드시 전달)
    onProgressMouseEnter,
    onProgressMouseMove,
    onProgressMouseLeave,
    hoverVisible,
    hoverMs,
    hoverRatio,
    hoverAbsLabel,

    // 커버리지(오른쪽)
    coveragePathPoints: pathPoints,

    gridData,
    pathPoints, // 3D용 (coveragePathPoints와 동일 소스, 이름 명시)
    lidarScans,
    localCostmapFrames,
    dwaGoals,
    t0EpochMs,

    odomChart1,
    odomChart2,
    chartLoading
  }
}
