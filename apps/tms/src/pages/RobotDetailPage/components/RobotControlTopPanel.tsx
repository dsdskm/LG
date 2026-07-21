import { ChevronUp, MapPin, Mic, RotateCcw, RotateCw, Search, SendHorizontal, Settings, Sparkles, Square } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'

type RobotControlTopPanelProps = {
  groupId: string | null
  siteId: string | null
  deviceId: string
}

type NativeActionPayload = {
  type: 'normal' | 'motion' | 'move'
  value: string
  groupId: string | null
  siteId: string | null
  deviceId: string
}

type NativeActionMessage = NativeActionPayload

type NativeCallbackMessage = {
  type?: string
  requestId?: string
  value?: string
  status?: boolean
  message?: string
  code?: string
}

type PoiItem = {
  id: string
  name: string
  floor: string
}

const BASIC_CONTROLS = [
  { key: 'turn-left', label: '좌측 회전', Icon: RotateCcw },
  { key: 'turn-right', label: '우측 회전', Icon: RotateCw },
  { key: 'mic-open', label: '마이크 열기', Icon: Mic },
  { key: 'stop', label: '정지', Icon: Square }
]

const MOTION_PRESETS = [
  { key: 'hello', name: '인사', duration: '2.5s' },
  { key: 'heart', name: '하트', duration: '3.0s' },
  { key: 'clap', name: '박수', duration: '4.0s' },
  { key: 'neck', name: '고개 끄덕임', duration: '1.8s' },
  { key: 'wave', name: '손 흔들기', duration: '3.5s' },
  { key: 'bloom', name: '블룸', duration: '2.0s' },
  { key: 'spin', name: '회람', duration: '2.2s' },
  { key: 'jig', name: '기지개', duration: '4.5s' }
]

const POI_LIST: PoiItem[] = [
  { id: 'poi-b', name: 'POI-입구B', floor: '미분류/1층' },
  { id: 'poi-yard', name: 'POI-출고장', floor: '출고동/1층' },
  { id: 'poi-lobby', name: 'POI-로비', floor: '본관/1층' },
  { id: 'poi-lab', name: 'POI-실험실', floor: '연구동/2층' }
]

const CALLBACK_FN_NAME = 'TMS_NATIVE_CALLBACK'
const REQUEST_TIMEOUT_MS = 20000

let nativeCallbackHandler: ((raw: unknown) => void) | null = null

const forwardNativeCallback = (raw: unknown) => {
  if (!nativeCallbackHandler) {
    console.warn('[TMS_CONTROL][CALLBACK_BEFORE_READY]', raw)
    return
  }
  nativeCallbackHandler(raw)
}

if (typeof window !== 'undefined') {
  ;(window as any)[CALLBACK_FN_NAME] = forwardNativeCallback
}

const sendToAndroidNative = (message: NativeActionMessage): boolean => {
  const payloadText = JSON.stringify(message)
  console.log('[TMS_CONTROL][SEND_ATTEMPT]', message)

  try {
    const webViewBridge = (window as any).Android
    if (webViewBridge) {
      const bridgeMethods = ['postMessage', 'sendMessage', 'onMessage', 'send']
      for (const methodName of bridgeMethods) {
        const method = webViewBridge?.[methodName]
        if (typeof method === 'function') {
          method.call(webViewBridge, payloadText)
          return true
        }
      }
    }

    const reactNativeWebView = (window as any).ReactNativeWebView
    if (reactNativeWebView && typeof reactNativeWebView.postMessage === 'function') {
      reactNativeWebView.postMessage(payloadText)
      return true
    }

    const messageHandlers = (window as any).webkit?.messageHandlers
    if (messageHandlers) {
      const handlerNames = ['Android', 'android', 'nativeBridge']
      for (const handlerName of handlerNames) {
        const handler = messageHandlers?.[handlerName]
        if (handler && typeof handler.postMessage === 'function') {
          handler.postMessage(message)
          return true
        }
      }
    }
  } catch (error) {
    console.error('failed to send native message', error)
  }

  return false
}

const parseNativeCallback = (input: unknown): NativeCallbackMessage | null => {
  if (!input) return null
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as NativeCallbackMessage
    } catch {
      return null
    }
  }
  if (typeof input === 'object') {
    return input as NativeCallbackMessage
  }
  return null
}

const RobotControlTopPanel = ({ groupId, siteId, deviceId }: RobotControlTopPanelProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const [poiQuery, setPoiQuery] = useState('')
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const activeRequestRef = useRef<{ actionKey: string; timeoutId: number } | null>(null)

  const filteredPoiList = useMemo(() => {
    const query = poiQuery.trim().toLowerCase()
    if (!query) return POI_LIST
    return POI_LIST.filter((poi) => poi.name.toLowerCase().includes(query) || poi.floor.toLowerCase().includes(query))
  }, [poiQuery])

  const hasWorking = useMemo(() => activeActionKey !== null, [activeActionKey])

  useEffect(() => {
    nativeCallbackHandler = (raw: unknown) => {
      const result = parseNativeCallback(raw)
      if (!result) return

      if (!activeRequestRef.current) {
        console.warn('[TMS_CONTROL][CALLBACK_WITHOUT_ACTIVE_REQUEST]', result)
        return
      }

      const { timeoutId, actionKey } = activeRequestRef.current
      window.clearTimeout(timeoutId)
      activeRequestRef.current = null
      setActiveActionKey(null)

      const success = result.status === true
      console.log('[TMS_CONTROL][CALLBACK]', { actionKey, status: result.status, raw: result })
      if (!success) {
        toast.error(result.message || '요청 처리에 실패했습니다.')
      }
      setLastMessage({
        type: success ? 'success' : 'error',
        text: success ? '요청이 완료되었습니다.' : result.message || '요청 처리에 실패했습니다.'
      })
    }

    return () => {
      nativeCallbackHandler = null

      if (activeRequestRef.current) {
        window.clearTimeout(activeRequestRef.current.timeoutId)
      }
      activeRequestRef.current = null
    }
  }, [])

  const executeNativeAction = (
    actionKey: string,
    messageType: NativeActionMessage['type'],
    value: string
  ) => {
    console.log('[TMS_CONTROL][CLICK]', {
      actionKey,
      type: messageType,
      value,
      groupId,
      siteId,
      deviceId
    })

    if (!deviceId) {
      setLastMessage({ type: 'error', text: 'deviceId가 없어 요청할 수 없습니다.' })
      return
    }

    if (activeRequestRef.current) {
      toast.info('이전 요청 처리중입니다.')
      return
    }

    setLastMessage(null)
    setActiveActionKey(actionKey)

    const timeoutId = window.setTimeout(() => {
      if (!activeRequestRef.current) return

      activeRequestRef.current = null
      setActiveActionKey(null)
      toast.error('응답 시간이 초과되었습니다.')
      setLastMessage({ type: 'error', text: '응답 시간이 초과되었습니다.' })
    }, REQUEST_TIMEOUT_MS)

    activeRequestRef.current = {
      actionKey,
      timeoutId
    }

    const message: NativeActionMessage = {
      type: messageType,
      value,
      groupId,
      siteId,
      deviceId
    }

    const sent = sendToAndroidNative(message)
    if (sent) {
      console.log('[TMS_CONTROL][SENT]', { actionKey, type: messageType, value })
      return
    }

    window.clearTimeout(timeoutId)
    activeRequestRef.current = null
    setActiveActionKey(null)
    console.warn('[TMS_CONTROL][SEND_FAILED_BRIDGE_NOT_FOUND]', { actionKey, type: messageType, value })
    setLastMessage({ type: 'error', text: '안드로이드 브릿지를 찾을 수 없습니다.' })
  }

  const onClickBasicControl = (key: string) => {
    executeNativeAction(`basic:${key}`, 'normal', key)
  }

  const onClickMotionControl = (key: string) => {
    executeNativeAction(`motion:${key}`, 'motion', key)
  }

  const onClickMovePoi = (poiId: string) => {
    executeNativeAction(`poi:${poiId}`, 'move', poiId)
  }

  return (
    <section
      style={{
        border: '1px solid #dce2ea',
        borderRadius: '16px',
        background: '#ffffff',
        overflow: 'hidden',
        marginBottom: '12px'
      }}
    >
      <div
        style={{
          height: '48px',
          padding: '0 16px',
          borderBottom: collapsed ? 'none' : '1px solid #eef2f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontWeight: 700, fontSize: '14px' }}>
          <Settings size={16} color="#6483a8" />
          <span>로봇 제어</span>
        </div>
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#94a3b8'
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              background: hasWorking ? '#ecfeff' : '#f1f5f9',
              color: hasWorking ? '#0e7490' : '#64748b',
              borderRadius: '999px',
              padding: '2px 8px'
            }}
          >
            {hasWorking ? 'WORKING' : '대기'}
          </span>
          <ChevronUp size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: '14px 16px 16px 16px' }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#50627a', fontSize: '13px', fontWeight: 700 }}>
              <Settings size={14} />
              <span>기본 제어</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {BASIC_CONTROLS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => onClickBasicControl(key)}
                  disabled={hasWorking}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid #d6dfeb',
                    borderRadius: '10px',
                    backgroundColor: activeActionKey === `basic:${key}` ? '#f1f5f9' : '#ffffff',
                    color: '#334155',
                    padding: '8px 12px',
                    cursor: hasWorking ? 'not-allowed' : 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {activeActionKey === `basic:${key}` ? (
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '999px',
                        border: '2px solid #94a3b8',
                        borderTopColor: 'transparent',
                        display: 'inline-block',
                        animation: 'tms-working-spin 0.9s linear infinite'
                      }}
                    />
                  ) : (
                    <Icon size={14} />
                  )}
                  <span>{activeActionKey === `basic:${key}` ? 'working...' : label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#50627a', fontSize: '13px', fontWeight: 700 }}>
              <Sparkles size={14} />
              <span>모션 실행</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '8px'
              }}
            >
              {MOTION_PRESETS.map((motion) => (
                <button
                  key={motion.key}
                  onClick={() => onClickMotionControl(motion.key)}
                  disabled={hasWorking}
                  style={{
                    border: '1px solid #edf1f6',
                    backgroundColor: activeActionKey === `motion:${motion.key}` ? '#f8fafc' : '#ffffff',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    cursor: hasWorking ? 'not-allowed' : 'pointer',
                    color: '#475569',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {activeActionKey === `motion:${motion.key}` ? 'working...' : motion.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{motion.duration}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#50627a', fontSize: '13px', fontWeight: 700 }}>
              <SendHorizontal size={14} />
              <span>장소 이동</span>
            </div>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={poiQuery}
                onChange={(e) => setPoiQuery(e.target.value)}
                placeholder="POI 검색"
                style={{
                  width: '100%',
                  height: '38px',
                  border: '1px solid #d6dfeb',
                  borderRadius: '10px',
                  padding: '0 12px 0 32px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredPoiList.map((poi) => (
                <div
                  key={poi.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #edf1f6',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <MapPin size={14} color="#7b8ea7" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {poi.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{poi.floor}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onClickMovePoi(poi.id)}
                    disabled={hasWorking}
                    style={{
                      border: '1px solid #d6dfeb',
                      borderRadius: '8px',
                      backgroundColor: activeActionKey === `poi:${poi.id}` ? '#e2e8f0' : '#f8fafc',
                      color: '#475569',
                      padding: '6px 10px',
                      fontSize: '13px',
                      cursor: hasWorking ? 'not-allowed' : 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {activeActionKey === `poi:${poi.id}` ? 'working...' : '이동'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {lastMessage && (
            <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: lastMessage.type === 'success' ? '#0f766e' : '#dc2626' }}>
              {lastMessage.text}
            </p>
          )}
        </div>
      )}

      <style>{`@keyframes tms-working-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </section>
  )
}

export default RobotControlTopPanel
