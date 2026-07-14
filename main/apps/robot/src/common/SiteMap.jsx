import React, { useEffect, useState, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { createSvgUrlFromPng, getSvgSize, parseMultigrid, worldToSvgPixel } from '@/utils/mapUtils'
import { RobotImange } from '@/assets/image'
import { useNavigate } from 'react-router-dom'

const MIN_SCALE = 1
const MAX_SCALE = 4
const ZOOM_INTENSITY = 0.0015
const DRAG_THRESHOLD = 4

const getStateColor = (robotState) => {
  switch (robotState) {
    case 'OPERATION':
      return '#22c55e'
    case 'WAIT':
      return '#f59e0b'
    case 'CHARGE':
      return '#3b82f6'
    case 'ERROR':
      return '#ef4444'
    case 'OFFLINE':
      return '#6b7280'
    default:
      return '#8b5cf6'
  }
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// ---------------- styled ----------------
const Viewport = styled.div`
  position: relative;
  overflow: hidden;
  width: 100%;
  height: ${({ $height }) => $height || '500px'};
  background: #ffffff;
  cursor: grab;
  user-select: none;
  touch-action: pan-y;

  &:active {
    cursor: grabbing;
  }
`

const Canvas = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  will-change: transform;
`

const MapImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  -webkit-user-drag: none;
`

const ROBOT_SIZE = 36

const RobotMarker = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -100%);
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  &:hover span {
    display: block;
  }
`

const RobotAvatar = styled.div`
  width: ${ROBOT_SIZE}px;
  height: ${ROBOT_SIZE}px;
  border-radius: 50%;
  border: 2px solid ${({ $color }) => $color};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  background: #fff;
`

const RobotImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`

const RobotLabel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 10px;
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`

// heading pointer: a 0×0 anchor at the avatar center that rotates to the
// screen-space heading; its child triangle sits on the circle's edge.
const HeadingWrap = styled.div`
  position: absolute;
  left: 50%;
  top: ${ROBOT_SIZE / 2}px;
  width: 0;
  height: 0;
  pointer-events: none;
`

const HeadingArrow = styled.div`
  position: absolute;
  left: ${ROBOT_SIZE / 2 + 3}px;
  top: 0;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 9px solid ${({ $color }) => $color};
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
`

const PoiMarker = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;

  &:hover span {
    display: block;
  }
`

const PoiDot = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ $isCharging }) => ($isCharging ? '#16a34a' : '#f59e0b')};
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
`

const PoiLabel = styled.div`
  position: absolute;
  left: 50%;
  top: calc(100% + 4px);
  transform: translateX(-50%);
  font-size: 13px;
  color: #ffffff;
  white-space: nowrap;
  font-weight: 500;
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0.75);
  padding: 2px 6px;
  border-radius: 4px;
`

// ---------------- component ----------------
const SiteMap = ({ mapData, robotDatas = [], mapServer, clickRobot = false, height = '500px' }) => {
  const [mapSvgUrl, setMapSvgUrl] = useState('')
  const [imageNaturalSize, setImageNaturalSize] = useState({
    width: 0,
    height: 0
  })
  const [multigrid, setMultigrid] = useState(null)
  const svgUrlRef = useRef(null)
  const viewportRef = useRef(null)
  const navigate = useNavigate()

  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 500
  })

  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)

  const dragStateRef = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0
  })

  // live mirrors for touch (pinch) handlers — read latest synchronously
  const panRef = useRef(pan)
  const scaleRef = useRef(scale)
  const baseSizeRef = useRef({ width: 0, height: 0 })
  const vpSizeRef = useRef(viewportSize)
  const pinchRef = useRef({ active: false, lastDist: 0, lastMid: { x: 0, y: 0 } })

  useEffect(() => {
    panRef.current = pan
  }, [pan])
  useEffect(() => {
    scaleRef.current = scale
  }, [scale])
  useEffect(() => {
    vpSizeRef.current = viewportSize
  }, [viewportSize])

  useEffect(() => {
    const load = async () => {
      try {
        if (mapData?.type == 'svg') {
          // 1. PRESIGNED_URL_SVG 에서 SVG 텍스트 다운로드
          const svgResponse = await fetch(mapData?.url)
          if (!svgResponse.ok) throw new Error(`SVG 다운로드 실패: ${svgResponse.status}`)

          // 2. 텍스트로 읽어 MULTIGRID transform 파싱 (좌표 변환에 사용)
          const svgTextContent = await svgResponse.text()
          setMultigrid(parseMultigrid(svgTextContent))

          // 3. 텍스트 → Blob → 임시 Object URL 생성
          const svgBlob = new Blob([svgTextContent], { type: 'image/svg+xml' })
          const svgLocalUrl = URL.createObjectURL(svgBlob)

          // 4. getSvgSize 에 localUrl 전달
          const { width, height } = await getSvgSize(svgLocalUrl)

          // 5. svgLocalUrl 을 mapSvgUrl 로 그대로 사용 (img src 에 쓰이므로 해제하지 않음)
          //    이전 URL이 있으면 해제
          if (svgUrlRef.current) {
            URL.revokeObjectURL(svgUrlRef.current)
          }

          svgUrlRef.current = svgLocalUrl
          setMapSvgUrl(svgLocalUrl)
          setImageNaturalSize({ width, height })
          return
        }

        // fallback (PNG) — 도면 변환이 없으므로 MULTIGRID 없음
        setMultigrid(null)
        // 1. PRESIGNED_URL_PNG 에서 PNG 바이너리 다운로드
        const response = await fetch(mapData?.url)
        if (!response.ok) throw new Error(`이미지 다운로드 실패: ${response.status}`)

        // 2. Blob → 임시 Object URL 생성
        const blob = await response.blob()
        const localUrl = URL.createObjectURL(blob)

        // 3. 기존 createSvgUrlFromPng 에 localUrl 전달
        const { url, width, height } = await createSvgUrlFromPng(localUrl)

        // 4. 중간 단계 임시 URL은 바로 해제
        URL.revokeObjectURL(localUrl)

        if (svgUrlRef.current) {
          URL.revokeObjectURL(svgUrlRef.current)
        }

        svgUrlRef.current = url
        setMapSvgUrl(url)
        setImageNaturalSize({ width, height })
      } catch (error) {
        console.error('맵 로드 실패:', error)
      }
    }

    load()

    return () => {
      if (svgUrlRef.current) {
        URL.revokeObjectURL(svgUrlRef.current)
      }
    }
  }, [mapData])

  // viewport resize
  useEffect(() => {
    const update = () => {
      if (!viewportRef.current) return

      const rect = viewportRef.current.getBoundingClientRect()
      setViewportSize({
        width: rect.width,
        height: rect.height
      })
    }

    update()

    const observer = new ResizeObserver(() => {
      update()
    })

    if (viewportRef.current) {
      observer.observe(viewportRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  // 화면을 꽉 채우는 기본 크기 (cover)
  const baseCanvasSize = useMemo(() => {
    const { width: vw, height: vh } = viewportSize
    const { width: iw, height: ih } = imageNaturalSize

    if (!vw || !vh || !iw || !ih) {
      return { width: 0, height: 0 }
    }

    const fitScale = Math.min(vw / iw, vh / ih)

    return {
      width: iw * fitScale,
      height: ih * fitScale
    }
  }, [viewportSize, imageNaturalSize])

  // 실제 렌더링 크기 = 기본 크기 * zoom scale
  const canvasSize = useMemo(() => {
    return {
      width: baseCanvasSize.width * scale,
      height: baseCanvasSize.height * scale
    }
  }, [baseCanvasSize, scale])

  // 원본 이미지 px -> 현재 화면 px 변환용 스케일
  const renderScale = useMemo(() => {
    if (!imageNaturalSize.width || !imageNaturalSize.height) {
      return { x: 1, y: 1 }
    }

    return {
      x: canvasSize.width / imageNaturalSize.width,
      y: canvasSize.height / imageNaturalSize.height
    }
  }, [canvasSize, imageNaturalSize])

  const maxPan = useMemo(() => {
    return {
      x: Math.max(0, (canvasSize.width - viewportSize.width) / 2),
      y: Math.max(0, (canvasSize.height - viewportSize.height) / 2)
    }
  }, [canvasSize, viewportSize])

  useEffect(() => {
    setPan((prev) => ({
      x: clamp(prev.x, -maxPan.x, maxPan.x),
      y: clamp(prev.y, -maxPan.y, maxPan.y)
    }))
  }, [maxPan])

  const handleMouseDown = (e) => {
    dragStateRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragStateRef.current.dragging) return

      const dx = e.clientX - dragStateRef.current.startX
      const dy = e.clientY - dragStateRef.current.startY

      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        dragStateRef.current.moved = true
      }

      const nextX = clamp(dragStateRef.current.startPanX + dx, -maxPan.x, maxPan.x)
      const nextY = clamp(dragStateRef.current.startPanY + dy, -maxPan.y, maxPan.y)

      setPan({
        x: nextX,
        y: nextY
      })
    }

    const handleMouseUp = () => {
      dragStateRef.current.dragging = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [maxPan])

  // world → SVG pixel (MULTIGRID transform 적용) → 화면 픽셀
  const toRenderCoords = (x, y, navi, renderScale) => {
    const { x: sx, y: sy } = worldToSvgPixel(x, y, navi, multigrid, imageNaturalSize.height)
    return {
      renderX: sx * renderScale.x,
      renderY: sy * renderScale.y
    }
  }

  // Ctrl + Wheel zoom
  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const handleWheel = (e) => {
      if (!e.ctrlKey) return

      e.preventDefault()

      if (!viewportRef.current) return

      const rect = viewportRef.current.getBoundingClientRect()

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const currentWidth = canvasSize.width
      const currentHeight = canvasSize.height

      if (!currentWidth || !currentHeight) return

      const currentLeft = viewportSize.width / 2 + pan.x - currentWidth / 2
      const currentTop = viewportSize.height / 2 + pan.y - currentHeight / 2

      const relativeX = (mouseX - currentLeft) / currentWidth
      const relativeY = (mouseY - currentTop) / currentHeight

      const zoomFactor = Math.exp(-e.deltaY * ZOOM_INTENSITY)
      const nextScale = clamp(scale * zoomFactor, MIN_SCALE, MAX_SCALE)

      if (nextScale === scale) return

      const nextWidth = baseCanvasSize.width * nextScale
      const nextHeight = baseCanvasSize.height * nextScale

      const nextLeft = mouseX - relativeX * nextWidth
      const nextTop = mouseY - relativeY * nextHeight

      const nextPanX = nextLeft - viewportSize.width / 2 + nextWidth / 2
      const nextPanY = nextTop - viewportSize.height / 2 + nextHeight / 2

      const nextMaxPanX = Math.max(0, (nextWidth - viewportSize.width) / 2)
      const nextMaxPanY = Math.max(0, (nextHeight - viewportSize.height) / 2)

      setScale(nextScale)
      setPan({
        x: clamp(nextPanX, -nextMaxPanX, nextMaxPanX),
        y: clamp(nextPanY, -nextMaxPanY, nextMaxPanY)
      })
    }

    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheel)
    }
  }, [scale, pan, canvasSize, baseCanvasSize, viewportSize])

  // keep base canvas size ref in sync for touch handlers
  useEffect(() => {
    baseSizeRef.current = baseCanvasSize
  }, [baseCanvasSize])

  // Mobile: two-finger pan + pinch zoom
  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const getMid = (touches, rect) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top
    })
    const getDist = (touches) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

    const onStart = (e) => {
      if (e.touches.length !== 2) {
        pinchRef.current.active = false
        return
      }
      e.preventDefault()
      const rect = element.getBoundingClientRect()
      pinchRef.current = {
        active: true,
        lastDist: getDist(e.touches),
        lastMid: getMid(e.touches, rect)
      }
    }

    const onMove = (e) => {
      if (!pinchRef.current.active || e.touches.length < 2) return
      e.preventDefault()

      const rect = element.getBoundingClientRect()
      const mid = getMid(e.touches, rect)
      const dist = getDist(e.touches)
      const { lastDist, lastMid } = pinchRef.current

      const panDeltaX = mid.x - lastMid.x
      const panDeltaY = mid.y - lastMid.y

      const scale = scaleRef.current
      const pan = panRef.current
      const base = baseSizeRef.current
      const vp = vpSizeRef.current

      const curW = base.width * scale
      const curH = base.height * scale
      if (!curW || !curH) return

      const curLeft = vp.width / 2 + pan.x - curW / 2
      const curTop = vp.height / 2 + pan.y - curH / 2
      const relX = (mid.x - curLeft) / curW
      const relY = (mid.y - curTop) / curH

      const nextScale = clamp(scale * (dist / (lastDist || dist)), MIN_SCALE, MAX_SCALE)
      const nextW = base.width * nextScale
      const nextH = base.height * nextScale

      const nextLeft = mid.x - relX * nextW
      const nextTop = mid.y - relY * nextH

      const nextPanX = nextLeft - vp.width / 2 + nextW / 2 + panDeltaX
      const nextPanY = nextTop - vp.height / 2 + nextH / 2 + panDeltaY

      const maxPanX = Math.max(0, (nextW - vp.width) / 2)
      const maxPanY = Math.max(0, (nextH - vp.height) / 2)

      const clamped = {
        x: clamp(nextPanX, -maxPanX, maxPanX),
        y: clamp(nextPanY, -maxPanY, maxPanY)
      }

      pinchRef.current.lastMid = mid
      pinchRef.current.lastDist = dist
      scaleRef.current = nextScale
      panRef.current = clamped
      setScale(nextScale)
      setPan(clamped)
    }

    const onEnd = (e) => {
      if (e.touches.length < 2) pinchRef.current.active = false
    }

    element.addEventListener('touchstart', onStart, { passive: false })
    element.addEventListener('touchmove', onMove, { passive: false })
    element.addEventListener('touchend', onEnd)
    element.addEventListener('touchcancel', onEnd)

    return () => {
      element.removeEventListener('touchstart', onStart)
      element.removeEventListener('touchmove', onMove)
      element.removeEventListener('touchend', onEnd)
      element.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  // 원본 좌표(왼쪽 하단 기준) -> 현재 렌더링 좌표(왼쪽 상단 기준)
  const markers = useMemo(() => {
    if (!canvasSize.width || !canvasSize.height) return []

    const navi = mapServer?.navi
    if (!navi?.resolution || !navi?.origin) return []

    return robotDatas
      .filter((robotData) => robotData?.x != null && robotData?.y != null)
      .map((robotData) => {
        const rx = Number(robotData.x)
        const ry = Number(robotData.y)
        const { renderX, renderY } = toRenderCoords(rx, ry, navi, renderScale)
        // screen-space heading: transform a point 1 m ahead (ROS theta) and
        // measure the on-screen angle — correct under MULTIGRID rotation/flip.
        let headingDeg = null
        if (robotData.theta != null && Number.isFinite(Number(robotData.theta))) {
          const t = Number(robotData.theta)
          const f = toRenderCoords(rx + Math.cos(t), ry + Math.sin(t), navi, renderScale)
          headingDeg = (Math.atan2(f.renderY - renderY, f.renderX - renderX) * 180) / Math.PI
        }
        return { ...robotData, renderX, renderY, headingDeg }
      })
  }, [canvasSize, renderScale, robotDatas, mapServer, multigrid, imageNaturalSize])

  const poiMarkers = useMemo(() => {
    if (!canvasSize.width || !canvasSize.height) return []

    const navi = mapServer?.navi
    if (!navi?.resolution || !navi?.origin) return []

    return (mapServer?.poi?.pois ?? []).map((poi) => {
      const { renderX, renderY } = toRenderCoords(poi.x, poi.y, navi, renderScale)
      return { ...poi, renderX, renderY }
    })
  }, [canvasSize, renderScale, mapServer, multigrid, imageNaturalSize])

  return (
    <Viewport ref={viewportRef} onMouseDown={handleMouseDown} $height={height}>
      {mapSvgUrl && canvasSize.width > 0 && canvasSize.height > 0 && (
        <Canvas
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`
          }}
        >
          <MapImage src={mapSvgUrl} alt="map" draggable={false} />

          {markers.map((marker) => (
            <RobotMarker
              key={marker.deviceId}
              $clickable={clickRobot}
              style={{
                left: `${marker.renderX}px`,
                top: `${marker.renderY}px`
              }}
              onClick={() => {
                if (clickRobot) {
                  navigate('/robot/management/detail?deviceId=' + marker.deviceId)
                }
              }}
            >
              {marker.headingDeg != null && (
                <HeadingWrap style={{ transform: `rotate(${marker.headingDeg}deg)` }}>
                  <HeadingArrow $color={getStateColor(marker.robotState)} />
                </HeadingWrap>
              )}
              <RobotAvatar $color={getStateColor(marker.robotState)}>
                <RobotImage src={RobotImange} alt={marker.deviceName} />
              </RobotAvatar>
              <RobotLabel $color={getStateColor(marker.robotState)}>
                {marker.deviceName} / {marker.robotState}
              </RobotLabel>
            </RobotMarker>
          ))}

          {poiMarkers.map((poi) => (
            <PoiMarker
              key={poi.poiId}
              style={{
                left: `${poi.renderX}px`,
                top: `${poi.renderY}px`
              }}
            >
              <PoiDot $isCharging={poi.type === 'CHARGING'} />
              <PoiLabel>
                {(() => {
                  if (!poi.name) return null
                  const key =
                    Object.keys(poi.name).find((k) => k.toLowerCase() === 'ko-kr') ??
                    Object.keys(poi.name).find((k) => k.toLowerCase() === 'en-us')
                  return key ? poi.name[key] : null
                })()}
              </PoiLabel>
            </PoiMarker>
          ))}
        </Canvas>
      )}
    </Viewport>
  )
}

export default SiteMap
