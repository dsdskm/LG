import React from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

// 건물 → 층 → 영역 계층 셀렉터 (공통 컴포넌트).
// 각 계층은 하위 항목이 있을 때만 노출된다.
// props:
//   buildings: 사이트 단건 조회의 buildings[] (floors[].areas[] 포함)
//   value:     { buildingId, floorId, areaId }
//   onChange:  (nextValue) => void  — 변경된 선택 전체를 전달
const Select = styled.select`
  margin-left: 10px;
  max-height: 30px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 1.3rem;
  color: #334155;
  background: #fff;
  cursor: pointer;
`

const LocationSelector = ({ buildings = [], value = {}, onChange, areaCounts = {} }) => {
  const { t } = useTranslation('robot')
  const { buildingId = '', floorId = '', areaId = '' } = value

  // 로봇 댓수 (영역별 카운트 → 층/빌딩은 하위 영역 합산)
  const cntArea = (a) => areaCounts[a?.areaId] ?? 0
  const cntFloor = (f) => (f?.areas ?? []).reduce((s, a) => s + cntArea(a), 0)
  const cntBuilding = (b) => (b?.floors ?? []).reduce((s, f) => s + cntFloor(f), 0)
  const suffix = (n) => ` (${n}${t('unit')})`

  const selBuilding = buildings.find((b) => b.buildingId === buildingId)
  // 층은 floorIndex 내림차순(상층 → 하층)으로 표시
  const floors = [...(selBuilding?.floors ?? [])].sort((a, b) => (b.floorIndex ?? 0) - (a.floorIndex ?? 0))
  const selFloor = floors.find((f) => f.floorId === floorId)
  // 영역은 이름순 정렬
  const areas = [...(selFloor?.areas ?? [])].sort((a, b) => (a.areaName ?? '').localeCompare(b.areaName ?? ''))

  // 층 선택 시 자동 선택할 영역(이름순 최상단)
  const firstAreaOf = (fid) => {
    const f = floors.find((x) => x.floorId === fid)
    const sorted = [...(f?.areas ?? [])].sort((a, b) => (a.areaName ?? '').localeCompare(b.areaName ?? ''))
    return sorted[0]?.areaId ?? ''
  }

  if (!buildings.length) return null

  return (
    <>
      <Select
        value={buildingId}
        onChange={(e) => onChange?.({ buildingId: e.target.value, floorId: '', areaId: '' })}
      >
        <option value="">{t('building')}</option>
        {buildings.map((b) => (
          <option key={b.buildingId} value={b.buildingId}>
            {b.buildingName}{suffix(cntBuilding(b))}
          </option>
        ))}
      </Select>

      {floors.length > 0 && (
        <Select
          value={floorId}
          onChange={(e) => onChange?.({ buildingId, floorId: e.target.value, areaId: firstAreaOf(e.target.value) })}
        >
          <option value="">{t('floor')}</option>
          {floors.map((f) => (
            <option key={f.floorId} value={f.floorId}>
              {f.floorName}{suffix(cntFloor(f))}
            </option>
          ))}
        </Select>
      )}

      {areas.length > 0 && (
        <Select value={areaId} onChange={(e) => onChange?.({ buildingId, floorId, areaId: e.target.value })}>
          {areas.map((a) => (
            <option key={a.areaId} value={a.areaId}>
              {a.areaName}{suffix(cntArea(a))}
            </option>
          ))}
        </Select>
      )}
    </>
  )
}

export default LocationSelector
