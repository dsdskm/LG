import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dropdown } from '@repo/ui'
import { list as listBuildings } from '@/apis/buildingApis'
import { list as listFloors } from '@/apis/floorApis'
import { list as listAreas } from '@/apis/areaApis'

/**
 * LocationBar
 *
 * 위치 계층(Building > Floor > Area) 선택 바.
 * 상단바(ConnectionBar) 위에 Building / Floor / Area 순서로 드롭다운 3개를 나란히 배치한다.
 * 상위 선택이 바뀌면 하위 목록을 다시 조회하고 하위 선택은 초기화한다.
 */

// name 은 백엔드에서 다국어 JSONB({ default, 'ko-kr', 'en-us' }) 로 내려온다.
const resolveName = (item, language) => {
  const name = item?.name
  if (typeof name === 'string') return name
  const localized = name?.[String(language).toLowerCase()] || name?.default
  return localized || item?.extId || String(item?.id ?? '')
}

export default function LocationBar({ value, onChange }) {
  const { t, i18n } = useTranslation('map')
  const language = i18n.language

  const [buildings, setBuildings] = useState([])
  const [floors, setFloors] = useState([])
  const [areas, setAreas] = useState([])

  const { buildingId = '', floorId = '', areaId = '' } = value || {}

  useEffect(() => {
    let alive = true
    listBuildings()
      .then((res) => alive && setBuildings(res?.data || []))
      .catch(() => alive && setBuildings([]))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!buildingId) {
      setFloors([])
      return
    }
    let alive = true
    listFloors({ buildingId })
      .then((res) => alive && setFloors(res?.data || []))
      .catch(() => alive && setFloors([]))
    return () => {
      alive = false
    }
  }, [buildingId])

  useEffect(() => {
    if (!floorId) {
      setAreas([])
      return
    }
    let alive = true
    listAreas({ floorId })
      .then((res) => alive && setAreas(res?.data || []))
      .catch(() => alive && setAreas([]))
    return () => {
      alive = false
    }
  }, [floorId])

  const buildingOptions = useMemo(
    () => buildings.map((item) => ({ name: resolveName(item, language), value: item.id })),
    [buildings, language]
  )
  const floorOptions = useMemo(
    () => floors.map((item) => ({ name: resolveName(item, language), value: item.id })),
    [floors, language]
  )
  const areaOptions = useMemo(
    () => areas.map((item) => ({ name: resolveName(item, language), value: item.id })),
    [areas, language]
  )

  return (
    <div style={styles.bar}>
      <Dropdown
        label={t('building')}
        placeholder={t('selectBuilding')}
        minWidth="200px"
        options={buildingOptions}
        value={buildingId}
        onChange={(next) => onChange({ buildingId: next, floorId: '', areaId: '' })}
      />
      <Dropdown
        label={t('floor')}
        placeholder={t('selectFloor')}
        minWidth="200px"
        options={floorOptions}
        value={floorId}
        disabled={!buildingId}
        onChange={(next) => onChange({ buildingId, floorId: next, areaId: '' })}
      />
      <Dropdown
        label={t('area')}
        placeholder={t('selectArea')}
        minWidth="200px"
        options={areaOptions}
        value={areaId}
        disabled={!floorId}
        onChange={(next) => onChange({ buildingId, floorId, areaId: next })}
      />
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    padding: '10px 16px',
    background: '#fff',
    borderBottom: '1px solid #ddd',
    flexWrap: 'wrap'
  }
}
