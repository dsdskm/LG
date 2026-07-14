import { useState } from 'react'
import styled from 'styled-components'
import { startMapping, createMapping, resetMapping, cancelMapping, healthCheck } from '@/apis/mapApis'
import { toast } from 'react-toastify'

const StyledSlider = styled.input`
  -webkit-appearance: none;
  appearance: none;
  width: 100px;
  height: 6px;
  background: ${({ $percentage }) =>
    `linear-gradient(to right, #2980b9 0%, #2980b9 ${$percentage}%, #dee2e6 ${$percentage}%, #dee2e6 100%)`};
  border-radius: 3px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2980b9;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition:
      transform 0.1s ease,
      background-color 0.1s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    background: #2471a3;
  }

  &::-moz-range-track {
    background: #dee2e6;
    height: 6px;
    border-radius: 3px;
  }

  &::-moz-range-progress {
    background-color: #2980b9;
    height: 6px;
    border-radius: 3px 0 0 3px;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2980b9;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition:
      transform 0.1s ease,
      background-color 0.1s ease;
    cursor: pointer;
  }

  &::-moz-range-thumb:hover {
    transform: scale(1.15);
    background: #2471a3;
  }
`

/**
 * ConnectionBar
 *
 * WebSocket URL 입력 + 연결/해제 버튼 컴포넌트.
 * 연결 상태(status)에 따라 버튼 텍스트와 색상이 변경됨.
 */
export default function ConnectionBar({ url, onUrlChange, status, onConnect, onDisconnect, fps, onFpsChange, t }) {
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const [isMapping, setIsMapping] = useState(false)

  // 연결 상태별 표시 텍스트와 색상
  const STATUS_CONFIG = {
    disconnected: { label: t('disconnected'), color: '#888' },
    connecting: { label: t('connecting'), color: '#f0a500' },
    connected: { label: t('connected'), color: '#27ae60' },
    error: { label: t('error'), color: '#e74c3c' }
  }
  const { label, color } = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected

  const handleStart = async () => {
    setIsMapping(true)
    // await startMapping()
    const response = await healthCheck()
    if (response.status === 'ok') toast.success('Healthy', { autoClose: 1000 })
    else toast.error('Not Healthy', { autoClose: 1000 })
  }
  const handleSave = async () => {
    await createMapping()
    setIsMapping(false)
  }
  const handleReset = async () => {
    await resetMapping()
  }
  const handleCancel = async () => {
    await cancelMapping()
    setIsMapping(false)
  }

  return (
    <div style={styles.bar}>
      <span style={styles.title}> Map Scan Viewer</span>

      {/* WebSocket URL 입력 필드 */}
      <input
        style={styles.input}
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder={import.meta.env.VITE_WEBSOCKET_URL}
        disabled={isConnected || isConnecting}
      />

      {/* 연결/해제 버튼 */}
      {isConnected ? (
        <button style={{ ...styles.btn, background: '#e74c3c' }} onClick={onDisconnect}>
          {t('disconnect')}
        </button>
      ) : (
        <button
          style={{ ...styles.btn, background: isConnecting ? '#aaa' : '#2980b9' }}
          onClick={onConnect}
          disabled={isConnecting}
        >
          {isConnecting ? t('connecting') : t('connect')}
        </button>
      )}

      {/* 연결 상태 표시 뱃지 */}
      <span style={{ ...styles.badge, backgroundColor: color }}>{label}</span>

      {/* 업데이트 주기 (FPS) 조절 슬라이더 */}
      <div style={styles.fpsContainer}>
        <span style={styles.fpsLabel}>
          FPS : <strong>{fps} Hz</strong>
        </span>
        <StyledSlider
          type="range"
          min="1"
          max="30"
          value={fps}
          onChange={(e) => onFpsChange(Number(e.target.value))}
          $percentage={((fps - 1) / 29) * 100}
        />
      </div>

      {isConnected && (
        <div style={styles.mappingContainer}>
          {isMapping ? (
            <>
              <button style={{ ...styles.btn, background: '#2980b9' }} onClick={handleSave}>
                {t('save')}
              </button>
              <button style={{ ...styles.btn, background: '#2980b9' }} onClick={handleReset}>
                {t('reset')}
              </button>
              <button style={{ ...styles.btn, background: '#2980b9' }} onClick={handleCancel}>
                {t('cancel')}
              </button>
            </>
          ) : (
            <button style={{ ...styles.btn, background: '#2980b9' }} onClick={handleStart}>
              {t('start')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    background: '#fff',
    borderBottom: '1px solid #ddd',
    flexWrap: 'wrap'
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
    whiteSpace: 'nowrap'
  },
  input: {
    width: '200px',
    padding: '6px 10px',
    border: '1px solid #ccc',
    borderRadius: 4,
    fontSize: 14,
    fontFamily: 'monospace'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  btn: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  mappingContainer: {
    display: 'flex',
    gap: 10,
    marginLeft: 'auto'
  },
  fpsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    whiteSpace: 'nowrap',
    backgroundColor: '#f8f9fa',
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid #e9ecef'
  },
  fpsLabel: {
    fontSize: 13,
    color: '#495057'
  }
}
