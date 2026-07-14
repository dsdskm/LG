import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFoxglove } from '@/hooks/useFoxglove'
import ConnectionBar from '@/components/ConnectionBar'
import MapCanvas from '@/components/MapCanvas'
import StatusPanel from '@/components/StatusPanel'

/**
 * Map
 *
 * 메인 페이지.
 * - wsUrl 상태 관리
 * - useFoxglove 훅으로 데이터 수신
 * - ConnectionBar + MapCanvas + StatusPanel 조합
 *
 * 레이아웃:
 * ┌─────────────────────────────────────────┐
 * │ ConnectionBar (상단 바)                  │
 * ├──────────────────────────┬──────────────┤
 * │                          │              │
 * │  MapCanvas               │ StatusPanel  │
 * │  (지도 + 라이다 + 로봇)   │ (정보 패널)  │
 * │                          │              │
 * └──────────────────────────┴──────────────┘
 */
export default function Map() {
  const { t } = useTranslation('map')
  const [wsUrl, setWsUrl] = useState(import.meta.env.VITE_WEBSOCKET_URL)
  const [fps, setFps] = useState(10) // 기본 10 FPS 업데이트 주기

  const {
    status,
    mapData,
    odomData,
    scanData,
    topics,
    subscribedTopics,
    customTopicsData,
    toggleSubscribe,
    subscribeTopics,
    unsubscribeTopics,
    connect,
    disconnect
  } = useFoxglove(wsUrl, fps)

  return (
    <div style={styles.app}>
      {/* 상단 연결 바 */}
      <ConnectionBar
        url={wsUrl}
        onUrlChange={setWsUrl}
        status={status}
        onConnect={connect}
        onDisconnect={disconnect}
        fps={fps}
        onFpsChange={setFps}
        t={t}
      />

      {/* 메인 콘텐츠 영역 */}
      <div style={styles.main}>
        {/* 지도 + 라이다 캔버스 */}
        <MapCanvas
          mapData={mapData}
          scanData={scanData}
          odomData={odomData}
          subscribedTopics={subscribedTopics}
          customTopicsData={customTopicsData}
          t={t}
        />

        {/* 우측 정보 패널 */}
        <StatusPanel
          status={status}
          wsUrl={wsUrl}
          mapData={mapData}
          odomData={odomData}
          scanData={scanData}
          topics={topics}
          subscribedTopics={subscribedTopics}
          customTopicsData={customTopicsData}
          toggleSubscribe={toggleSubscribe}
          subscribeTopics={subscribeTopics}
          unsubscribeTopics={unsubscribeTopics}
          t={t}
        />
      </div>
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  }
}
