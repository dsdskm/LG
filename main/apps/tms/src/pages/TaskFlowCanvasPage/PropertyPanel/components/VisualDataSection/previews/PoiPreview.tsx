import { useEffect, useMemo, useRef, useState } from 'react'
import type { SyntheticEvent, WheelEvent, PointerEvent } from 'react'

import styled from 'styled-components'
import { MediaFallbackText, MediaStage, PreviewCard, PreviewHeaderTitle } from './styles.preview'
import { PreviewProps } from './types.preview'
import { type MapData, type MapPoi, useGetMap } from '@/api/mapApi'
import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'

const Viewport = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
  user-select: none;
`

const ZoomContent = styled.div`
  position: relative;
  display: inline-flex;
  transform-origin: center center;
  will-change: transform;
`

const ZoomControls = styled.div`
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 6px;
  z-index: 10;
`

const ZoomButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #ffffff;
  color: #111827;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  &:hover {
    background: #f3f4f6;
  }
`

const MapImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
`

const PoiLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`

const PoiDot = styled.div<{ $active?: boolean }>`
  position: absolute;
  width: ${({ $active }) => ($active ? '16px' : '12px')};
  height: ${({ $active }) => ($active ? '16px' : '12px')};
  border-radius: 50%;
  background: ${({ $active }) => ($active ? '#f59e0b' : '#ef4444')};
  border: 2px solid #ffffff;
  transform: translate(-50%, -50%);
  box-shadow: ${({ $active }) => ($active ? '0 0 0 3px rgba(245, 158, 11, 0.35)' : '0 0 0 1px rgba(0, 0, 0, 0.25)')};
  z-index: ${({ $active }) => ($active ? 4 : 2)};
`

const ContentPoiDot = styled.div`
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #2563eb;
  border: 2px solid #ffffff;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.35);
  z-index: 5;
`

type ImageSize = {
  naturalW: number
  naturalH: number
  renderW: number
  renderH: number
}

type ContentValue = {
  mapId?: string
  poi?: {
    poi_id?: string
    name?: {
      default?: string
      'ko-KR'?: string
      'en-US'?: string
      [key: string]: unknown
    }
    type?: string
    pose?: {
      position?: {
        x?: number
        y?: number
        z?: number
      }
      orientation?: {
        x?: number
        y?: number
        z?: number
        w?: number
      }
    }
    yaw_deg?: number
    tolerance?: number
    properties?: Record<string, unknown>
  }
}

type PercentPosition = {
  left: number
  top: number
}
const MIN_SCALE = 1
const MAX_SCALE = 5
const SCALE_STEP = 0.2

function isValidContentValue(value: unknown): value is ContentValue {
  if (typeof value !== 'object' || value === null) return false
  if (Array.isArray(value)) return false

  const obj = value as Record<string, unknown>

  if ('mapId' in obj && typeof obj.mapId !== 'string') return false

  if ('poi' in obj) {
    const poi = obj.poi

    if (typeof poi !== 'object' || poi === null || Array.isArray(poi)) {
      return false
    }

    const poiObj = poi as Record<string, unknown>

    if ('poi_id' in poiObj && typeof poiObj.poi_id !== 'string') {
      return false
    }
  }

  return true
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function getPoiLabel(poi: MapPoi): string {
  return poi.name?.['ko-KR'] ?? poi.name?.default ?? poi.name?.['en-US'] ?? poi.poiId
}

export default function PoiPreview({ node, nodeId }: PreviewProps) {
  const { mutateAsync: getMap } = useGetMap()

  const [mapData, setMapData] = useState<MapData | null>(null)
  const [mapPois, setMapPois] = useState<MapPoi[]>([])
  const [imgSize, setImgSize] = useState<ImageSize | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const [dragging, setDragging] = useState(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const updatePlayStatus = useContentTaskStore((state) => state.updatePlayStatus)

  const data = node?.data

  //fixme: temporary logic
  useEffect(() => {
    updatePlayStatus(nodeId, 'PLAYING')
    const timer = setTimeout(() => {
      updatePlayStatus(nodeId, 'COMPLETED')
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const contentValue = useMemo<ContentValue | null>(() => {
    const raw = data?.contentValue

    if (raw === null || raw === undefined) return null

    if (typeof raw === 'object') {
      return isValidContentValue(raw) ? raw : null
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim()

      if (!trimmed) return null

      if (!trimmed.startsWith('{')) {
        console.warn('contentValue is not JSON-like string:', trimmed)
        return null
      }

      try {
        const parsed: unknown = JSON.parse(trimmed)
        return isValidContentValue(parsed) ? parsed : null
      } catch (error) {
        console.error('contentValue parse failed', error, raw)
        return null
      }
    }

    console.warn('contentValue unexpected type:', typeof raw)
    return null
  }, [data?.contentValue])

  const mapId = contentValue?.mapId
  const targetPoiId = contentValue?.poi?.poi_id

  const mapImageUrl = useMemo(() => {
    return mapData?.svgDownloadUrl ?? mapData?.pngDownloadUrl ?? null
  }, [mapData])

  const contentPoiPosition = useMemo(() => {
    const position = contentValue?.poi?.pose?.position

    const x = parseNumber(position?.x)
    const y = parseNumber(position?.y)
    const z = parseNumber(position?.z)

    if (x === null || y === null) return null

    return {
      x,
      y,
      z: z ?? 0
    }
  }, [contentValue])

  const contentPoiLabel = useMemo(() => {
    const name = contentValue?.poi?.name

    return name?.['ko-KR'] ?? name?.default ?? name?.['en-US'] ?? data?.label ?? 'contentValue POI'
  }, [contentValue, data?.label])

  useEffect(() => {
    const resetMapState = () => {
      setMapData(null)
      setMapPois([])
      setImgSize(null)
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }

    const loadMap = async () => {
      if (!mapId) {
        resetMapState()
        return
      }

      try {
        const result = await getMap({ mapId })

        setMapData(result.mapData)
        setMapPois(result.poiData.pois)
        setImgSize(null)
        setScale(1)
        setOffset({ x: 0, y: 0 })
      } catch (error) {
        console.error('getMap failed', error)
        resetMapState()
      }
    }

    loadMap()
  }, [mapId, getMap])

  const resolution = mapData?.resolution
  const origin = mapData?.origin
  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget

    setImgSize({
      naturalW: image.naturalWidth,
      naturalH: image.naturalHeight,
      renderW: image.clientWidth,
      renderH: image.clientHeight
    })
  }

  const clampScale = (value: number) => {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation()

    const delta = event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP

    setScale((prev) => {
      const next = clampScale(prev + delta)

      if (next <= MIN_SCALE) {
        setOffset({ x: 0, y: 0 })
      }

      return next
    })
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (scale <= MIN_SCALE) return

    event.preventDefault()
    event.stopPropagation()

    event.currentTarget.setPointerCapture(event.pointerId)

    setDragging(true)
    lastPosRef.current = {
      x: event.clientX,
      y: event.clientY
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return

    event.preventDefault()
    event.stopPropagation()

    const dx = event.clientX - lastPosRef.current.x
    const dy = event.clientY - lastPosRef.current.y

    lastPosRef.current = {
      x: event.clientX,
      y: event.clientY
    }

    setOffset((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy
    }))
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    setDragging(false)
  }

  const handlePointerCancel = () => {
    setDragging(false)
  }

  const toPercentByXY = (x: number, y: number): PercentPosition | null => {
    if (!imgSize) return null
    if (!resolution || resolution <= 0) return null
    if (!origin || origin.length < 2) return null

    const originX = origin[0]
    const originY = origin[1]

    const pixelX = (x - originX) / resolution
    const pixelYFromBottom = (y - originY) / resolution
    const pixelY = imgSize.naturalH - pixelYFromBottom

    const left = (pixelX / imgSize.naturalW) * 100
    const top = (pixelY / imgSize.naturalH) * 100

    return {
      left,
      top
    }
  }

  const contentPoiPercent = useMemo(() => {
    if (!contentPoiPosition) return null

    return toPercentByXY(contentPoiPosition.x, contentPoiPosition.y)
  }, [contentPoiPosition, imgSize, resolution, origin])

  if (!data) {
    return null
  }
  return (
    <PreviewCard>
      <PreviewHeaderTitle title={data.label}>{data.label}</PreviewHeaderTitle>

      <MediaStage>
        {mapImageUrl ? (
          <Viewport
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerCancel}
            style={{
              cursor: scale > MIN_SCALE ? (dragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            <ZoomContent
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
              }}
            >
              <MapImage alt={data.contentName} src={mapImageUrl} onLoad={handleImageLoad} />
              <PoiLayer>
                {mapPois.map((poi) => {
                  const pos = toPercentByXY(poi.x, poi.y)
                  if (!pos) return null
                  const isActive = targetPoiId === poi.poiId
                  const label = getPoiLabel(poi)
                  return (
                    <PoiDot
                      key={`map-poi-${poi.poiId}`}
                      $active={isActive}
                      title={`${label} / ${poi.poiId}`}
                      style={{
                        left: `${pos.left}%`,
                        top: `${pos.top}%`
                      }}
                    />
                  )
                })}
                {contentPoiPercent ? (
                  <ContentPoiDot
                    title={`contentValue: ${contentPoiLabel}`}
                    style={{
                      left: `${contentPoiPercent.left}%`,
                      top: `${contentPoiPercent.top}%`
                    }}
                  />
                ) : null}
              </PoiLayer>
            </ZoomContent>

            <ZoomControls>
              <ZoomButton
                type="button"
                title="축소"
                onClick={() => {
                  setScale((prev) => {
                    const next = clampScale(prev - SCALE_STEP)

                    if (next <= MIN_SCALE) {
                      setOffset({ x: 0, y: 0 })
                    }

                    return next
                  })
                }}
              >
                -
              </ZoomButton>

              <ZoomButton
                type="button"
                title="원본"
                onClick={() => {
                  setScale(1)
                  setOffset({ x: 0, y: 0 })
                }}
              >
                ⟲
              </ZoomButton>

              <ZoomButton
                type="button"
                title="확대"
                onClick={() => {
                  setScale((prev) => clampScale(prev + SCALE_STEP))
                }}
              >
                +
              </ZoomButton>
            </ZoomControls>
          </Viewport>
        ) : (
          <MediaFallbackText>MAP 정보가 없습니다.</MediaFallbackText>
        )}
      </MediaStage>
    </PreviewCard>
  )
}
