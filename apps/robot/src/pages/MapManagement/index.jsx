import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { StyledPageContent, Title, SectionRobot } from '@repo/ui'
import { GroupSiteFilter, UNREGISTERED } from '@/common/GroupSiteFilter'
import { useAppContext } from '@/common/AppContext'
import { mapApis, groupApis, siteApis } from '@/apis'
import '../../index.css'

// ─── Badge Components ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cls = {
    Active: 'bg-[#d1fae5] text-[#059669]',
    Draft: 'bg-[#fef3c7] text-[#d97706]',
    Deprecated: 'bg-[#f3f4f6] text-[#6b7280]'
  }
  return (
    <span className={`px-2 py-[2px] rounded-full text-[9px] whitespace-nowrap ${cls[status] || cls.Deprecated}`}>
      {status}
    </span>
  )
}

function MapTypeBadge({ type }) {
  const cls = {
    SLAM: 'bg-[#dbeafe] text-[#2563eb]',
    Grid: 'bg-[#e8e0f0] text-[#7c3aed]',
    'Real Map': 'bg-[#fce7f3] text-[#db2777]'
  }
  return (
    <span
      className={`px-2 py-[2px] rounded-full text-[9px] whitespace-nowrap ${cls[type] || 'bg-[#f3f4f6] text-[#6b7280]'}`}
    >
      {type}
    </span>
  )
}

function OwnerTypeBadge({ ownerType }) {
  const isSite = ownerType === 'site'
  return (
    <span
      className={`px-2 py-[2px] rounded-full text-[9px] whitespace-nowrap ${isSite ? 'bg-[#e8f4fd] text-[#1a8bc5]' : 'bg-[#f3e8ff] text-[#7c3aed]'}`}
    >
      {isSite ? '사이트 맵' : '로봇 맵'}
    </span>
  )
}

function getMapDisplayName(map) {
  if (map.ownerType === 'site') return map.site || '(미등록)'
  if (map.ownerRobotName) return `${map.ownerRobotName} (${map.ownerRobotMacAddress || ''})`
  return map.ownerRobotId || 'Unknown'
}

// ─── Main Component ────────────────────────────────────────────────────────────

const MapManagement = () => {
  const navigate = useNavigate()
  const { selectedGroup, selectedSite } = useAppContext()

  const [maps, setMaps] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState('list')

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const [groupsData, sitesData] = await Promise.all([groupApis.getGroups({}), siteApis.getSites({})])
        if (canceled) return
        const groupList = groupsData?.content || groupsData || []
        const siteList = sitesData?.content || sitesData || []
        const merged = groupList.map((g) => ({
          id: g.id ?? g.groupId,
          name: g.name ?? g.groupName,
          sites: siteList
            .filter((s) => s.groupId === (g.id ?? g.groupId))
            .map((s) => ({ id: s.id ?? s.siteId, name: s.name ?? s.siteName }))
        }))
        setGroups(merged)
      } catch (e) {
        console.error('그룹/사이트 조회 실패:', e)
      }
    })()
    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      setLoading(true)
      try {
        const params = {}
        if (selectedSite && selectedSite !== UNREGISTERED) params.siteId = selectedSite
        if (selectedGroup && selectedGroup !== UNREGISTERED) params.groupId = selectedGroup
        const data = await mapApis.getMaps(params)
        if (!canceled) setMaps(data?.content || data || [])
      } catch (e) {
        console.error('맵 목록 조회 실패:', e)
        if (!canceled) setMaps([])
      } finally {
        if (!canceled) setLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
  }, [selectedGroup, selectedSite])

  const filtered = useMemo(() => {
    return maps.filter((m) => {
      const matchGroup = !selectedGroup ? true : selectedGroup === UNREGISTERED ? !m.group : m.group === selectedGroup
      const matchSite = !selectedSite ? true : selectedSite === UNREGISTERED ? !m.site : m.site === selectedSite
      const matchSearch = !search || getMapDisplayName(m).toLowerCase().includes(search.toLowerCase())
      const matchStatus = !statusFilter || m.status === statusFilter
      return matchGroup && matchSite && matchSearch && matchStatus
    })
  }, [maps, selectedGroup, selectedSite, search, statusFilter])

  return (
    <StyledPageContent className="column">
      <Title>맵 관리</Title>
      <SectionRobot>
        {/* Filter Row */}
        <GroupSiteFilter groups={groups}>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-[#ddd] rounded px-2 py-[5px] text-[11px] text-[#555] bg-white"
            >
              <option value="">전체 상태</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Deprecated">Deprecated</option>
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="맵 ID 검색..."
              className="border border-[#ddd] rounded px-2 py-[5px] text-[11px] text-[#333] bg-white w-36"
            />
          </div>
        </GroupSiteFilter>

        {/* View Toggle + Count */}
        <div className="flex items-center justify-between mb-4">
          <div style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>
            총 : {loading ? '...' : filtered.length}
          </div>
          <div className="flex gap-1">
            {['list', 'grid'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{ borderRadius: '.25rem' }}
                className={`px-3 py-[5px] text-[11px] border transition-colors ${
                  viewMode === mode
                    ? 'bg-[#1a8bc5] text-white border-[#1a8bc5]'
                    : 'bg-white text-[#666] border-[#ddd] hover:bg-[#f0f0f0]'
                }`}
              >
                {mode === 'list' ? '리스트' : '그리드'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-[#e8e8e8] rounded p-8 text-center">
            <p className="text-[12px] text-[#888]">맵 목록을 불러오는 중...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white border border-[#e8e8e8] rounded p-8 text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <p className="text-[12px] text-[#888]">조건에 맞는 맵이 없습니다.</p>
            <p className="text-[11px] text-[#aaa] mt-1">필터 조건을 변경해 보세요.</p>
          </div>
        )}

        {/* List View */}
        {!loading && filtered.length > 0 && viewMode === 'list' && (
          <div className="bg-white border border-[#e8e8e8] rounded overflow-hidden">
            <div
              className="grid bg-[#f8f9fa] border-b border-[#e8e8e8] px-3 py-2"
              style={{ gridTemplateColumns: '3fr 1.5fr 1.5fr 2fr 1fr 1.5fr' }}
            >
              {['맵 식별자', '타입', '상태', 'Site', '사용 로봇', '액션'].map((h, i) => (
                <div key={i} className="text-[10px] text-[#888] px-1">
                  {h}
                </div>
              ))}
            </div>
            {filtered.map((m) => {
              const robotCount = m.robotCount ?? 0
              return (
                <div
                  key={m.id}
                  className="grid border-b border-[#f0f0f0] px-3 py-2 items-center hover:bg-[#f9f9f9] cursor-pointer"
                  style={{ gridTemplateColumns: '3fr 1.5fr 1.5fr 2fr 1fr 1.5fr' }}
                  onClick={() => navigate(`/robot/maps/detail?mapId=${m.id}`)}
                >
                  {/* Name */}
                  <div className="px-1 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.ownerType === 'site' ? '#1a8bc5' : '#7c3aed' }}
                      />
                      <span className="text-[11px] text-[#333] truncate">{getMapDisplayName(m)}</span>
                    </div>
                    <OwnerTypeBadge ownerType={m.ownerType} />
                    {m.ownerType === 'site' && (m.building || m.floor || m.area) && (
                      <span className="text-[9px] text-[#888] truncate">
                        {[m.building, m.floor, m.area].filter(Boolean).join(' > ')}
                      </span>
                    )}
                  </div>
                  {/* Type */}
                  <div className="px-1">
                    <MapTypeBadge type={m.mapType} />
                  </div>
                  {/* Status */}
                  <div className="px-1">
                    <StatusBadge status={m.status} />
                  </div>
                  {/* Site */}
                  <div className="px-1">
                    <span className="text-[11px] text-[#333] truncate">
                      {m.site || <span className="text-[#aaa] italic">미배정</span>}
                    </span>
                  </div>
                  {/* Robots */}
                  <div className="px-1 flex justify-center">
                    {robotCount > 0 ? (
                      <span
                        className={`px-2 py-[2px] rounded-full text-[9px] ${
                          robotCount >= 3 ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#dbeafe] text-[#2563eb]'
                        }`}
                      >
                        {robotCount}대
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#aaa]">0</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="px-1 flex gap-1 justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/robot/maps/detail?mapId=${m.id}`)
                      }}
                      className="px-2 py-1 bg-[#e8f4fd] text-[#1a8bc5] text-[9px] rounded"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/robot/maps/edit?mapId=${m.id}`)
                      }}
                      className="px-2 py-1 bg-[#fef3c7] text-[#d97706] text-[9px] rounded"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Grid View */}
        {!loading && filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {filtered.map((m) => {
              const robotCount = m.robotCount ?? 0
              return (
                <div
                  key={m.id}
                  className="bg-white border border-[#e8e8e8] rounded p-3 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/robot/maps/detail?mapId=${m.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="bg-[#f0f4f8] rounded h-24 flex flex-col items-center justify-center mb-3 relative">
                    <span className="text-[10px] text-[#888]">{m.mapType}</span>
                    <span className="text-[9px] text-[#aaa]">{getMapDisplayName(m)}</span>
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={m.status} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.ownerType === 'site' ? '#1a8bc5' : '#7c3aed' }}
                    />
                    <span className="text-[12px] text-[#333] truncate">{getMapDisplayName(m)}</span>
                  </div>

                  {m.ownerType === 'site' && (m.building || m.floor || m.area) && (
                    <p className="text-[9px] text-[#888] mb-1 truncate">
                      {[m.building, m.floor, m.area].filter(Boolean).join(' > ')}
                    </p>
                  )}

                  <div className="flex gap-1 mb-2 flex-wrap">
                    <MapTypeBadge type={m.mapType} />
                    <OwnerTypeBadge ownerType={m.ownerType} />
                  </div>

                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-[#888] truncate">{m.site || '미배정'}</span>
                    <span
                      className={`px-2 py-[2px] rounded-full text-[9px] ${
                        robotCount >= 3
                          ? 'bg-[#fee2e2] text-[#dc2626]'
                          : robotCount > 0
                            ? 'bg-[#dbeafe] text-[#2563eb]'
                            : 'bg-[#f3f4f6] text-[#aaa]'
                      }`}
                    >
                      사용 {robotCount}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#aaa] mb-2">수정: {m.updatedAt}</p>

                  <div className="flex gap-2 pt-2 border-t border-[#f0f0f0]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/robot/maps/detail?mapId=${m.id}`)
                      }}
                      className="flex-1 py-1 bg-[#e8f4fd] text-[#1a8bc5] text-[10px] rounded"
                    >
                      상세
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/robot/maps/edit?mapId=${m.id}`)
                      }}
                      className="flex-1 py-1 bg-[#fef3c7] text-[#d97706] text-[10px] rounded"
                    >
                      편집
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-[#888]">
            <span>총 {filtered.length}개 맵</span>
            <span style={{ color: '#1a8bc5' }}>사이트맵 {filtered.filter((m) => m.ownerType === 'site').length}</span>
            <span style={{ color: '#7c3aed' }}>로봇맵 {filtered.filter((m) => m.ownerType === 'robot').length}</span>
            <span>Active: {filtered.filter((m) => m.status === 'Active').length}</span>
            <span>Draft: {filtered.filter((m) => m.status === 'Draft').length}</span>
          </div>
        )}
      </SectionRobot>
    </StyledPageContent>
  )
}

export default MapManagement
