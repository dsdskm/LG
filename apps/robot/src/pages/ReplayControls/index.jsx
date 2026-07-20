// index.jsx
import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import Header from './components/Header'
import ReplayLandingView from './components/ReplayLandingView'
import ReplayResultView from './components/ReplayResultView'
import LogEntriesUX from './components/LogEntriesUX'
import useReplayViewMode from './hooks/useReplayViewMode'
import { UX, theme } from './styles'
import { useSearchParams } from 'react-router-dom'
import { deviceApis } from '@/apis'
import useReplayControlsLogic from './hooks/useReplayControlsLogic'
import { useAnalysisThresholdsState } from './hooks/useAnalysisThresholdsState'
import { AnalysisThresholdsProvider } from './AnalysisThresholdsContext'

export default function ReplayControlsUXOnlyPage() {
  const { viewMode, resultData, onQuery, goLanding } = useReplayViewMode('landing')

  // ✅ replay state (controlled)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)

  const [searchParams] = useSearchParams()
  const deviceId = searchParams.get('deviceId')
  const [deviceName, setDeviceName] = useState('')
  const today = new Date().toISOString().slice(0, 10)

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

  const {
    selectedDate,
    logOptions,
    selectedLogId,
    isLoadingList,
    isReadingFile,
    isPreparingDownload,
    mcapTopics,
    mcapTopicStats,
    mcapTopicSamples,
    chartTimelineSamples, // ✅ 차트 전용 풀-타임라인 다운샘플 시리즈
    isChartTimelineLoading, // ✅ 풀-타임라인 로드 진행 여부
    mcapTimeRange,
    mcapRobotDescription,
    jointGroups,
    isParsingMcap,
    isInitialReady,
    mcapParseError,
    allowedDateKeys,
    systemEvents, // ✅ System/Event 로그(diagnostic + system_state 전이)
    textEntries, // ✅ Text 로그 탭용 rosout 데이터
    replayIssues, // ✅ 플레이바 이슈 마커용 실데이터(클러스터)
    replayIssuePoints, // ✅ 이전/다음 이슈 네비게이션용 개별 발생 전수
    issueCounts, // ✅ 플레이바 카운트 라벨용 실제 총계
    onDateChange,
    onLogChange,
    handleFetchListClick,
    handleViewSelectedFile,
    handleDownloadLog,
    handleOpenLichtblick,
    handleVisibleRangeChange
  } = useReplayControlsLogic({ deviceId, currentTime, isPlaying })

  // 분석 임계값(추정 기준) 상태 — 설정 UI(⚙)에서 조정, localStorage 영속
  const { thresholds, updateThreshold, resetThresholds } = useAnalysisThresholdsState()

  const isMcapLoading = isReadingFile || isParsingMcap
  // 2단계 인디케이터:
  // - 초기 로딩(Phase 1): 큰 차단형 스피너
  // - 백그라운드(Phase 2, 초기 화면은 이미 준비됨): 작은 비차단 표시
  const isInitialLoading = isMcapLoading && !isInitialReady
  const isBackgroundLoading = isMcapLoading && isInitialReady
  // Overview/탭에서 쓰기 좋은 형태로 묶어서 전달
  const mcapSummary = useMemo(
    () => ({
      topics: mcapTopics || [],
      stats: mcapTopicStats || null,
      samples: mcapTopicSamples || null,
      chartTimelineSamples: chartTimelineSamples || null, // ✅ 차트 전용 풀-타임라인
      isChartTimelineLoading: !!isChartTimelineLoading, // ✅ 풀-타임라인 로드 중 여부
      timeRange: mcapTimeRange || null,
      mcapRobotDescription: mcapRobotDescription || null
    }),
    [
      mcapTopics,
      mcapTopicStats,
      mcapTopicSamples,
      chartTimelineSamples,
      isChartTimelineLoading,
      mcapTimeRange,
      mcapRobotDescription
    ]
  )

  // 로더가 반환하는 timeRange를 함께 state로 들고 가는게 제일 깔끔함:
  // useReplayControlsLogic에 timeRange state 추가하거나, mcapSummary에 포함시키세요.
  // (아래 "3) useReplayControlsLogic" 보완안 참고)

  // ✅ totalDuration: timeRange가 있으면 로그 구간 기반으로 설정
  const totalDuration = useMemo(() => {
    const tr = mcapSummary?.timeRange
    return tr && Number.isFinite(tr.startSec) && Number.isFinite(tr.endSec)
      ? Math.max(0, tr.endSec - tr.startSec)
      : 10 * 60
  }, [mcapSummary])
  // issues — diagnostic 토픽 기반 실데이터(WARN/ERROR) 클러스터. totalDuration 범위로 클램프.
  const issues = useMemo(() => {
    const d = Number(totalDuration || 0)
    if (!Number.isFinite(d) || d <= 0) return []
    return (replayIssues || []).map((it) => ({
      ...it,
      t: Math.max(0, Math.min(d, Number(it.t) || 0)),
      tEnd: Math.max(0, Math.min(d, Number(it.tEnd ?? it.t) || 0))
    }))
  }, [replayIssues, totalDuration])

  // 이전/다음 이슈 네비게이션용 개별 발생 포인트(전수). totalDuration 범위로 클램프.
  const issueNavPoints = useMemo(() => {
    const d = Number(totalDuration || 0)
    if (!Number.isFinite(d) || d <= 0) return []
    return (replayIssuePoints || []).map((it) => ({
      ...it,
      t: Math.max(0, Math.min(d, Number(it.t) || 0))
    }))
  }, [replayIssuePoints, totalDuration])
  // ✅ handlers: ReplayControls -> 부모 state 업데이트

  const onSeek = useCallback((t) => {
    setCurrentTime(t)
  }, [])

  // ✅ 플레이바 이슈 클릭 → 로그 패널 포커스(스크롤/하이라이트). seq로 동일 시각 재클릭도 재트리거.
  const [logFocus, setLogFocus] = useState({ tSec: null, origin: undefined, seq: 0 })
  // tSec 유한값: 해당 시각 포커스 / null(또는 비유한): 하이라이트 해제
  // origin: 'system' | 'text' — 이슈 출처 탭(없으면 LogEntriesUX가 system으로 폴백)
  const handleIssueSelect = useCallback((tSec, origin) => {
    setLogFocus((p) => ({ tSec: Number.isFinite(tSec) ? tSec : null, origin, seq: p.seq + 1 }))
  }, [])

  const onTogglePlay = useCallback(() => {
    setIsPlaying((p) => !p)
  }, [])

  const onStop = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const onChangeRate = useCallback((r) => {
    const v = Number(r)
    setPlaybackRate(Number.isFinite(v) ? v : 1.0)
  }, [])

  // ✅ "처음" 버튼: 화면 + 플레이 상태까지 완전 초기화
  const handleGoLanding = useCallback(() => {
    // 1) 재생 정지
    setIsPlaying(false)
    // 2) 커서 0으로
    setCurrentTime(0)
    // 3) (선택) 속도도 기본값으로
    setPlaybackRate(1.0)
    // 4) 화면 전환
    goLanding?.()
  }, [goLanding])

  // Resizable log panel (UX only)
  const [logHeight, setLogHeight] = useState(null)
  const dragRef = useRef({ active: false, startY: 0, startH: 0 })
  const logWrapRef = useRef(null)

  // ✅ 초기 진입 시 로그 영역이 너무 작지 않도록 기본 높이 확보
  useEffect(() => {
    if (logHeight != null) return
    const h = Math.round(window.innerHeight * 0.28) // 기본 28vh 느낌
    setLogHeight(Math.max(220, Math.min(h, window.innerHeight * 0.6)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault()

    // ✅ nextSibling 의존 제거: 실제 로그 wrapper 높이를 ref로 측정
    const currentH = logWrapRef.current?.getBoundingClientRect().height ?? 240
    dragRef.current = { active: true, startY: e.clientY, startH: currentH }

    function onMove(ev) {
      if (!dragRef.current.active) return
      const delta = dragRef.current.startY - ev.clientY
      const newH = Math.min(Math.max(dragRef.current.startH + delta, 80), window.innerHeight * 0.6)
      setLogHeight(Math.round(newH))
    }
    function onUp() {
      dragRef.current.active = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const handleQuery = async ({ source }) => {
    if (source === 'date') {
      // ✅ 날짜 조회: 로그 리스트만 갱신
      await handleFetchListClick()
      return
    }

    if (source === 'log') {
      // ✅ 로그 조회: result 화면을 먼저 띄워서(=스피너 노출 가능) 로딩 진행
      onQuery?.({ source })
      try {
        await handleViewSelectedFile() // (3) 읽기 + parsing 트리거
      } catch (e) {
        console.error('[Replay][handleViewSelectedFile] failed', e)
        // 필요하면 landing으로 되돌리는 정책도 가능:
        // goLanding?.()
      }
    }
  }

  return (
    <div style={UX.page}>
      {/* ✅ Header: 조회가 onQuery를 호출하도록 */}
      <Header
        robotName={deviceName}
        deviceId={deviceId}
        selectedDate={selectedDate}
        onDateChange={(date) => {
          handleGoLanding() // ✅ 플레이 + 화면 초기화
          onDateChange(date) // ✅ 날짜 상태 변경
        }}
        logOptions={logOptions}
        selectedLogId={selectedLogId}
        onLogChange={(logId) => {
          handleGoLanding() // ✅ 플레이 + 화면 초기화
          onLogChange(logId) // ✅ 날짜 상태 변경
        }}
        onDownload={handleDownloadLog} // (4)
        handleOpenLichtblick={handleOpenLichtblick}
        handleVisibleRangeChange={handleVisibleRangeChange}
        allowedDateKeys={allowedDateKeys}
        isPreparingDownload={isPreparingDownload || isLoadingList || isReadingFile}
        mode={viewMode}
        onQuery={handleQuery}
        onBack={handleGoLanding}
      />

      <div style={UX.layout}>
        <div style={UX.mainShell}>
          {/* ✅ Main: viewMode로만 분기 (resultData 존재여부로 landing으로 되돌아가지 않게) */}
          {viewMode === 'landing' ? (
            <ReplayLandingView
              currentTime={currentTime}
              totalDuration={totalDuration}
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              issues={issues}
            />
          ) : (
            <AnalysisThresholdsProvider value={thresholds}>
              <ReplayResultView
                resultData={resultData}
                currentTime={currentTime}
                totalDuration={totalDuration}
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                onSeek={onSeek}
                onTogglePlay={onTogglePlay}
                onStop={onStop}
                onChangeRate={onChangeRate}
                issues={issues}
                issueNavPoints={issueNavPoints}
                issueCounts={issueCounts}
                onIssueSelect={handleIssueSelect}
                mcapSummary={mcapSummary}
                jointGroups={jointGroups}
                isParsingMcap={isParsingMcap}
                mcapParseError={mcapParseError}
                isInitialLoading={isInitialLoading}
                isBackgroundLoading={isBackgroundLoading}
                viewMode={viewMode}
                // 분석 임계값 설정(⚙)
                thresholds={thresholds}
                onChangeThreshold={updateThreshold}
                onResetThresholds={resetThresholds}
              />
            </AnalysisThresholdsProvider>
          )}
        </div>

        <div style={UX.resizeHandle} onMouseDown={handleResizeMouseDown}>
          <div style={UX.resizeGrip} />
        </div>

        <div
          ref={logWrapRef}
          style={{
            ...UX.logWrap,
            height: logHeight ? `${logHeight}px` : '28vh',
            minHeight: 220, // ✅ 너무 얇아지는 것 방지
            maxHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* ✅ 내부가 부모 높이를 꽉 쓰도록 */}
          <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <LogEntriesUX
              diagnosticEvents={systemEvents}
              textEntries={textEntries}
              isParsingMcap={isParsingMcap}
              mcapParseError={mcapParseError}
              onSeek={onSeek}
              logFocus={logFocus}
              currentTime={currentTime}
              timeRange={mcapTimeRange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
