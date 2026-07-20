// /components/RobotVizEmptyState.jsx
import React from 'react'
import { UX } from '../styles'

export default function RobotVizEmptyState() {
  return (
    <div style={UX.vizContainer}>
      <div style={UX.vizCenter}>
        <div style={UX.vizTitle}>Manipulation Replay</div>
        <div style={UX.vizSub}>MCAP 로그 파일을 선택 후 조회 버튼을 누르세요.</div>
      </div>
    </div>
  )
}
