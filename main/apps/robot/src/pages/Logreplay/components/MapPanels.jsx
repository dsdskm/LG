// Logreplay/components/MapPanels.jsx
import React, { memo, useMemo, useRef, useEffect, useState } from 'react'
import { S } from '../styles'
import SensorChart from './SensorChart'
import { Button } from '@repo/ui'
import DrivingMap3D from './DrivingMap3D'

// ✅ SensorChart에 넘기는 labels/colors는 정적이므로 모듈 상수로 고정.
//    (인라인 객체로 넘기면 매 렌더마다 새 참조 → SensorChart effect 재실행 → uPlot 재생성)
const VEL_LABELS = { x: 'vx', y: 'vy', z: 'speed' }
const VEL_COLORS = { x: '#ef4444', y: '#3b82f6', z: '#10b981' }
const POSE_LABELS = { x: 'x', y: 'y', z: 'yaw' }
const POSE_COLORS = { x: '#f97316', y: '#8b5cf6', z: '#111827' }

// [REPLACE] Legend 전체 함수 교체 (패널만 렌더)
const Legend = memo(function Legend({ open = true }) {
  if (!open) return null
  return (
    <div style={S.legendBox} aria-label="지도 범례">
      <div style={S.legendRow}>
        <span style={S.robotTriIcon()} aria-hidden />
        <span>로봇(방향)</span>
      </div>
      <div style={S.legendRow}>
        <span style={S.circleSwatch('#10B981')} aria-hidden />
        <span>지나온 경로</span>
      </div>
      <div style={S.legendRow}>
        <span style={S.circleSwatch('#9CA3AF')} aria-hidden />
        <span>남은 경로</span>
      </div>
      <div style={S.legendRow}>
        <span style={S.circleSwatch('#FFA500')} aria-hidden />
        <span>LiDAR 포인트</span>
      </div>
      <div style={S.legendRow}>
        <div style={S.gradientBarMini} aria-hidden />
        <span style={{ whiteSpace: 'nowrap' }}>로컬 코스트맵</span>
      </div>
      <div style={S.legendRow}>
        <span style={S.dashedBoxSample} aria-hidden />
        <span>로컬 코스트맵 범위(점선)</span>
      </div>
      <div style={S.legendRow}>
        <span style={S.goalCrossSample} aria-hidden />
        <span>목표 지점</span>
      </div>
    </div>
  )
})

const LeftMapCard = memo(function LeftMapCard({
  canvasRef,
  onCanvasMouseDown,
  loadPhase,
  leftPlayable,
  leftInteractiveReady,
  leftOverlayText,

  gridData,
  pathPoints,
  lidarScans,
  localCostmapFrames,
  dwaGoals,
  currentTimestampMs,
  t0EpochMs,

  // ✅ [ADD] odom(=pose) 기반 센서 차트 데이터
  odomChart1,
  odomChart2,
  chartLoading
}) {
  const [legendOpen, setLegendOpen] = useState(true)
  const [is3D, setIs3D] = useState(false)
  const hasGrid = !!gridData

  // ✅ 캔버스 draw는 renderNow(rAF) 이후에 일어나므로, ready 직후 곧바로 오버레이를 내리면
  //    "그려지지 않은 빈 캔버스"가 한 프레임 노출된다. 2 프레임(rAF) 기다렸다가 공개해 깜빡임 방지.
  const [paintReady, setPaintReady] = useState(false)
  useEffect(() => {
    if (!leftInteractiveReady) {
      setPaintReady(false)
      return
    }
    let r1 = 0
    let r2 = 0
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setPaintReady(true))
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [leftInteractiveReady])

  // 좌측 오버레이 정책: init/error는 명시적으로 오버레이,
  // 그 외엔 leftInteractiveReady + 첫 페인트 완료까지 오버레이 유지
  const showLeftOverlay = loadPhase === 'error' || loadPhase === 'init' || !leftInteractiveReady || !paintReady

  return (
    <div style={S.mapCard}>
      <div style={S.mapHeader}>
        <span>이동현황</span>
        <div style={S.mapHeaderRight}>
          {/* ✅ 3D 모드에서도 범례 표시(2D와 동일 UX) */}
          <>
            <button
              type="button"
              onClick={() => setLegendOpen((v) => !v)}
              title={legendOpen ? '범례 접기' : '범례 펼치기'}
              aria-expanded={legendOpen}
              style={S.legendHeaderToggleBtn}
            >
              {`범례 ${legendOpen ? '⌃' : '⌄'}`}
            </button>
            <Legend open={legendOpen} />
          </>
          <Button
            size="sm"
            theme="default"
            onClick={() => setIs3D((v) => !v)}
            title={is3D ? '2D 지도로 전환' : '3D 지도로 전환'}
            style={S.toggleMapBtn}
          >
            {is3D ? '2D 지도' : '3D 지도'}
          </Button>
        </div>
      </div>

      <div style={S.mapBody}>
        {/* ✅ 2D/3D를 언마운트하지 말고 둘 다 항상 마운트 */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* 2D Layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              visibility: 'visible',
              pointerEvents: is3D ? 'none' : 'auto'
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                ...S.mapImage,
                visibility: leftInteractiveReady || hasGrid ? 'visible' : 'hidden'
              }}
              onMouseDown={onCanvasMouseDown}
            />

            {showLeftOverlay && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  ...S.loadingOverlay,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {loadPhase !== 'init' && leftOverlayText && leftOverlayText !== '로딩 실패' ? (
                  <>
                    <span
                      aria-hidden
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: '2px solid rgba(0,0,0,0.15)',
                        borderTopColor: '#666',
                        animation: 'map-left-spin 0.9s linear infinite'
                      }}
                    />
                    <span>{leftOverlayText}</span>
                    <style>{`@keyframes map-left-spin {from{transform:rotate(0)} to{transform:rotate(360deg)}}`}</style>
                  </>
                ) : (
                  <span>{leftOverlayText}</span>
                )}
              </div>
            )}
          </div>

          {/* 3D Layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              visibility: is3D ? 'visible' : 'hidden',
              pointerEvents: is3D ? 'auto' : 'none'
            }}
          >
            <DrivingMap3D
              isActive={is3D}
              gridData={gridData}
              pathPoints={pathPoints}
              lidarScans={lidarScans}
              localCostmapFrames={localCostmapFrames}
              dwaGoals={dwaGoals}
              currentTimestampMs={currentTimestampMs}
              t0EpochMs={t0EpochMs}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

// ✅ 우측 헤더: 센서 정보로 고정 + 토글 제거(이동면적 disable 정책)
const RightHeader = memo(function RightHeader({ isLoadingLogs, timeLabelRef }) {
  return (
    <div style={S.mapHeader}>
      <span>센서 정보</span>
      <div style={S.mapHeaderRight}>
        <span style={S.mapSubLabel} ref={timeLabelRef} />
        {/* 토글/버튼은 추후 필요 시 추가 */}
      </div>
    </div>
  )
})

function MapPanels({
  canvasRef,
  threeMountRef,
  isLoadingLogs,
  loadPhase,
  onCanvasMouseDown,
  msToClock,
  leftPlayable,
  coveragePathPoints = [],
  currentTimestampMs,
  durationMs,
  formattedCurrentTime,
  formattedDuration,
  // ▼ 3D용 데이터
  gridData,
  pathPoints,
  lidarScans,
  localCostmapFrames,
  dwaGoals,
  t0EpochMs,

  odomChart1,
  odomChart2,
  chartLoading
}) {
  // ===============================
  // 좌측 게이팅(기존 그대로)
  // ===============================

  // ✅ playheadSec: 차트 x축은 (tSec + t0/1000)이고 SensorChart가 다시 (playheadSec + t0/1000)로 변환하므로,
  //    여기서는 "재생 시작 기준 상대 초"(= (현재 epoch - t0)/1000)를 넘겨야 빨간 선이 정확히 맞는다.
  const playheadSec =
    typeof currentTimestampMs === 'number' &&
    currentTimestampMs > 0 &&
    typeof t0EpochMs === 'number' &&
    Number.isFinite(t0EpochMs)
      ? (currentTimestampMs - t0EpochMs) / 1000
      : null

  // ✅ 두 센서 차트가 동일한 x축(전체 주행 구간, 절대 초)을 쓰도록 고정
  //    → 차트별 데이터 범위 차이로 재생 커서가 한쪽에만 보이던 문제 해결
  const chartXRange = useMemo(() => {
    if (typeof t0EpochMs === 'number' && Number.isFinite(t0EpochMs) && typeof durationMs === 'number' && durationMs > 0) {
      const s0 = t0EpochMs / 1000
      return [s0, s0 + durationMs / 1000]
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t0EpochMs, durationMs])

  const LEFT_MIN_SAMPLES = 150
  const LEFT_MIN_SECONDS = 3.0

  const leftHasPts = Array.isArray(coveragePathPoints) && coveragePathPoints.length >= 2
  const leftDurSec = useMemo(() => {
    if (!leftHasPts) return 0
    const t0 = Number(coveragePathPoints[0]?.tSec) || 0
    const t1 = Number(coveragePathPoints[coveragePathPoints.length - 1]?.tSec) || 0
    return Math.max(0, t1 - t0)
  }, [leftHasPts, coveragePathPoints])

  const leftReadyByData = useMemo(() => {
    if (!leftHasPts) return false
    const sampleOK = coveragePathPoints.length >= LEFT_MIN_SAMPLES
    const timeOK = leftDurSec >= LEFT_MIN_SECONDS
    return sampleOK || timeOK
  }, [leftHasPts, coveragePathPoints.length, leftDurSec])

  // ✅ Step1: grid만 있어도 2D 캔버스는 보여야 한다(경로 수집 전이라도)
  const leftHasGrid = !!gridData

  // ✅ 로그 로딩과 지도/플레이는 분리: 지도는 ready면 인터랙션 허용
  const leftInteractiveReady = loadPhase === 'ready' && (leftReadyByData || leftHasGrid)

  const leftOverlayText = useMemo(() => {
    if (loadPhase === 'error') return '로딩 실패'
    if (loadPhase === 'init') return 'mcap 파일 선택 후 조회 버튼을 눌러주세요'
    if (!leftHasPts && !leftHasGrid) return '경로 수집 대기…'
    if (loadPhase !== 'ready') return 'MCAP 로딩 중…'
    if (!leftReadyByData) return '데이터 안정화 대기…'
    return ''
  }, [loadPhase, leftHasPts, leftHasGrid, leftReadyByData])

  // ===============================
  // 우측 센서 차트 게이팅(좌측과 동일한 로딩 Sync)
  // ===============================
  const rightInteractiveReady = loadPhase === 'ready'

  const rightOverlayText = useMemo(() => {
    if (loadPhase === 'error') return '로딩 실패'
    if (loadPhase === 'init') return 'mcap 파일 선택 후 조회 버튼을 눌러주세요'
    if (loadPhase !== 'ready') return 'MCAP 로딩 중…'
    return ''
  }, [loadPhase])

  const showRightOverlay = loadPhase === 'error' || loadPhase === 'init' || !rightInteractiveReady

  // 시간 라벨(우측 헤더 DOM 반영)
  const timeLabelCurrent = useMemo(() => {
    return (
      (typeof formattedCurrentTime === 'string' && formattedCurrentTime) ||
      (typeof currentTimestampMs === 'number' ? msToClock(currentTimestampMs) : `00:00.000`)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formattedCurrentTime, currentTimestampMs])

  const timeLabelDuration = useMemo(() => {
    if (typeof durationMs === 'number' && durationMs > 0) {
      const durText = (typeof formattedDuration === 'string' && formattedDuration) || msToClock(durationMs)
      return ` / ${durText}`
    }
    return ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formattedDuration, durationMs])

  const rightTimeRef = useRef(null)
  useEffect(() => {
    const el = rightTimeRef.current
    if (!el) return
    el.textContent = `${timeLabelCurrent}${timeLabelDuration}`
  }, [timeLabelCurrent, timeLabelDuration])

  return (
    <div style={S.mapsArea}>
      {/* 좌측: 이동현황 */}
      <LeftMapCard
        canvasRef={canvasRef}
        onCanvasMouseDown={onCanvasMouseDown}
        loadPhase={loadPhase}
        leftPlayable={leftPlayable}
        leftInteractiveReady={leftInteractiveReady}
        leftOverlayText={leftOverlayText}
        // ▼ 3D용
        gridData={gridData}
        pathPoints={pathPoints}
        lidarScans={lidarScans}
        localCostmapFrames={localCostmapFrames}
        dwaGoals={dwaGoals}
        currentTimestampMs={currentTimestampMs}
        t0EpochMs={t0EpochMs}
      />

      {/* 우측: 센서 정보 (조회/로딩 Sync 적용) */}
      <div style={S.mapCard}>
        <RightHeader isLoadingLogs={isLoadingLogs} timeLabelRef={rightTimeRef} />

        <div
          style={{
            ...S.mapBody,
            position: 'relative',
            overflowY: 'auto',
            alignItems: 'stretch',
            justifyContent: 'flex-start'
          }}
        >
          {/* ✅ ready일 때만 차트 렌더 (uPlot이 0px에서 그려지는 문제 방지) */}
          {rightInteractiveReady ? (
            chartLoading ? (
                <div
                  style={{
                    width: '100%',
                    height: 220 * 2 + 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#888',
                    fontSize: 13
                  }}
                >
                  차트 데이터 로딩 중...
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: '1fr 1fr',
                    gap: 12,
                    width: '100%'
                  }}
                >
                  <SensorChart
                    sampleMode={false}
                    data={odomChart1}
                    title="ODOM (derived) Velocity"
                    labels={VEL_LABELS}
                    colors={VEL_COLORS}
                    playheadSec={playheadSec}
                    t0EpochMs={t0EpochMs}
                    xRange={chartXRange}
                  />
                  <SensorChart
                    sampleMode={false}
                    data={odomChart2}
                    title="ODOM Pose"
                    labels={POSE_LABELS}
                    colors={POSE_COLORS}
                    playheadSec={playheadSec}
                    t0EpochMs={t0EpochMs}
                    xRange={chartXRange}
                  />
                </div>
              )
            ) : (
              // overlay가 덮을 거지만, 레이아웃 흔들림 방지용 빈 자리(선택)
              <div style={{ width: '100%', height: 220 * 2 + 12 }} />
            )}

          {/* ✅ 우측 Overlay: 좌측과 동일한 로딩 Sync */}
          {showRightOverlay && (
            <div
              role="status"
              aria-live="polite"
              style={{
                ...S.loadingOverlay,
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {loadPhase !== 'init' && rightOverlayText && rightOverlayText !== '로딩 실패' ? (
                <>
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: '2px solid rgba(0,0,0,0.15)',
                      borderTopColor: '#666',
                      animation: 'map-right-spin 0.9s linear infinite'
                    }}
                  />
                  <span>{rightOverlayText}</span>
                  <style>{`@keyframes map-right-spin {from{transform:rotate(0)} to{transform:rotate(360deg)}}`}</style>
                </>
              ) : (
                <span>{rightOverlayText}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(MapPanels)
