import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { StyledPageContent } from '@repo/ui'
import { mapApis } from '@/apis'
import '../../index.css'

// ─── Sub-views ─────────────────────────────────────────────────────────────────

function RobotStatusBadge({ status }) {
  const cls = {
    운영: 'bg-[#dbeafe] text-[#2563eb]',
    오프라인: 'bg-[#fef3c7] text-[#d97706]',
    에러: 'bg-[#fee2e2] text-[#dc2626]'
  }
  return (
    <span className={`px-2 py-[2px] rounded-full text-[9px] ${cls[status] || 'bg-[#f3f4f6] text-[#6b7280]'}`}>
      {status}
    </span>
  )
}

function DeployingView() {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full mb-4"
        style={{ borderColor: '#1a8bc5', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}
      />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <p className="text-[13px] text-[#333]">맵 변경 적용 중...</p>
      <p className="text-[11px] text-[#888] mt-1">운영 버전으로 승격하고 있습니다.</p>
    </div>
  )
}

function SuccessView({ robotCount, offlineCount, onGoBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="bg-white border border-[#e8e8e8] rounded p-6 w-full max-w-sm text-center shadow-sm">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-[14px] text-[#333] mb-2">맵 변경이 성공적으로 적용되었습니다.</p>
        <p className="text-[11px] text-[#888] mb-4">{robotCount}대 로봇에 다음 주행부터 변경된 맵이 적용됩니다.</p>
        {offlineCount > 0 && (
          <div className="bg-[#fef3c7] rounded p-2 mb-4">
            <p className="text-[10px] text-[#92400e]">
              {offlineCount}대 오프라인 로봇은 다음 연결 시 최신 맵을 수신합니다.
            </p>
          </div>
        )}
        <button onClick={onGoBack} className="px-4 py-2 bg-[#1a8bc5] text-white rounded text-[11px] hover:bg-[#157aae]">
          맵 관리로 돌아가기
        </button>
      </div>
    </div>
  )
}

function FailedView({ errorMessage, onRetry, onBackToEdit }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="bg-white border border-[#e8e8e8] rounded p-6 w-full max-w-sm text-center shadow-sm">
        <div className="text-5xl mb-3">❌</div>
        <p className="text-[14px] text-[#333] mb-2">맵 적용에 실패했습니다.</p>
        <p className="text-[11px] text-[#888] mb-4">
          {errorMessage || '서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 border border-[#ddd] rounded text-[11px] text-[#555] bg-white hover:bg-[#f9f9f9]"
          >
            다시 시도
          </button>
          <button
            onClick={onBackToEdit}
            className="px-4 py-2 bg-[#1a8bc5] text-white rounded text-[11px] hover:bg-[#157aae]"
          >
            편집으로 돌아가기
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

const MapDeploy = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { state } = useLocation()
  const mapId = searchParams.get('mapId')

  const [map, setMap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deployState, setDeployState] = useState('review')
  const [deployError, setDeployError] = useState('')

  const newZones = state?.zones || []
  const originalZones = state?.originalZones || []

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

  const appliedRobotList = map.robots || []
  const offlineRobots = appliedRobotList.filter((r) => r.status === '오프라인')

  const zonesToDeploy = newZones.length > 0 ? newZones : map.zones || []
  const addedZones = newZones.filter((nz) => !originalZones.find((oz) => oz.id === nz.id))
  const removedZones = originalZones.filter((oz) => !newZones.find((nz) => nz.id === oz.id))
  const modifiedZones = newZones.filter((nz) => {
    const original = originalZones.find((oz) => oz.id === nz.id)
    return original && JSON.stringify(original) !== JSON.stringify(nz)
  })
  const totalChanges = addedZones.length + removedZones.length + modifiedZones.length

  const handleDeploy = async () => {
    if (
      !window.confirm(
        `이 변경은 ${appliedRobotList.length}대 로봇의 주행에 즉시 영향을 미칩니다.\n적용 후 취소할 수 없습니다.\n\n변경 내용과 영향 범위를 확인하셨습니까?`
      )
    )
      return

    setDeployState('deploying')
    setDeployError('')
    try {
      await mapApis.deployMap(mapId, {
        zones: zonesToDeploy,
        deployType: 'immediate'
      })
      setDeployState('success')
    } catch (e) {
      console.error('맵 배포 실패:', e)
      setDeployError(e?.response?.data?.message || e?.message || '')
      setDeployState('failed')
    }
  }

  return (
    <StyledPageContent>
      {deployState === 'deploying' && <DeployingView />}

      {deployState === 'success' && (
        <SuccessView
          robotCount={appliedRobotList.length}
          offlineCount={offlineRobots.length}
          onGoBack={() => navigate('/robot/maps')}
        />
      )}

      {deployState === 'failed' && (
        <FailedView
          errorMessage={deployError}
          onRetry={() => setDeployState('review')}
          onBackToEdit={() => navigate(`/robot/maps/edit?mapId=${mapId}`)}
        />
      )}

      {deployState === 'review' && (
        <>
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => navigate(`/robot/maps/edit?mapId=${mapId}`)}
              className="text-[18px] text-[#555] hover:bg-[#f3f4f6] rounded p-1"
            >
              ←
            </button>
            <span className="text-[16px]">🚀</span>
            <h2 className="text-[14px] text-[#333]">맵 변경 적용 &amp; 배포</h2>
          </div>

          {/* Change Summary */}
          <div className="bg-white border border-[#e8e8e8] rounded p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[14px]">📄</span>
              <span className="text-[12px] text-[#333]">변경 요약</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-[#f0fdf4] rounded p-2 text-center">
                <span className="text-[22px] font-bold block" style={{ color: '#059669' }}>
                  {addedZones.length}
                </span>
                <span className="text-[10px] text-[#888]">추가</span>
              </div>
              <div className="bg-[#fef3c7] rounded p-2 text-center">
                <span className="text-[22px] font-bold block" style={{ color: '#d97706' }}>
                  {modifiedZones.length}
                </span>
                <span className="text-[10px] text-[#888]">수정</span>
              </div>
              <div className="bg-[#fee2e2] rounded p-2 text-center">
                <span className="text-[22px] font-bold block" style={{ color: '#dc2626' }}>
                  {removedZones.length}
                </span>
                <span className="text-[10px] text-[#888]">삭제</span>
              </div>
            </div>
            {[
              ['식별자', getMapDisplayName(map)],
              ['변경 유형', '금지구역 설정'],
              ['총 변경 영역', `${totalChanges}개`],
              ['편집 시각', new Date().toLocaleString('ko-KR')]
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1 border-b border-[#f0f0f0]">
                <span className="text-[11px] text-[#888]">{label}</span>
                <span className="text-[11px] text-[#333]">{value}</span>
              </div>
            ))}
          </div>

          {/* Zone Change Details */}
          {totalChanges > 0 && (
            <div className="bg-white border border-[#e8e8e8] rounded p-4 mb-3">
              <p className="text-[12px] text-[#333] mb-3">변경 상세</p>
              {addedZones.map((z) => (
                <div key={z.id} className="flex items-center gap-2 p-2 bg-[#f0fdf4] rounded mb-2">
                  <span className="px-2 py-[2px] bg-[#d1fae5] rounded-full text-[9px] text-[#059669] flex-shrink-0">
                    추가
                  </span>
                  <span className="text-[11px] text-[#333] flex-1">{z.name}</span>
                  {z.memo && <span className="text-[10px] text-[#888] truncate">{z.memo}</span>}
                </div>
              ))}
              {modifiedZones.map((z) => (
                <div key={z.id} className="flex items-center gap-2 p-2 bg-[#fffbeb] rounded mb-2">
                  <span className="px-2 py-[2px] bg-[#fef3c7] rounded-full text-[9px] text-[#d97706] flex-shrink-0">
                    수정
                  </span>
                  <span className="text-[11px] text-[#333]">{z.name}</span>
                </div>
              ))}
              {removedZones.map((z) => (
                <div key={z.id} className="flex items-center gap-2 p-2 bg-[#fef2f2] rounded mb-2">
                  <span className="px-2 py-[2px] bg-[#fee2e2] rounded-full text-[9px] text-[#dc2626] flex-shrink-0">
                    삭제
                  </span>
                  <span className="text-[11px] text-[#333] line-through">{z.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Impact Scope */}
          <div className="bg-white border border-[#e8e8e8] rounded p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span>👥</span>
              <span className="text-[12px] text-[#333]">영향 로봇 범위</span>
            </div>
            <div
              className="rounded p-3 text-center mb-3"
              style={{ backgroundColor: appliedRobotList.length >= 3 ? '#fee2e2' : '#f8f9fa' }}
            >
              <span
                className="text-[28px] font-bold block"
                style={{ color: appliedRobotList.length >= 3 ? '#dc2626' : '#333' }}
              >
                {appliedRobotList.length}
              </span>
              <p className="text-[10px] text-[#888]">대 로봇에 영향</p>
            </div>
            {appliedRobotList.length >= 3 && (
              <div className="flex gap-2 bg-[#fef3c7] rounded p-2 mb-3">
                <span>⚠️</span>
                <span className="text-[10px] text-[#92400e] flex-1">
                  다수 로봇에 적용되는 맵입니다. 변경 영향을 신중히 확인하세요.
                </span>
              </div>
            )}
            <div className="space-y-1">
              {appliedRobotList.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1 border-b border-[#f0f0f0]">
                  <span className="text-[10px] text-[#333]">{r.name}</span>
                  <RobotStatusBadge status={r.status} />
                </div>
              ))}
            </div>
            {offlineRobots.length > 0 && (
              <p className="text-[10px] text-[#888] mt-2 pt-2 border-t border-[#f0f0f0]">
                🕐 오프라인 로봇은 다음 연결 시 최신 맵 수신
              </p>
            )}
            <div className="mt-2 pt-2 border-t border-[#f0f0f0] space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-[#888]">Group</span>
                <span className="text-[10px] text-[#333]">{map.group || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-[#888]">Site</span>
                <span className="text-[10px] text-[#333]">{map.site || '-'}</span>
              </div>
            </div>
          </div>

          {/* Apply Method */}
          <div className="bg-white border border-[#e8e8e8] rounded p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span>🛡️</span>
              <span className="text-[12px] text-[#333]">적용 방식</span>
            </div>
            <div className="flex items-start gap-2 p-2 bg-[#e8f4fd] border border-[#bae1f5] rounded mb-2">
              <div
                className="w-[14px] h-[14px] rounded-full bg-white mt-0.5 flex-shrink-0"
                style={{ border: '4px solid #1a8bc5' }}
              />
              <div>
                <p className="text-[11px] text-[#333]">즉시 적용</p>
                <p className="text-[10px] text-[#888]">로봇이 다음 주행부터 변경 맵 사용</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-[#f3f4f6] border border-[#e8e8e8] rounded opacity-50">
              <div className="w-[14px] h-[14px] rounded-full bg-white border-2 border-[#ddd] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-[#888]">예약 적용 (Phase-2)</p>
                <p className="text-[10px] text-[#aaa]">특정 시점/조건 후 적용</p>
              </div>
            </div>
          </div>

          {/* Deploy Button */}
          <button
            onClick={handleDeploy}
            className="w-full py-3 text-white rounded flex items-center justify-center gap-2 mb-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#1a8bc5' }}
          >
            <span className="text-[14px]">🚀</span>
            <span className="text-[12px]">맵 변경 적용</span>
          </button>

          <p className="text-[10px] text-[#888] text-center mb-4">
            이 변경은 선택된 로봇의 주행에 즉시 영향을 미칩니다.
          </p>
        </>
      )}
    </StyledPageContent>
  )
}

export default MapDeploy
