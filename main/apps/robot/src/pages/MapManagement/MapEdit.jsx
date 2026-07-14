import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StyledPageContent } from '@repo/ui'
import { mapApis } from '@/apis'
import '../../index.css'

// ─── Add Zone Dialog ──────────────────────────────────────────────────────────

function AddZoneDialog({ visible, zoneCount, onConfirm, onCancel }) {
  const [name, setName] = useState('')
  const [memo, setMemo] = useState('')

  if (!visible) return null

  const handleConfirm = () => {
    onConfirm(name || `금지구역 ${zoneCount + 1}`, memo)
    setName('')
    setMemo('')
  }
  const handleCancel = () => {
    setName('')
    setMemo('')
    onCancel()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={handleCancel}
    >
      <div className="bg-white rounded p-4 w-full max-w-sm shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[12px] text-[#333] mb-3">금지구역 속성 설정</h3>
        <div className="mb-3">
          <label className="text-[10px] text-[#888] block mb-1">영역 이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`금지구역 ${zoneCount + 1}`}
            autoFocus
            className="w-full border border-[#ddd] rounded px-2 py-1.5 text-[11px] text-[#333] outline-none focus:border-[#1a8bc5]"
          />
        </div>
        <div className="mb-4">
          <label className="text-[10px] text-[#888] block mb-1">메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="왜 이 영역을 막았는지..."
            rows={2}
            className="w-full border border-[#ddd] rounded px-2 py-1.5 text-[11px] text-[#333] resize-none outline-none focus:border-[#1a8bc5]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 border border-[#ddd] rounded text-[11px] text-[#555] bg-white hover:bg-[#f9f9f9]"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 bg-[#1a8bc5] text-white rounded text-[11px] hover:bg-[#157aae]"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}

function getMapDisplayName(map) {
  if (!map) return ''
  if (map.ownerType === 'site') return map.site || '(미등록)'
  if (map.ownerRobotName) return `${map.ownerRobotName} (${map.ownerRobotMacAddress || ''})`
  return map.ownerRobotId || 'Unknown'
}

// ─── Component ─────────────────────────────────────────────────────────────────

const MapEdit = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mapId = searchParams.get('mapId')

  const [map, setMap] = useState(null)
  const [originalZones, setOriginalZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [activeTool, setActiveTool] = useState('select')
  const [showAddZoneDialog, setShowAddZoneDialog] = useState(false)
  const [routeBlockWarning, setRouteBlockWarning] = useState(false)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await mapApis.getMapDetail(mapId)
        if (!canceled && data) {
          setMap(data)
          const zonesCopy = (data.zones || []).map((z) => ({ ...z, points: [...(z.points || [])] }))
          setZones(zonesCopy)
          setOriginalZones(zonesCopy)
        }
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

  const hasChanges = JSON.stringify(zones) !== JSON.stringify(originalZones)

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('저장되지 않은 금지구역 변경이 모두 삭제됩니다. 계속하시겠습니까?')) {
        navigate(`/robot/maps/detail?mapId=${mapId}`)
      }
    } else {
      navigate(`/robot/maps/detail?mapId=${mapId}`)
    }
  }

  const handleApply = () => {
    if (!hasChanges) return
    navigate(`/robot/maps/deploy?mapId=${mapId}`, {
      state: { zones, originalZones }
    })
  }

  const handleAddZoneConfirm = (name, memo) => {
    const newZone = {
      id: `z-new-${Date.now()}`,
      name,
      type: 'no-go',
      points: [
        { x: 20, y: 20 },
        { x: 40, y: 20 },
        { x: 40, y: 40 },
        { x: 20, y: 40 }
      ],
      memo: memo || undefined
    }
    const updatedZones = [...zones, newZone]
    setZones(updatedZones)
    setSelectedZoneId(newZone.id)
    setActiveTool('select')

    const totalArea = updatedZones.reduce((sum, z) => {
      const minX = Math.min(...z.points.map((p) => p.x))
      const maxX = Math.max(...z.points.map((p) => p.x))
      const minY = Math.min(...z.points.map((p) => p.y))
      const maxY = Math.max(...z.points.map((p) => p.y))
      return sum + (maxX - minX) * (maxY - minY)
    }, 0)
    if (totalArea > 3000) setRouteBlockWarning(true)
    setShowAddZoneDialog(false)
  }

  const deleteZone = (zoneId) => {
    if (window.confirm('이 금지구역을 삭제하시겠습니까?')) {
      setZones((prev) => prev.filter((z) => z.id !== zoneId))
      if (selectedZoneId === zoneId) setSelectedZoneId(null)
    }
  }

  const selectedZone = zones.find((z) => z.id === selectedZoneId)

  return (
    <StyledPageContent>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={handleCancel}
            className="p-1 text-[18px] text-[#555] hover:bg-[#f3f4f6] rounded flex-shrink-0"
          >
            ←
          </button>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded flex-shrink-0"
            style={{ backgroundColor: '#d97706' }}
          >
            <span className="text-[10px] text-white">⬟</span>
            <span className="text-[10px] text-white">MAP EDIT MODE</span>
          </div>
          <span className="text-[14px] text-[#333] truncate">{getMapDisplayName(map)}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="px-3 py-1 border border-[#ddd] rounded text-[11px] text-[#555] bg-white hover:bg-[#f9f9f9]"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            disabled={!hasChanges}
            className={`flex items-center gap-1 px-3 py-1 rounded text-[11px] transition-colors ${
              hasChanges ? 'bg-[#1a8bc5] text-white hover:bg-[#157aae]' : 'bg-[#e5e7eb] text-[#aaa] cursor-not-allowed'
            }`}
          >
            💾 적용 / 배포
          </button>
        </div>
      </div>

      {/* Route Block Warning */}
      {routeBlockWarning && (
        <div className="flex items-center justify-between bg-[#fef3c7] border border-[#f59e0b] rounded px-3 py-2 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <span>⚠️</span>
            <span className="text-[11px] text-[#92400e] flex-1">
              일부 목적지로의 경로가 차단될 수 있습니다. 금지구역 범위를 확인해주세요.
            </span>
          </div>
          <button onClick={() => setRouteBlockWarning(false)} className="text-[16px] text-[#92400e] ml-2 leading-none">
            ×
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 bg-white border border-[#e8e8e8] rounded p-2 mb-3">
        <button
          onClick={() => setActiveTool('select')}
          className={`p-2 rounded text-[16px] transition-colors ${
            activeTool === 'select' ? 'bg-[#e8f4fd]' : 'hover:bg-[#f3f4f6]'
          }`}
          title="선택 도구"
        >
          <span style={{ color: activeTool === 'select' ? '#1a8bc5' : '#555' }}>↖</span>
        </button>
        <button
          onClick={() => setActiveTool('polygon')}
          className={`p-2 rounded text-[16px] transition-colors ${
            activeTool === 'polygon' ? 'bg-[#fef3c7]' : 'hover:bg-[#f3f4f6]'
          }`}
          title="금지구역 그리기"
        >
          <span style={{ color: activeTool === 'polygon' ? '#d97706' : '#555' }}>⬟</span>
        </button>
        <div className="w-px h-6 bg-[#e8e8e8]" />
        <button
          onClick={() => selectedZoneId && deleteZone(selectedZoneId)}
          disabled={!selectedZoneId}
          className="p-2 rounded text-[16px] hover:bg-[#f3f4f6] disabled:cursor-not-allowed"
          title="선택된 금지구역 삭제"
        >
          <span style={{ color: selectedZoneId ? '#dc2626' : '#aaa' }}>🗑</span>
        </button>
      </div>

      {/* Map Canvas */}
      <div className="bg-white border border-[#e8e8e8] rounded overflow-hidden mb-3">
        <div className="flex items-center justify-between px-3 py-2 bg-[#fffbeb] border-b border-[#fde68a]">
          <span className="text-[10px] text-[#92400e]">
            {activeTool === 'polygon'
              ? '"추가" 버튼으로 금지구역을 생성하세요'
              : '금지구역을 클릭하여 선택하거나, 도구를 선택하세요'}
          </span>
          {activeTool === 'polygon' && (
            <button
              onClick={() => setShowAddZoneDialog(true)}
              className="px-2 py-1 rounded text-[10px] text-white"
              style={{ backgroundColor: '#d97706' }}
            >
              추가
            </button>
          )}
        </div>
        <div className="h-56 bg-[#1a1f2e] flex flex-col items-center justify-center gap-2">
          <span className="text-4xl">🗺️</span>
          <span className="text-[12px] text-[#5a7a9a]">{getMapDisplayName(map)}</span>
          <span className="text-[10px] text-[#3a4a5a]">{map.mapType} — Edit Mode</span>
          {zones.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 px-3 justify-center">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZoneId(z.id)}
                  className="px-2 py-1 rounded-full border text-[9px] transition-colors"
                  style={{
                    backgroundColor: selectedZoneId === z.id ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.1)',
                    borderColor: selectedZoneId === z.id ? '#fca5a5' : '#ef4444',
                    color: selectedZoneId === z.id ? '#fca5a5' : '#ef4444'
                  }}
                >
                  🚫 {z.name}
                </button>
              ))}
            </div>
          )}
          <span className="text-[9px] text-[#3a4a5a] mt-1">
            {zones.length} zone{zones.length !== 1 ? 's' : ''} defined
          </span>
        </div>
      </div>

      {/* Zone List */}
      <div className="bg-white border border-[#e8e8e8] rounded p-3 mb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-[#333]">금지구역 ({zones.length})</span>
          <button
            onClick={() => setActiveTool('polygon')}
            className="p-1 rounded text-[12px]"
            style={{ backgroundColor: '#fef3c7', color: '#d97706' }}
          >
            ＋
          </button>
        </div>
        {zones.length === 0 ? (
          <p className="text-[10px] text-[#aaa]">설정된 금지구역이 없습니다.</p>
        ) : (
          zones.map((z) => (
            <div
              key={z.id}
              onClick={() => setSelectedZoneId(z.id)}
              className="p-2 border rounded mb-2 cursor-pointer transition-colors"
              style={{
                backgroundColor: selectedZoneId === z.id ? '#fff5f5' : '#fafafa',
                borderColor: selectedZoneId === z.id ? '#fca5a5' : '#e8e8e8'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#dc2626]">{z.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteZone(z.id)
                  }}
                  className="text-[12px] text-[#dc2626] p-1"
                >
                  🗑
                </button>
              </div>
              {z.memo && <p className="text-[10px] text-[#888] mt-1 truncate">{z.memo}</p>}
              <p className="text-[9px] text-[#aaa] mt-1">{(z.points || []).length}개 꼭짓점</p>
            </div>
          ))
        )}
      </div>

      {/* Selected Zone Properties */}
      {selectedZone && (
        <div className="bg-white border border-[#e8e8e8] rounded p-3 mb-3">
          <h3 className="text-[11px] text-[#333] mb-3">영역 속성</h3>
          <div className="mb-3">
            <label className="text-[10px] text-[#888] block mb-1">영역 이름</label>
            <input
              value={selectedZone.name}
              onChange={(e) =>
                setZones((prev) => prev.map((z) => (z.id === selectedZoneId ? { ...z, name: e.target.value } : z)))
              }
              className="w-full border border-[#ddd] rounded px-2 py-1.5 text-[11px] text-[#333] outline-none focus:border-[#1a8bc5]"
            />
          </div>
          <div className="mb-3">
            <label className="text-[10px] text-[#888] block mb-1">영역 타입</label>
            <span className="text-[10px] text-[#dc2626]">No-go (완전 금지)</span>
          </div>
          <div>
            <label className="text-[10px] text-[#888] block mb-1">메모</label>
            <textarea
              value={selectedZone.memo || ''}
              onChange={(e) =>
                setZones((prev) => prev.map((z) => (z.id === selectedZoneId ? { ...z, memo: e.target.value } : z)))
              }
              placeholder="왜 이 영역을 막았는지 기록..."
              rows={2}
              className="w-full border border-[#ddd] rounded px-2 py-1.5 text-[11px] text-[#333] resize-none outline-none focus:border-[#1a8bc5]"
            />
          </div>
        </div>
      )}

      {/* Hint Box */}
      <div className="bg-[#f0f4f8] border border-[#d1d9e0] rounded p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span>⚠️</span>
          <span className="text-[10px] text-[#333]">주행 영향 미리보기</span>
        </div>
        <p className="text-[10px] text-[#555]">금지구역은 로봇 경로 계산에서 제외됩니다.</p>
        <p className="text-[10px] text-[#888] mt-1">(실제 경로 시뮬레이션은 Phase-2)</p>
      </div>

      <AddZoneDialog
        visible={showAddZoneDialog}
        zoneCount={zones.length}
        onConfirm={handleAddZoneConfirm}
        onCancel={() => setShowAddZoneDialog(false)}
      />
    </StyledPageContent>
  )
}

export default MapEdit
