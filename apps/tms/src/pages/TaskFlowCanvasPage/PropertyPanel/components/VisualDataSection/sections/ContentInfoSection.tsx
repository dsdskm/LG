import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FieldBody,
  FieldCard,
  FieldLabel,
  InfoBox,
  NestedCard,
  NestedLabel,
  NestedList,
  TextInput
} from './styles.sections'
import { getSiteById } from '@/api/siteApi'
import { SelectedData } from '../types'

type MapLocationLabelResult = {
  buildingId: string | null
  floorId: string | null
  areaId: string | null
  buildingName: string
  floorName: string
  areaName: string
  label: string
}

type ContentInfoSectionProps = {
  selectedData: SelectedData | null
}

type Row = { label: string; value: string }

const POI_LOCATION_KEYS = new Set(['buildingId', 'building_id', 'floorId', 'floor_id', 'areaId', 'area_id'])

function isPoiContent(selectedData: SelectedData | null | undefined) {
  const contentTypeId = Number(selectedData?.contentTypeId ?? 0)
  return contentTypeId === 1 || String(selectedData?.contentTypeName ?? '').toUpperCase() === 'POI'
}

function pickLocationValue(...candidates: Array<unknown>): string | null {
  for (const value of candidates) {
    if (value == null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return null
}

// content_value 가 JSON(object/array) 문자열이면 파싱, 아니면 단순 문자열로 취급한다.
function parseContentValue(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return raw
  try {
    return JSON.parse(trimmed)
  } catch {
    return raw
  }
}

function isBranch(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object'
}

// object/array 를 카드 안의 카드로 재귀 렌더링한다.
function renderNode(label: string, value: unknown): ReactNode {
  if (isBranch(value)) {
    const entries: [string, unknown][] = Array.isArray(value)
      ? value.map((v, i) => [`[${i}]`, v])
      : Object.entries(value)

    return (
      <NestedCard key={label}>
        <NestedLabel>{label}</NestedLabel>
        <NestedList>
          {entries.length === 0 ? (
            <TextInput type="text" value={Array.isArray(value) ? '[]' : '{}'} disabled readOnly />
          ) : (
            entries.map(([key, child]) => renderNode(key, child))
          )}
        </NestedList>
      </NestedCard>
    )
  }

  return (
    <NestedCard key={label}>
      <NestedLabel>{label}</NestedLabel>
      <NestedList>
        <TextInput type="text" value={value == null ? '' : String(value)} disabled readOnly />
      </NestedList>
    </NestedCard>
  )
}

export default function ContentInfoSection({ selectedData }: ContentInfoSectionProps) {
  const { t } = useTranslation('tms')
  const [locationInfo, setLocationInfo] = useState<MapLocationLabelResult | null>(null)

  const parsedContentValue = useMemo(() => parseContentValue(selectedData?.contentValue ?? ''), [selectedData])

  useEffect(() => {
    if (!selectedData || typeof parsedContentValue !== 'object' || parsedContentValue == null || Array.isArray(parsedContentValue)) {
      setLocationInfo(null)
      return
    }

    const source = parsedContentValue as Record<string, unknown>
    const selectedLike = selectedData as Record<string, unknown>
    const buildingId = pickLocationValue(source.buildingId, source.building_id, selectedLike.buildingId, selectedLike.building_id)
    const floorId = pickLocationValue(source.floorId, source.floor_id, selectedLike.floorId, selectedLike.floor_id)
    const areaId = pickLocationValue(source.areaId, source.area_id, selectedLike.areaId, selectedLike.area_id)

    let cancelled = false

    const resolve = async () => {
      const fallback: MapLocationLabelResult = {
        buildingId: buildingId ?? null,
        floorId: floorId ?? null,
        areaId: areaId ?? null,
        buildingName: buildingId ?? '',
        floorName: floorId ?? '',
        areaName: areaId ?? '',
        label: [buildingId, floorId, areaId].filter(Boolean).join(' / '),
      }

      if (!selectedData.siteId) {
        setLocationInfo(fallback)
        return
      }

      try {
        const response = await getSiteById(selectedData.siteId)
        console.log(`response`,response)
        const data = (response as any)?.data ?? response
        const buildings = Array.isArray(data?.buildings) ? data.buildings : []

        const building = buildings.find((item: any) => {
          const id = pickLocationValue(item?.buildingId, item?.building_id)
          return id && buildingId && String(id) === String(buildingId)
        })

        const resolvedBuildingName = String(building?.buildingName ?? building?.building_name ?? buildingId ?? '').trim()
        const floors = Array.isArray(building?.floors) ? building.floors : []
        const floor = floors.find((item: any) => {
          const id = pickLocationValue(item?.floorId, item?.floor_id)
          return id && floorId && String(id) === String(floorId)
        })

        const resolvedFloorName = String(floor?.floorName ?? floor?.floor_name ?? floorId ?? '').trim()
        const areas = Array.isArray(floor?.areas) ? floor.areas : []
        const area = areas.find((item: any) => {
          const id = pickLocationValue(item?.areaId, item?.area_id)
          return id && areaId && String(id) === String(areaId)
        })

        const resolvedAreaName = String(area?.areaName ?? area?.area_name ?? areaId ?? '').trim()
        const resolved: MapLocationLabelResult = {
          buildingId: buildingId ?? null,
          floorId: floorId ?? null,
          areaId: areaId ?? null,
          buildingName: resolvedBuildingName,
          floorName: resolvedFloorName,
          areaName: resolvedAreaName,
          label: [resolvedBuildingName, resolvedFloorName, resolvedAreaName].filter(Boolean).join(' / ')
        }

        if (!cancelled) {
          setLocationInfo(resolved)
        }
      } catch {
        if (!cancelled) {
          setLocationInfo(fallback)
        }
      }
    }

    if (!selectedData.siteId && !buildingId && !floorId && !areaId) {
      setLocationInfo(null)
      return
    }

    resolve()

    return () => {
      cancelled = true
    }
  }, [parsedContentValue, selectedData])

  const contentRows = useMemo<Row[]>(() => {
    if (!selectedData) return []

    const baseRows = [
      { label: 'contentId', value: String(selectedData.contentId ?? '') },
      { label: 'contentName', value: selectedData.contentName ?? '' },
      { label: 'contentTypeId', value: String(selectedData.contentTypeId ?? '') },
      { label: 'contentTypeName', value: selectedData.contentTypeName ?? '' },
    ]

    const locationRows: Row[] = []
    const source = typeof parsedContentValue === 'object' && parsedContentValue && !Array.isArray(parsedContentValue)
      ? (parsedContentValue as Record<string, unknown>)
      : null
    const selectedLike = selectedData as Record<string, unknown>
    const buildingId = pickLocationValue(source?.buildingId, source?.building_id, selectedLike.buildingId, selectedLike.building_id)
    const floorId = pickLocationValue(source?.floorId, source?.floor_id, selectedLike.floorId, selectedLike.floor_id)
    const areaId = pickLocationValue(source?.areaId, source?.area_id, selectedLike.areaId, selectedLike.area_id)

    if (isPoiContent(selectedData) && (buildingId || floorId || areaId)) {
      locationRows.push({ label: '건물', value: locationInfo?.buildingName || buildingId || '' })
      locationRows.push({ label: '층', value: locationInfo?.floorName || floorId || '' })
      locationRows.push({ label: '영역', value: locationInfo?.areaName || areaId || '' })
    }

    return [...baseRows, ...locationRows]
  }, [locationInfo, parsedContentValue, selectedData])

  if (!selectedData) {
    return <InfoBox>{t('canvas.property.noContentInfo')}</InfoBox>
  }

  return (
    <>
      {contentRows.map((row) => (
        <Field key={row.label} label={row.label}>
          <TextInput type="text" value={row.value} disabled readOnly />
        </Field>
      ))}

      <Field label="contentValue">
        {isBranch(parsedContentValue) ? (
          <NestedList>
            {(Array.isArray(parsedContentValue)
              ? parsedContentValue.map((v, i): [string, unknown] => [`[${i}]`, v])
              : Object.entries(parsedContentValue).filter(([key]) => !isPoiContent(selectedData) || !POI_LOCATION_KEYS.has(key))
            ).map(([key, child]) => renderNode(key, child))}
          </NestedList>
        ) : (
          <TextInput type="text" value={String(parsedContentValue)} disabled readOnly />
        )}
      </Field>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <FieldCard>
      <FieldLabel>{label}</FieldLabel>
      <FieldBody>{children}</FieldBody>
    </FieldCard>
  )
}
