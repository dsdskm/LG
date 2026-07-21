import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import styled from 'styled-components'
import config from '../config'
import { getClientId } from '../config/clientId'
import { useTranslation } from 'react-i18next'

const CardContainer = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
`

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CardIcon = styled.span`
  font-size: 18px;
`

const CardName = styled.span`
  font-weight: 600;
  color: #333;
`

const CardPort = styled.span`
  font-size: 12px;
  color: #666;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
`

const BadgeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const StatusBadge = styled.span`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;

  &.status-standby {
    background: #e2e3e5;
    color: #383d41;
  }

  &.status-connected {
    background: #d4edda;
    color: #155724;
  }

  &.status-connecting {
    background: #fff3cd;
    color: #856404;
  }

  &.status-failed {
    background: #f8d7da;
    color: #721c24;
  }
`

const LiveBadge = styled.span`
  padding: 3px 7px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;

  &.live-connected {
    background: #d4edda;
    color: #155724;
    animation: pulse 2s infinite;
  }

  &.live-connecting {
    background: #fff3cd;
    color: #856404;
  }

  &.live-disconnected {
    background: #f8d7da;
    color: #721c24;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
`

const CardBody = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  min-height: 180px;
`

const ConnectionError = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;

  p {
    margin-bottom: 10px;
    text-align: center;
  }

  button {
    padding: 6px 12px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s ease;

    &:hover {
      background: #0056b3;
    }
  }
`

const IFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  background-color: #f5f5f5;
`

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
`

const CardInfo = styled.div`
  small {
    color: #666;
    font-size: 12px;
  }
`

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`

const ActionButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #007bff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.btn-expand {
    background: white;
    color: #007bff;

    &:hover:not(:disabled) {
      background: #007bff;
      color: white;
    }
  }

  &.btn-control {
    background: #007bff;
    color: white;

    &:hover:not(:disabled) {
      background: #0056b3;
    }
  }
`

const LoadingOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 10;
`

const ConsoleCard = forwardRef(({ robotId, card, onExpand, onControlOpen }, ref) => {
  const { t } = useTranslation('robot')
  const [connectionStatus, setConnectionStatus] = useState('standby')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [iframeError, setIframeError] = useState(null)
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [realtimeData, setRealtimeData] = useState(null)
  const iframeRef = useRef(null)
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  const shouldReconnectRef = useRef(true)

  const [shouldConnect, setShouldConnect] = useState(false)

  const reconnectCountRef = useRef(0)
  const MAX_RECONNECT = 2

  const safeCard = {
    cardName: card?.cardName || 'Unknown',
    targetPath: card?.targetPath || '/',
    targetPort: String(card?.targetPort || '3000'),
    icon: card?.icon || '📱',
    cardType: card?.cardType || 'READONLY',
    isRealtime: card?.isRealtime || false,
    realtimePort: card?.realtimePort || null,
    realtimePath: card?.realtimePath || null
  }

  const cid = getClientId(robotId, safeCard.targetPort)

  // ── 실시간 WebSocket (isRealtime 카드에서만) ───────────────────────
  const connectRealtimeWs = useCallback(() => {
    shouldReconnectRef.current = true
    if (!safeCard.isRealtime || !safeCard.realtimePort || !safeCard.realtimePath) {
      console.warn(
        '[REALTIME] Skipped: isRealtime=%s, port=%s, path=%s',
        safeCard.isRealtime,
        safeCard.realtimePort,
        safeCard.realtimePath
      )
      return
    }

    const wsBase = config.wsUrl || config.proxyServerUrl.replace(/^http/, 'ws')
    // nginx는 /robotapp/** 경로에 WebSocket upgrade를 허용하지 않을 수 있으므로
    // /robot-tunnel?type=stream 경로를 사용 (nginx의 /robot-tunnel WebSocket 설정 재사용)
    const mode = safeCard.cardType === 'CONTROL' ? 'control' : 'readonly'
    const url = `${wsBase}/robot-tunnel?type=stream&robotId=${encodeURIComponent(robotId)}&port=${safeCard.realtimePort}&path=${encodeURIComponent(safeCard.realtimePath)}&mode=readonly`

    console.log('[REALTIME] Connecting to', url)
    setWsStatus('connecting')

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[REALTIME] WS connected')
      setWsStatus('connected')

      // ✅ 성공적으로 연결되면 재연결 카운트 초기화
      reconnectCountRef.current = 0
    }

    ws.onmessage = async (event) => {
      // 서버가 binary frame을 보낼 경우 Blob/ArrayBuffer로 수신됨 → text 변환
      let rawText
      if (event.data instanceof Blob) {
        //console.log('[REALTIME] event.data instanceof Blob')
        rawText = await event.data.text()
      } else if (event.data instanceof ArrayBuffer) {
        //console.log('[REALTIME] event.data instanceof ArrayBuffer')
        rawText = new TextDecoder().decode(event.data)
      } else {
        rawText = event.data
      }
      //console.log('[REALTIME] Raw message received, len=%s', rawText?.length)
      try {
        const data = JSON.parse(rawText)
        //console.log('[REALTIME] Parsed OK, type=%s, hasPose=%s', data?.type, !!data?.pose)
        setRealtimeData(data)
        setLastUpdate(new Date())

        // iframe 으로 데이터 전달
        const hasContentWindow = !!iframeRef.current?.contentWindow
        //console.log('[REALTIME] postMessage to iframe, hasContentWindow=%s', hasContentWindow)
        if (iframeRef.current?.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage({ type: 'REALTIME_UPDATE', data }, '*')
          } catch (pmErr) {
            console.error('[REALTIME] postMessage failed:', pmErr)
          }
        }
      } catch (parseErr) {
        console.error('[REALTIME] JSON parse failed:', parseErr, 'raw:', rawText?.slice?.(0, 100))
      }
    }

    ws.onclose = (ev) => {
      console.warn(
        '[REALTIME] WS closed, code=%s reason=%s, card=%s (retry=%s)',
        ev.code,
        ev.reason,
        safeCard.cardName,
        reconnectCountRef.current
      )
      setWsStatus('disconnected')

      // ✅ 최대 재연결 횟수 초과 시 중단
      if (reconnectCountRef.current >= MAX_RECONNECT) {
        console.error('[REALTIME] Max reconnect attempts reached. Stop retry.')
        return
      }

      reconnectCountRef.current += 1

      wsRef.current = null

      // ✅ cleanup에 의해 닫힌 경우 reconnect 금지
      if (!shouldReconnectRef.current) {
        console.log('[REALTIME] reconnect skipped (cleanup)')
        return
      }

      reconnectRef.current = setTimeout(connectRealtimeWs, 5000)
    }

    ws.onerror = (ev) => {
      console.error('[REALTIME] WS error', ev)
      setWsStatus('disconnected')
    }
  }, [robotId, safeCard.isRealtime, safeCard.realtimePort, safeCard.realtimePath])

  // ★ 리소스 정리 함수 (외부에서도 호출 가능)
  const cleanup = useCallback(() => {
    console.log(`� Cleanup card: ${safeCard.cardName}`)

    shouldReconnectRef.current = false

    clearTimeout(reconnectRef.current)
    reconnectRef.current = null

    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Card removed')
      } catch (_) {}
      wsRef.current = null
    }

    setWsStatus('disconnected')
  }, [])

  useImperativeHandle(ref, () => ({ cleanup }), [cleanup])

  useEffect(() => {
    if (!safeCard.isRealtime) return
    if (!shouldConnect) return // ✅ 추가

    connectRealtimeWs()
    return () => {
      reconnectCountRef.current = 0
      cleanup()
    }
  }, [connectRealtimeWs, shouldConnect, cleanup])

  useEffect(() => {
    if (!shouldConnect) return // ✅ 추가

    const handleMessage = (event) => {
      const devToolsPatterns = ['react-devtools', 'chrome-extension', 'moz-extension', 'webkit-masked-url']
      if (devToolsPatterns.some((p) => JSON.stringify(event.data).includes(p) || event.data?.source?.includes?.(p)))
        return

      const trustedOrigins = ['https://robot-proxy.qa.hcrsp.com', 'https://remote-console-test.hcrsp.com']
      if (!trustedOrigins.some((o) => event.origin.includes(o))) {
        if (process.env.NODE_ENV === 'development') console.log('🚫 Untrusted origin:', event.origin)
        return
      }

      if (!event.data || typeof event.data !== 'object' || !event.data.type) return

      switch (event.data.type) {
        case 'IFRAME_LOADED':
          setConnectionStatus('connected')
          setLastUpdate(new Date())
          setIframeError(null)
          break
        case 'IFRAME_ERROR':
          setConnectionStatus('failed')
          setIframeError(event.data.error || 'Unknown error')
          break
        case 'STATUS_UPDATE':
          setLastUpdate(new Date())
          break
        default:
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // ── iframe 핸들러 ─────────────────────────────────────────────────
  const buildIframeUrl = () => {
    const mode = safeCard.cardType === 'CONTROL' ? 'control' : 'readonly'
    let url = `${config.proxyServerUrl}${safeCard.targetPath}?_deviceId=${robotId}&_port=${safeCard.targetPort}&_cid=${cid}&mode=${mode}&embedded=true`
    if (safeCard.realtimePort && String(safeCard.realtimePort) !== safeCard.targetPort) {
      url += `&_wsPort=${safeCard.realtimePort}`
    }
    if (safeCard.isRealtime) {
      url += `&wsSource=parent`
    }
    return url
  }

  const iframeUrl = buildIframeUrl()

  const handleIframeLoad = () => {
    setConnectionStatus('connected')
    setLastUpdate(new Date())
    setIframeError(null)
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'PARENT_READY', robotId, readOnly: true }, '*')
      }
    } catch (_) {
      /* CORS */
    }
  }

  const handleIframeError = () => {
    setConnectionStatus('failed')
    setIframeError(t('networkConnectionFail'))
  }

  // ── 버튼 핸들러 ───────────────────────────────────────────────────
  const handleExpand = () => {
    const mode = safeCard.cardType === 'CONTROL' ? 'control' : 'readonly'
    let expandUrl = `${config.proxyServerUrl}${safeCard.targetPath}?_deviceId=${robotId}&_port=${safeCard.targetPort}&_cid=${cid}&mode=${mode}&expanded=true`
    if (safeCard.realtimePort && String(safeCard.realtimePort) !== safeCard.targetPort) {
      expandUrl += `&_wsPort=${safeCard.realtimePort}`
    }
    const w = window.open(
      expandUrl,
      `robot-expand-${robotId}-${safeCard.targetPath.replace(/\//g, '-')}`,
      'width=1200,height=800,scrollbars=yes,resizable=yes'
    )
    if (!w) alert('브라우저 팝업 차단을 해제하세요.')
  }

  const handleControlOpen = () => onControlOpen(safeCard)

  // ── 상태 텍스트 ───────────────────────────────────────────────────
  const getStatusText = () =>
    ({
      connected: t('connected'),
      connecting: t('connecting') + '...',
      failed: t('connectionFail'),
      standby: t('standby')
    })[connectionStatus] || t('unknown')

  const getLiveText = () =>
    ({ connected: '● LIVE', connecting: '● ' + t('connecting'), disconnected: '● ' + t('offline') })[wsStatus] ||
    '● ' + t('offline')

  const isControlCard = safeCard.cardType === 'CONTROL'
  const isReadOnlyMode = safeCard.cardType === 'READONLY'

  return (
    <CardContainer>
      <CardHeader>
        <CardTitle>
          <CardIcon>{safeCard.icon}</CardIcon>
          <CardName>{safeCard.cardName}</CardName>
          <CardPort>:{safeCard.targetPort}</CardPort>
        </CardTitle>
        <BadgeGroup>
          {safeCard.isRealtime && <LiveBadge className={`live-${wsStatus}`}>{getLiveText()}</LiveBadge>}
          <StatusBadge className={`status-${connectionStatus}`}>{getStatusText()}</StatusBadge>
        </BadgeGroup>
      </CardHeader>

      <CardBody>
        {!shouldConnect ? (
          <ConnectionError>
            <p>{t('connectionWaiting')}</p>
            <button
              onClick={() => {
                setShouldConnect(true)
                setConnectionStatus('connecting')
              }}
            >
              {t('connectionStart')}
            </button>
          </ConnectionError>
        ) : connectionStatus === 'failed' ? (
          <ConnectionError>
            <p>{t('unableToConnect')}</p>
            <p>
              ({robotId}:{safeCard.targetPort}
              {safeCard.targetPath})
            </p>
            {iframeError && (
              <p style={{ fontSize: '12px', color: '#dc3545' }}>
                {t('error2')}: {iframeError}
              </p>
            )}
            <button onClick={() => window.location.reload()}>{t('retry')}</button>
          </ConnectionError>
        ) : (
          <>
            {shouldConnect && (
              <IFrame
                ref={iframeRef}
                src={iframeUrl}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={safeCard.cardName}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            )}

            {isReadOnlyMode && (
              <div
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  background: 'rgba(255, 193, 7, 0.9)',
                  color: '#856404',
                  padding: '2px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  zIndex: 2,
                  pointerEvents: 'none',
                  fontWeight: 'bold'
                }}
              >
                🔒 READ ONLY
              </div>
            )}

            {connectionStatus === 'connecting' && <LoadingOverlay>{t('loading')}...</LoadingOverlay>}
          </>
        )}
      </CardBody>

      <CardFooter>
        <CardInfo>
          {safeCard.isRealtime && realtimeData?.pose ? (
            <small style={{ fontFamily: 'monospace' }}>
              x:{realtimeData.pose.x} y:{realtimeData.pose.y} yaw:{realtimeData.pose.yaw?.toFixed(2)}
            </small>
          ) : lastUpdate ? (
            <small>
              {t('lastUpdate')}: {lastUpdate.toLocaleTimeString()}
            </small>
          ) : null}
        </CardInfo>
        <CardActions>
          <ActionButton className="btn-expand" onClick={handleExpand} disabled={connectionStatus !== 'connected'}>
            {t('zoomIn')}
          </ActionButton>
          {isControlCard && (
            <ActionButton
              className="btn-control"
              onClick={handleControlOpen}
              disabled={!isControlCard || connectionStatus !== 'connected'}
            >
              {t('openControl')}
            </ActionButton>
          )}
        </CardActions>
      </CardFooter>
    </CardContainer>
  )
})

ConsoleCard.displayName = 'ConsoleCard'
export default ConsoleCard
