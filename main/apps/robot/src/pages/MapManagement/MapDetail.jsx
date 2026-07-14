import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StyledPageContent } from '@repo/ui'
import { mapApis } from '@/apis'
import '../../index.css'

// ─── Constants ─────────────────────────────────────────────────────────────────

const LAYER_ITEMS = [
  { key: 'drivable', label: '주행 가능 영역', color: '#4ade80', icon: '✅' },
  { key: 'obstacles', label: '고정 장애물', color: '#8b9dc3', icon: '⛔' },
  { key: 'walls', label: '벽 / 구조물', color: '#5a7a9a', icon: '🟦' },
  { key: 'zones', label: '금지구역', color: '#ef4444', icon: '🚫' },
  { key: 'trajectory', label: '로봇 궤적', color: '#3b82f6', icon: '📍' }
]

const HISTORY_TYPE_CLS = {
  '초기 등록': 'bg-[#dbeafe] text-[#2563eb]',
  '금지구역 변경': 'bg-[#fef3c7] text-[#d97706]',
  '맵 데이터 갱신': 'bg-[#d1fae5] text-[#059669]',
  '상태 변경': 'bg-[#f3e8ff] text-[#7c3aed]',
  '로봇 배포': 'bg-[#e8f4fd] text-[#1a8bc5]'
}

// ─── Badge Helpers ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cls = {
    Active: 'bg-[#d1fae5] text-[#059669]',
    Draft: 'bg-[#fef3c7] text-[#d97706]',
    Deprecated: 'bg-[#f3f4f6] text-[#6b7280]'
  }
  return <span className={`px-2 py-[2px] rounded-full text-[9px] ${cls[status] || cls.Deprecated}`}>{status}</span>
}

function RobotStatusBadge({ status }) {
  const cls = {
    운영: 'bg-[#dbeafe] text-[#2563eb]',
    에러: 'bg-[#fee2e2] text-[#dc2626]',
    오프라인: 'bg-[#fef3c7] text-[#d97706]'
  }
  return (
    <span className={`px-2 py-[2px] rounded-full text-[9px] ${cls[status] || 'bg-[#f3f4f6] text-[#6b7280]'}`}>
      {status}
    </span>
  )
}

function getMapDisplayName(map) {
  if (!map) return ''
  if (map.ownerType === 'site') return map.site || '(미등록)'
  if (map.ownerRobotName) return `${map.ownerRobotName} (${map.ownerRobotMacAddress || ''})`
  return map.ownerRobotId || 'Unknown'
}

// ─── Component ─────────────────────────────────────────────────────────────────

const MapDetail = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mapId = searchParams.get('mapId')

  const [map, setMap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [layers, setLayers] = useState({
    drivable: true,
    obstacles: true,
    walls: true,
    zones: true,
    trajectory: false
  })
  const [zoom, setZoom] = useState(1)
  const [showRobots, setShowRobots] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    let canceled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await mapApis.getMapDetail(mapId)
        if (!canceled && data) setMap(data)
      } catch (e) {
        console.error('맵 상세 조회 실패:', e)
      } finally {
        if (!canceled) setLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
  }, [mapId])

  if (loading) {
    return (
      <StyledPageContent>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-[12px] text-[#888]">맵 정보를 불러오는 중...</p>
        </div>
      </StyledPageContent>
    )
  }

  if (!map) {
    return (
      <StyledPageContent>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-[12px] text-[#888] mb-3">맵 데이터를 불러올 수 없습니다.</p>
          <button onClick={() => navigate('/robot/maps')} className="text-[11px] text-[#1a8bc5]">
            맵 관리로 돌아가기
          </button>
        </div>
      </StyledPageContent>
    )
  }

  const mapRobots = map.robots || []
  const registeredRobotCount = map.registeredRobotCount ?? mapRobots.length
  const isSite = map.ownerType === 'site'
  const activeLayerCount = Object.values(layers).filter(Boolean).length
  const zones = map.zones || []
  const updateHistory = map.updateHistory || []

  const toggleLayer = (key) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <StyledPageContent>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => navigate('/robot/maps')}
            className="p-1 text-[18px] text-[#555] hover:bg-[#f3f4f6] rounded flex-shrink-0"
          >
            ←
          </button>
          <span className="text-[14px] text-[#333] truncate">{getMapDisplayName(map)}</span>
          <span
            className={`px-2 py-[2px] rounded-full text-[9px] flex-shrink-0 ${
              isSite ? 'bg-[#e8f4fd] text-[#1a8bc5]' : 'bg-[#f3e8ff] text-[#7c3aed]'
            }`}
          >
            {isSite ? '사이트 맵' : '로봇 맵'}
          </span>
          <span className="px-2 py-[2px] rounded-full text-[9px] bg-[#f3f4f6] text-[#555] flex-shrink-0">
            READ-ONLY
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowRobots(true)}
            className="flex items-center gap-1 px-3 py-1 border border-[#ddd] rounded text-[11px] text-[#555] bg-white hover:bg-[#f9f9f9]"
          >
            👥 사용 로봇
          </button>
          <button
            onClick={() => navigate(`/robot/maps/edit?mapId=${map.id}`)}
            className="flex items-center gap-1 px-3 py-1 bg-[#1a8bc5] text-white rounded text-[11px] hover:bg-[#157aae]"
          >
            ✏️ 편집 시작
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="bg-[#1a1f2e] border border-[#e8e8e8] rounded overflow-hidden mb-3">
        <div className="flex items-center justify-between px-3 py-2 bg-[#f8f9fa] border-b border-[#e8e8e8]">
          <span className="text-[10px] text-[#888]">맵 시각화 (2D)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="text-[14px] text-[#555] px-1">
              －
            </button>
            <span className="text-[10px] text-[#555] min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="text-[14px] text-[#555] px-1">
              ＋
            </button>
            <button onClick={() => setZoom(1)} className="text-[10px] text-[#555] px-1">
              ⤢
            </button>
          </div>
        </div>
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <span className="text-4xl">🗺️</span>
          <span className="text-[12px] text-[#5a7a9a]">{getMapDisplayName(map)}</span>
          <span className="text-[10px] text-[#3a4a5a]">{map.mapType} Map</span>
          <div className="flex gap-2 mt-1">
            {LAYER_ITEMS.filter((l) => layers[l.key]).map((l) => (
              <div key={l.key} className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
            ))}
          </div>
          <span className="text-[9px] text-[#3a4a5a]">{activeLayerCount} layers active</span>
        </div>
      </div>

      {/* Info / History Panel */}
      <div className="bg-white border border-[#e8e8e8] rounded overflow-hidden mb-3">
        <div className="flex border-b border-[#e8e8e8]">
          {[
            { key: 'info', label: 'ℹ️ 맵 정보' },
            { key: 'history', label: '📋 업데이트 이력' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#e8f4fd] border-b-2 border-[#1a8bc5] text-[#1a8bc5]'
                  : 'text-[#888] hover:bg-[#f9f9f9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-3">
          {activeTab === 'info' && (
            <div className="space-y-1">
              {[
                ['식별자', getMapDisplayName(map)],
                ['구분', isSite ? '사이트 맵' : '로봇 맵'],
                ['타입', map.mapType],
                ['상태', map.status],
                ['Site', map.site || '-'],
                ...(isSite && map.building ? [['Building', map.building]] : []),
                ...(isSite && map.floor ? [['Floor', map.floor]] : []),
                ...(isSite && map.area ? [['Area', map.area]] : []),
                ['생성', map.createdAt],
                ['최종 수정', map.updatedAt],
                ['등록 로봇', isSite ? `${registeredRobotCount}대` : '-'],
                ['맵 사용 로봇', `${mapRobots.length}대`]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-[#f9f9f9]">
                  <span className="text-[10px] text-[#888]">{label}</span>
                  <span className="text-[10px] text-[#333]">{value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {updateHistory.length === 0 ? (
                <p className="text-[10px] text-[#aaa]">업데이트 이력이 없습니다.</p>
              ) : (
                [...updateHistory].reverse().map((h) => (
                  <div key={h.id} className="border-l-2 border-[#1a8bc5] pl-3 py-1 mb-3">
                    <span
                      className={`px-2 py-[2px] rounded-full text-[9px] mb-1 inline-block ${
                        HISTORY_TYPE_CLS[h.type] || 'bg-[#f3f4f6] text-[#6b7280]'
                      }`}
                    >
                      {h.type}
                    </span>
                    <p className="text-[10px] text-[#333]">{h.description}</p>
                    <p className="text-[9px] text-[#aaa] mt-1">
                      {h.date}&nbsp;&nbsp;{h.operator}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Layer Control */}
      <div className="bg-white border border-[#e8e8e8] rounded p-3 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[12px]">🗂️</span>
          <span className="text-[11px] text-[#333]">레이어 컨트롤</span>
        </div>
        {LAYER_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => toggleLayer(item.key)}
            className="flex items-center gap-2 py-1 w-full hover:bg-[#f9f9f9] rounded"
          >
            <div
              className={`w-[14px] h-[14px] rounded flex items-center justify-center border flex-shrink-0 ${
                layers[item.key] ? 'bg-[#1a8bc5] border-[#1a8bc5]' : 'border-[#ddd]'
              }`}
            >
              {layers[item.key] && <span className="text-[8px] text-white leading-none">✓</span>}
            </div>
            <span className="text-[10px]">{item.icon}</span>
            <span className="text-[10px] text-[#555] flex-1 text-left">{item.label}</span>
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color, opacity: layers[item.key] ? 1 : 0.3 }}
            />
          </button>
        ))}
      </div>

      {/* Zone List */}
      {zones.length > 0 && (
        <div className="bg-white border border-[#e8e8e8] rounded p-3 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span>🚫</span>
            <span className="text-[11px] text-[#333]">금지구역 ({zones.length})</span>
          </div>
          {zones.map((z) => (
            <div key={z.id} className="p-2 rounded bg-[#fff5f5] border border-[#fecaca] mb-2">
              <p className="text-[10px] text-[#dc2626]">{z.name}</p>
              {z.memo && <p className="text-[10px] text-[#888] mt-1">{z.memo}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Robots Modal */}
      {showRobots && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={() => setShowRobots(false)}
        >
          <div
            className="bg-white rounded p-4 w-full max-w-md max-h-96 overflow-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[12px] text-[#333]">맵 사용 로봇 목록 ({mapRobots.length}대)</span>
              <button onClick={() => setShowRobots(false)} className="text-[20px] text-[#888] leading-none">
                ×
              </button>
            </div>
            {mapRobots.length === 0 ? (
              <p className="text-[11px] text-[#888]">이 맵을 사용하는 로봇이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {mapRobots.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-[#f8f9fa] rounded">
                    <div>
                      <p className="text-[11px] text-[#333]">{r.name}</p>
                      <p className="text-[10px] text-[#aaa]">
                        {r.macAddress}&nbsp;&nbsp;{r.model}
                      </p>
                    </div>
                    <RobotStatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </StyledPageContent>
  )
}

export default MapDetail
