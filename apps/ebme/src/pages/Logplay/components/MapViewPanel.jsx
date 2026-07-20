import { useEffect, useRef, useState, useCallback, useMemo, createContext } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MapImage } from './MapImage'
import { TFNode } from './TFNode'
import { useMapStore } from './useMapStore'
import { Button } from '@repo/ui'

const supportMsgTypeList = ['sensor_msgs/msg/LaserScan', 'geometry_msgs/Pose2dStamped', 'nav_msgs/msg/Path']
export const SettingsContext = createContext()

export default function MapViewPanel({ root }) {
  const subscribeMessages = useMapStore((state) => state.subscribeMessages)
  const unsubscribeMessages = useMapStore((state) => state.unsubscribeMessages)

  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState([])
  const settingsRef = useRef([])
  const closeTimerRef = useRef(null)

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const openSettingsPopover = useCallback(() => {
    clearCloseTimer()
    setShowSettings(true)
  }, [clearCloseTimer])

  const menuList = useMemo(() => {
    if (!showSettings) return [] // 팝오버가 닫혀있으면 계산 안 함

    const allMsgs = useMapStore.getState().availableMsgs
    const supportedMsg = allMsgs.filter((item) => supportMsgTypeList.includes(item.msgType))

    return supportedMsg.map((msg) => ({
      msgName: msg.msgName,
      msgType: msg.msgType,
      checked: settings.some((item) => item.msgName === msg.msgName)
    }))
  }, [showSettings, settings])

  const scheduleCloseSettingsPopover = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => {
      setShowSettings(false)
      closeTimerRef.current = null
    }, 200)
  }, [clearCloseTimer])

  const updateSetting = useCallback((menuItem) => {
    return (e) => {
      const checked = e.target.checked
      console.log('[MapViewPanel] updateSetting', menuItem.msgName)

      if (checked) {
        console.log('[MapViewPanel] subscribe', menuItem)
        subscribeMessages({ msgName: menuItem.msgName, msgType: menuItem.msgType })
      } else {
        console.log('[MapViewPanel] unsubscribe')
        unsubscribeMessages({ msgName: menuItem.msgName, msgType: menuItem.msgType })
      }

      setSettings((prev) => {
        if (checked) {
          const { checked, ...rest } = menuItem
          return [...prev, { ...rest }]
        } else {
          return prev.filter((item) => item.msgName !== menuItem.msgName)
        }
      })
    }
  }, [])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    return () => {
      console.log('[MapViewPanel] Final cleanup on unmount')
      settingsRef.current.forEach((item) => {
        unsubscribeMessages({ msgName: item.msgName, msgType: item.msgType })
      })
    }
  }, [])

  const renderSettingsOverlay = () => (
    <div style={S.settingsWrapper} onMouseEnter={openSettingsPopover} onMouseLeave={scheduleCloseSettingsPopover}>
      <Button size="sm" theme="tertiary" title="설정">
        ⚙️ 설정
      </Button>

      {showSettings && (
        <div style={S.popover} onMouseEnter={openSettingsPopover} onMouseLeave={scheduleCloseSettingsPopover}>
          <div style={S.popoverHeader}>표시 옵션</div>

          {menuList.map((menuItem) => {
            return (
              <label key={menuItem.msgName} style={S.checkboxRow}>
                <input type="checkbox" checked={menuItem.checked} onChange={updateSetting(menuItem)} />
                <span style={S.checkboxLabel}>{menuItem.msgName}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
  return (
    <div style={S.container}>
      {renderSettingsOverlay()}

      <Canvas camera={{ position: [0, 5, 0], fov: 50 }}>
        <OrbitControls />
        <gridHelper
          args={[
            10, // 크기
            10, // 구획 수
            0x808080, // 메인 축 색상
            0x808080 // 격자 색상
          ]}
        />
        // 축 표시 (x: 빨강, y: 초록, z: 파랑)
        <axesHelper args={[5]} />
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <MapImage />
          <SettingsContext.Provider value={settings}>
            <TFNode key={root} frameId={root} />
          </SettingsContext.Provider>
        </group>
      </Canvas>
    </div>
  )
}

const S = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden'
  },

  // ✅ "좌측 상단"에 확실히 고정
  settingsWrapper: {
    position: 'absolute',
    zIndex: 50,
    display: 'inline-block'
  },

  popover: {
    position: 'absolute',
    top: 38,
    left: 0,
    minWidth: 180,
    padding: 10,
    borderRadius: 10,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    zIndex: 10
  },

  popoverHeader: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6
  },

  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    padding: '4px 0',
    cursor: 'pointer',
    userSelect: 'none'
  },

  checkboxLabel: {
    color: '#111827'
  }
}

