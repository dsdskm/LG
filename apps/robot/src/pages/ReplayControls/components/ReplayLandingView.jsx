// /components/ReplayLandingView.jsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import RobotVizEmptyState from './RobotVizEmptyState'
import ReplayControlsUX from './ReplayControls'
import { UX } from '../styles'

export default function ReplayLandingView({ currentTime, totalDuration, isPlaying, playbackRate, issues }) {
  const { t } = useTranslation('robot')
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
        <div style={UX.rightEmpty}>{t('replayControls.landing.analysisPanelPlaceholder')}</div>
      </div>
    </div>
  )
}
