import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dropdown } from '@repo/ui'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`
// 건물 → 층 → 영역 계층 셀렉터 (공통 컴포넌트).
// 각 계층은 하위 항목이 있을 때만 노출된다.
// props:
//   buildings: 사이트 단건 조회의 buildings[] (floors[].areas[] 포함)
//   value:     { buildingId, floorId, areaId }
//   onChange:  (nextValue) => void  — 변경된 선택 전체를 전달

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

  const buildingOptions = buildings.map((b) => ({
    name: `${b.buildingName}${suffix(cntBuilding(b))}`,
    value: b.buildingId
  }))

  const floorOptions = floors.map((f) => ({
    name: `${f.floorName}${suffix(cntFloor(f))}`,
    value: f.floorId
  }))

  const areaOptions = areas.map((a) => ({
    name: `${a.areaName}${suffix(cntArea(a))}`,
    value: a.areaId
  }))

  return (
    <Wrapper>
      <Dropdown
        size="sm"
        placeholder={t('building')}
        value={buildingId}
        options={buildingOptions}
        onChange={(val) => onChange?.({ buildingId: val, floorId: '', areaId: '' })}
      />

      {floors.length > 0 && (
        <Dropdown
          size="sm"
          placeholder={t('floor')}
          value={floorId}
          options={floorOptions}
          onChange={(val) => onChange?.({ buildingId, floorId: val, areaId: firstAreaOf(val) })}
        />
      )}

      {areas.length > 0 && (
        <Dropdown
          size="sm"
          placeholder={t('area')}
          value={areaId}
          options={areaOptions}
          onChange={(val) => onChange?.({ buildingId, floorId, areaId: val })}
        />
      )}
    </Wrapper>
  )
}

export default LocationSelector
