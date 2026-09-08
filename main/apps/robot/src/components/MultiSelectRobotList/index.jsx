import React from 'react'
import { MultiSelectList } from '../../../../../packages/ui/src/components/MultiSelectList'

/**
 * Robot 앱용 로봇 선택 컴포넌트
 * 일반화된 MultiSelectList를 robot 데이터에 맞게 래핑
 *
 * @param {Object} props
 * @param {Array} props.robots - 로봇 목록 [{deviceId, deviceName, macAddress}, ...]
 * @param {string} props.logType - 로그 타입 ('driving' | 'manipulation')
 * @param {string} props.message - 표시할 메시지
 * @param {Function} props.onSelectRobot - 로봇 선택 시 콜백 (deviceId, logType)
 */
export function MultiSelectRobotList({
  robots = [],
  logType = 'driving',
  message = '',
  onSelectRobot
}) {
  const handleSelectRobot = (robot) => {
    // 로그 리플레이 창 열기
    const path = logType === 'driving'
      ? `/robot/logreplay?deviceId=${robot.deviceId}`
      : `/robot/replaycontrols?deviceId=${robot.deviceId}`

    const url = `${window.location.origin}${path}`
    window.open(url, '_blank')

    // 선택 완료 알림
    if (onSelectRobot) {
      onSelectRobot(robot.deviceId, logType)
    }
  }

  return (
    <MultiSelectList
      items={robots}
      message={message}
      onSelect={handleSelectRobot}
      renderItem={(robot) => (
        <>
          <div style={{ fontWeight: 600, color: '#262626', fontSize: '14px' }}>
            {robot.deviceName}
          </div>
          <div style={{ fontSize: '12px', color: '#595959' }}>
            🔗 {robot.macAddress}
          </div>
        </>
      )}
    />
  )
}

export default MultiSelectRobotList
