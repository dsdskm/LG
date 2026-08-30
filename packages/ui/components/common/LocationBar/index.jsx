import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Dropdown from '../Dropdown'
import { StyledLocationBar } from './styles'

/**
 * 위치 계층(Building > Floor > Area) 선택 바.
 * Building / Floor / Area 순서로 드롭다운 3개를 나란히 배치한다.
 * 목록 조회는 하지 않는 표현 전용 컴포넌트로, 목록(buildings/floors/areas)과 선택값(value)을
 * 부모에서 props 로 받고 선택 변경만 onChange 로 올려보낸다.
 *
 * @param {object[]} buildings 건물 목록 (백엔드 레코드 그대로)
 * @param {object[]} floors 선택된 건물의 층 목록
 * @param {object[]} areas 선택된 층의 구역 목록
 * @param {{buildingId: string|number, floorId: string|number, areaId: string|number}} value 현재 선택값
 * @param {Function} onChange 선택 변경 핸들러 — 변경된 전체 선택값 객체를 넘긴다
 * @param {boolean} [disabled] 세 드롭다운을 모두 잠근다 (선택을 바꾸면 안 되는 상태에서 사용)
 */

// name 은 백엔드에서 다국어 JSONB({ default, 'ko-kr', 'en-us' }) 로 내려온다.
// 선택된 위치로 이름을 만드는 화면(예: 매핑 맵 이름)도 같은 규칙을 써야 해서 함께 내보낸다.
export const resolveLocationName = (item, language) => {
  const name = item?.name
  if (typeof name === 'string') return name
  const localized = name?.[String(language).toLowerCase()] || name?.default
  return localized || item?.extId || String(item?.id ?? '')
}

export default function LocationBar({ buildings = [], floors = [], areas = [], value, onChange, disabled = false }) {
  const { t, i18n } = useTranslation('common')
  const language = i18n.language

  const { buildingId = '', floorId = '', areaId = '' } = value || {}

  const buildingOptions = useMemo(
    () => buildings.map((item) => ({ name: resolveLocationName(item, language), value: item.id })),
    [buildings, language]
  )
  const floorOptions = useMemo(
    () => floors.map((item) => ({ name: resolveLocationName(item, language), value: item.id })),
    [floors, language]
  )
  const areaOptions = useMemo(
    () => areas.map((item) => ({ name: resolveLocationName(item, language), value: item.id })),
    [areas, language]
  )

  return (
    <StyledLocationBar>
      <Dropdown
        label={t('building')}
        placeholder={t('selectBuilding')}
        minWidth="200px"
        options={buildingOptions}
        value={buildingId}
        disabled={disabled}
        onChange={(next) => onChange({ buildingId: next, floorId: '', areaId: '' })}
      />
      <Dropdown
        label={t('floor')}
        placeholder={t('selectFloor')}
        minWidth="200px"
        options={floorOptions}
        value={floorId}
        disabled={disabled || !buildingId}
        onChange={(next) => onChange({ buildingId, floorId: next, areaId: '' })}
      />
      <Dropdown
        label={t('area')}
        placeholder={t('selectArea')}
        minWidth="200px"
        options={areaOptions}
        value={areaId}
        disabled={disabled || !floorId}
        onChange={(next) => onChange({ buildingId, floorId, areaId: next })}
      />
    </StyledLocationBar>
  )
}
