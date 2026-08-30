// /components/RobotVizEmptyState.jsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import { UX } from '../styles'

export default function RobotVizEmptyState() {
  const { t } = useTranslation('robot')
  return (
    <div style={UX.vizContainer}>
      <div style={UX.vizCenter}>
        <div style={UX.vizTitle}>{t('replayControls.emptyState.title')}</div>
        <div style={UX.vizSub}>{t('replayControls.emptyState.subtitle')}</div>
      </div>
    </div>
  )
}
