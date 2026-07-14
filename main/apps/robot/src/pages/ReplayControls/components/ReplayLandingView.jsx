// /components/ReplayLandingView.jsx
import React from 'react'
import RobotVizEmptyState from './RobotVizEmptyState'
import ReplayControlsUX from './ReplayControls'
import { UX } from '../styles'

export default function ReplayLandingView({ currentTime, totalDuration, isPlaying, playbackRate, issues }) {
  return (
    <div style={UX.main}>
      <div style={UX.leftPanel}>
        <div style={UX.vizWrap}>
          <RobotVizEmptyState />
        </div>
        <div style={UX.ctrlWrap}>
          <ReplayControlsUX
            currentTime={currentTime}
            totalDuration={totalDuration}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            issues={issues}
          />
        </div>
      </div>

      <div style={UX.rightPanel}>
        <div style={UX.rightEmpty}>로그를 로드하면 분석 패널이 표시됩니다</div>
      </div>
    </div>
  )
}
