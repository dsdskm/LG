// components/ReplayResultView.jsx
import React, { useState } from 'react'
import ReplayControls from './ReplayControls'
import { theme } from '../styles'
import { Tabs, Tab } from '@repo/ui'

import RobotVisualization from './RobotVisualization'
import AnalysisSettings from './AnalysisSettings'

// ✅ 탭 컴포넌트들
import OverviewTab from './tabs/OverviewTab'
import ArmAnalysisTab from './tabs/ArmAnalysisTab'
import EndEffectorTab from './tabs/EndEffectorTab'
import SystemStatusTab from './tabs/SystemStatusTab'
import PerformanceTab from './tabs/PerformanceTab'

export default function ReplayResultView({
  // ✅ 상위(페이지)에서 내려주는 모드: 'landing' | 'result'
  viewMode = 'result',

  // result data
  resultData,

  // player
  currentTime,
  totalDuration,
  isPlaying,
  playbackRate,
  onSeek,
  onTogglePlay,
  onStop,
  onChangeRate,

  // issues/summary
  issues,
  issueNavPoints,
  issueCounts,
  onIssueSelect,
  mcapSummary,
  jointGroups,

  // mcap parsing flags
  isParsingMcap,
  mcapParseError,
  isInitialLoading, // Phase 1 (초기 화면 준비 전) → 큰 차단형 스피너
  isBackgroundLoading, // Phase 2 (초기 화면 준비됨, 나머지 탭 채우는 중) → 작은 비차단 표시

  // 분석 임계값 설정(⚙)
  thresholds,
  onChangeThreshold,
  onResetThresholds
}) {
  // 현재 활성 탭 → 조정 가능한 임계값 그룹 매핑 (Overview/System은 매핑 없음 → ⚙ 미표시)
  const [activeTabId, setActiveTabId] = useState('overview')
  const tabGroup = { leftArm: 'arm', rightArm: 'arm', endEffector: 'hand', performance: 'perf' }[activeTabId]

  // ✅ landing 상태에서는 이 뷰 자체를 렌더하지 않음
  // (landing에서 Player/탭/캔버스 잔상 남는 문제를 원천적으로 차단)
  if (viewMode !== 'result') return null

  // result인데 데이터가 없으면 렌더 스킵(상위 흐름 문제/로딩 타이밍)
  if (!resultData) return null

  return (
    <div style={S.root}>
      {/* spin 키프레임 (두 인디케이터 공용) */}
      {(isInitialLoading || isBackgroundLoading) && (
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      )}

      {/* ✅ 초기 로딩(Phase 1): 화면 정중앙 큰 차단형 스피너 */}
      {isInitialLoading && (
        <div style={S.loadingFixed}>
          <div style={S.loadingBox}>
            <div style={S.spinner} />
            <span>분석 데이터 로딩 중...</span>
          </div>
        </div>
      )}

      {/* ✅ 백그라운드(Phase 2): 초기 화면은 이미 사용 가능 → 우상단 작은 비차단 표시 */}
      {!isInitialLoading && isBackgroundLoading && (
        <div style={S.bgLoading}>
          <div style={S.bgSpinner} />
          <span>나머지 분석 데이터 불러오는 중…</span>
        </div>
      )}

      {/* ── Left: Viewer + PlayerBar ── */}
      <div style={S.left}>
        <div style={S.viewer}>
          {/* ✅ landing→result 재진입 시 캔버스/내부 캐시 상태 초기화를 위해 key 부여 */}
          <RobotVisualization key={viewMode} currentTime={currentTime} mcapSummary={mcapSummary} />
        </div>

        <ReplayControls
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          playbackRate={playbackRate}
          issues={issues}
          issueNavPoints={issueNavPoints}
          issueCounts={issueCounts}
          onIssueSelect={onIssueSelect}
          onSeek={onSeek}
          onTogglePlay={onTogglePlay}
          onStop={onStop}
          onChangeRate={onChangeRate}
          viewMode={viewMode} // ✅ landing으로 바뀌면 ReplayControls가 스스로 reset 하도록(이전 diff 반영 전제)
          timeRange={mcapSummary?.timeRange} // 절대 KST 시각 표기용(absStartSec)
        />
      </div>

      {/* ── Right: Analysis Tabs ── */}
      <div style={{ ...S.right, position: 'relative' }}>
        {/* 분석 임계값(추정 기준) 설정 ⚙ — 현재 탭에 해당하는 그룹이 있을 때만 표시 */}
        {tabGroup && (
          <AnalysisSettings
            thresholds={thresholds}
            onChange={onChangeThreshold}
            onReset={onResetThresholds}
            groups={[tabGroup]}
          />
        )}
        <div style={S.panel}>
          <div style={S.tabsWrap}>
            {/* ✅ landing→result 재진입 시 탭 active 상태/스크롤 잔상 초기화를 위해 key 부여 */}
            <Tabs key={viewMode} defaultActiveId="overview" onChange={setActiveTabId}>
              <Tab id="overview" label="Overview">
                <div style={S.content}>
                  <OverviewTab
                    data={resultData}
                    mcapSummary={mcapSummary}
                    jointGroups={jointGroups}
                    isParsingMcap={isParsingMcap}
                    mcapParseError={mcapParseError}
                  />
                </div>
              </Tab>

              <Tab id="leftArm" label="Left Arm">
                <div style={S.content}>
                  <ArmAnalysisTab
                    data={resultData}
                    side="left"
                    mcapSummary={mcapSummary}
                    jointGroups={jointGroups}
                    isParsingMcap={isParsingMcap}
                    mcapParseError={mcapParseError}
                    currentTime={currentTime}
                  />
                </div>
              </Tab>

              <Tab id="rightArm" label="Right Arm">
                <div style={S.content}>
                  <ArmAnalysisTab
                    data={resultData}
                    side="right"
                    mcapSummary={mcapSummary}
                    jointGroups={jointGroups}
                    isParsingMcap={isParsingMcap}
                    mcapParseError={mcapParseError}
                    currentTime={currentTime}
                  />
                </div>
              </Tab>

              <Tab id="endEffector" label="End‑Effector">
                <div style={S.content}>
                  <EndEffectorTab
                    mcapSummary={mcapSummary}
                    jointGroups={jointGroups}
                    isParsingMcap={isParsingMcap}
                    mcapParseError={mcapParseError}
                    currentTime={currentTime}
                  />
                </div>
              </Tab>

              <Tab id="system" label="System">
                <div style={S.content}>
                  <SystemStatusTab
                    data={resultData}
                    mcapSummary={mcapSummary}
                    jointGroups={jointGroups}
                    currentTime={currentTime}
                    totalDuration={totalDuration}
                    isParsingMcap={isParsingMcap}
                    mcapParseError={mcapParseError}
                  />
                </div>
              </Tab>

              <Tab id="performance" label="Performance">
                <div style={S.content}>
                  <PerformanceTab
                    data={resultData}
                    mcapSummary={mcapSummary}
                    jointGroups={jointGroups}
                    currentTime={currentTime}
                    totalDuration={totalDuration}
                    isParsingMcap={isParsingMcap}
                    mcapParseError={mcapParseError}
                  />
                </div>
              </Tab>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  root: {
    display: 'flex',
    gap: 8,
    padding: 8,
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden', // ✅ 내부에서만 스크롤 나게
    alignItems: 'stretch',
    position: 'relative' // ✅ 백그라운드 로딩 표시(absolute) 기준점
  },
  left: {
    width: '50%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 0 // ✅ 중요
  },
  right: {
    width: '50%',
    minWidth: 0,
    display: 'flex',
    minHeight: 0 // ✅ 중요
  },
  viewer: {
    flex: '1 1 0',
    minHeight: 0,
    borderRadius: 10,
    background: '#F9FAFB',
    border: `1px solid ${theme.colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.textMuted,
    overflow: 'hidden', // ✅ 캔버스/내부가 튀어나와 아래를 덮는 것 방지
    position: 'relative' // ✅ RobotVisualization이 absolute를 쓰더라도 이 안에 가둠
  },

  panel: {
    flex: '1 1 0',
    minHeight: 0,
    borderRadius: 10,
    border: `1px solid ${theme.colors.border}`,
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto'
  },

  // ✅ Tabs 컨테이너가 panel 높이를 꽉 쓰도록
  tabsWrap: {
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'visible',
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: 10,
    paddingRight: 10
  },

  content: {
    overflow: 'visible', // 스크롤은 tabsWrap이 담당
    padding: 10
  },

  // ✅ 화면(뷰포트) 정중앙 고정 로딩
  // - 컨테이너 높이/탭 내부 레이아웃/스크롤 영향을 0으로 만듦
  loadingFixed: {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
    pointerEvents: 'none' // ✅ 필요하면 'auto'로 바꿔서 클릭 막는 모달처럼도 가능
  },

  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 10,
    background: '#fff',
    border: `1px solid ${theme.colors.border}`,
    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
    fontSize: 13,
    fontWeight: 600,
    color: theme.colors.textSecondary
  },

  spinner: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: `3px solid ${theme.colors.border}`,
    borderTopColor: theme.colors.primary,
    animation: 'spin 0.9s linear infinite'
  },

  // ✅ Phase 2 백그라운드용: 우상단 작은 비차단 표시(클릭 막지 않음)
  bgLoading: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.92)',
    border: `1px solid ${theme.colors.border}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    fontSize: 12,
    fontWeight: 600,
    color: theme.colors.textMuted,
    pointerEvents: 'none'
  },

  bgSpinner: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: `2px solid ${theme.colors.border}`,
    borderTopColor: theme.colors.primary,
    animation: 'spin 0.9s linear infinite'
  }
}
