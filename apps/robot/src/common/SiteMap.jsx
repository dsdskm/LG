import React, { useEffect, useState, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { getImageNaturalSize, getSvgSize, parseMultigrid, worldToSvgPixel } from '@/utils/mapUtils'
import { getLocalizedName } from '@/utils/robotUtils'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// ── 상태별 로봇 아이콘 (URL로 import)
import robotOperationSvg from '@/assets/icons/figma/ic_robot_operation.svg?url'
import robotLearningSvg from '@/assets/icons/figma/ic_robot_learning.svg?url'
import robotStandbySvg from '@/assets/icons/figma/ic_robot_standby.svg?url'
import robotChargeSvg from '@/assets/icons/figma/ic_robot_charge.svg?url'
import robotNetworkSvg from '@/assets/icons/figma/ic_robot_network.svg?url'
import robotErrorSvg from '@/assets/icons/figma/ic_robot_error.svg?url'
import poiMarkerSvg from '@/assets/icons/figma/marker.svg?url'

const MIN_SCALE = 1
const MAX_SCALE = 4
const ZOOM_INTENSITY = 0.0015
const DRAG_THRESHOLD = 4

const getStateColor = (robotState) => {
  switch (robotState) {
    case 'OPERATION':
      return '#22A56C'
    case 'STANDBY':
    case 'WAIT':
      return '#777772'
    case 'CHARGE':
      return '#965BE3'
    case 'LEARNING':
      return '#3194CB'
    case 'ERROR':
      return '#A34F4E'
    case 'OFFLINE':
      return '#AD7744'
    default:
      return '#777772'
  }
}

// 상태별 로봇 아이콘 이미지
const getRobotIcon = (robotState) => {
  switch (robotState) {
    case 'OPERATION':
      return robotOperationSvg
    case 'LEARNING':
      return robotLearningSvg
    case 'STANDBY':
    case 'WAIT':
      return robotStandbySvg
    case 'CHARGE':
      return robotChargeSvg
    case 'OFFLINE':
      return robotNetworkSvg
    case 'ERROR':
      return robotErrorSvg
    default:
      return robotStandbySvg // ← RobotImange 대신 회색 구체(sphere)로 변경
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
  /* Viewport/Wrapper 둘 다 stacking context를 만들지 않아, 값이 크면 SiteMap을 감싸는
     상위 컴포넌트(예: SiteMap3D의 툴바·가이드, z-index: 2~3)를 그냥 뚫고 올라가버림.
     Viewport 내부에는 이 Canvas 외 경쟁하는 형제 요소가 없어 낮은 값이면 충분함. */
  z-index: 1;
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

// marker.svg 는 라벨 하단에 붙는 작은 커넥터(꼬리표) 모양 — Figma 원본 크기 11×4.085px 그대로.
// height: auto 로 렌더링해야 object-fit 레터박싱 없이 이미지 하단 = 뾰족점이 정확히 일치.
const POI_ICON_WIDTH = 11

const PoiIcon = styled.img`
  width: ${POI_ICON_WIDTH}px;
  height: auto;
  display: block;
  pointer-events: none;
  -webkit-user-drag: none;
  position: relative;
  z-index: 0;
`

const RobotAvatar = styled.div`
  width: ${ROBOT_SIZE}px;
  height: ${ROBOT_SIZE}px;
  overflow: hidden;
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
  padding: 4px 8px;
  border-radius: 6px;
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  border: 1.5px solid rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
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
  left: ${ROBOT_SIZE / 2 - 5}px;
  top: 0;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 9px solid ${({ $color }) => $color};
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.9)) drop-shadow(0 2px 5px rgba(0, 0, 0, 0.4));
`

/* 마커 앵커 = 컨테이너 바닥 중앙 → 화살표 끝이 POI x,y 좌표에 정확히 닿음.
   Figma: 그림자(drop-shadow)는 라벨+마커 전체를 감싸는 이 컨테이너 1개에만 적용. */
const PoiMarker = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -100%);
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  filter: drop-shadow(0px 2px 4px rgba(17, 17, 17, 0.2));
  overflow: visible;
`

// const PoiDot = styled.div`
//   width: 20px;
//   height: 20px;
//   border-radius: 50%;
//   background: ${({ $isCharging }) => ($isCharging ? '#16a34a' : '#f59e0b')};
//   border: 2px solid #fff;
//   box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
// `

// 라벨-마커 연결부는 poiMarkerSvg(PoiIcon)가 담당하므로 별도 화살표 불필요.
// Figma: 배경 rgba(255,255,255,0.8) + 레이어 opacity 80% 이 별도로 곱해짐
// (배경 실효 알파 0.64, 텍스트 알파 0.8) — 두 값을 그대로 반영.
const PoiLabel = styled.div`
  font-size: 12px;
  color: #484848;
  white-space: nowrap;
  font-weight: 600;
  font-family:
    'LG_Smart_UI',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0px 2px 4px rgba(17, 17, 17, 0.2);
  position: relative;
  z-index: 1;
`

const PoiTooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family:
    'LG_Smart_UI',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  z-index: 10000;
  pointer-events: none;
  margin-bottom: 8px;
  display: ${({ $show }) => ($show ? 'block' : 'none')};
  white-space: nowrap;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
  }
`

const PoiTooltipContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const PoiTooltipRow = styled.div`
  display: flex;
  gap: 8px;
  font-size: 11px;
  white-space: nowrap;

  & > span:first-child {
    color: #b0b0b0;
    min-width: 50px;
  }

  & > span:last-child {
    color: #ffffff;
  }
`

// ---------------- component ----------------
const SiteMap = ({
  mapData,
  robotDatas = [],
  mapServer,
  clickRobot = false,
  clickPoi = false, // ← POI 클릭(장소 이동) 활성화
  onPoiClick = null, // ← POI 클릭 시 상위로 poi 전달 (확인 모달은 상위에서 처리)
  height = '500px'
}) => {
  const [mapSvgUrl, setMapSvgUrl] = useState('')
  const [imageNaturalSize, setImageNaturalSize] = useState({
    width: 0,
    height: 0
  })
  const [multigrid, setMultigrid] = useState(null)
  // full NAVI raster size — the MULTIGRID matrix's translation term assumes this pixel space
  const [naviImageSize, setNaviImageSize] = useState({ width: 0, height: 0 })
  const svgUrlRef = useRef(null)
  const viewportRef = useRef(null)
  const navigate = useNavigate()
  const { i18n } = useTranslation()

  const [hoveredPoiId, setHoveredPoiId] = useState(null)
  const [poiRect, setPoiRect] = useState(null)
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

          // MULTIGRID matrix의 translation은 전체 NAVI 원본 래스터 픽셀 좌표계를 기준으로 하므로,
          // (SVG 자체는 crop된 영역만 포함) 좌표 변환에는 원본 PNG의 실제 크기가 필요함
          if (mapServer?.navi?.pngDownloadUrl) {
            const naviSize = await getImageNaturalSize(mapServer.navi.pngDownloadUrl)
            setNaviImageSize(naviSize)
          }

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
        // presigned PNG URL을 <img src>에 직접 사용 — SVG로 감싸서 <img>에 넣으면 브라우저가
        // "이미지 컨텍스트"로 취급해 SVG 내부에서 참조하는 외부 리소스(<image href>)를 보안상
        // 로드하지 않으므로 PNG가 표시되지 않음. fetch로 미리 받으면 CORS에 막혀 다운로드 자체가 실패함.
        const { width, height } = await getImageNaturalSize(mapData?.url)

        if (svgUrlRef.current) {
          URL.revokeObjectURL(svgUrlRef.current)
        }

        svgUrlRef.current = null
        setMapSvgUrl(mapData.url)
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
  }, [mapData, mapServer?.navi?.pngDownloadUrl])

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
    // multigrid가 있으면 원본 NAVI 래스터 높이로 Y-flip 후 matrix 적용, 없으면 표시 중인 이미지 높이 사용
    const flipHeight = multigrid ? naviImageSize.height : imageNaturalSize.height
    const { x: sx, y: sy } = worldToSvgPixel(x, y, navi, multigrid, flipHeight)
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
  }, [canvasSize, renderScale, robotDatas, mapServer, multigrid, imageNaturalSize, naviImageSize])

  const poiMarkers = useMemo(() => {
    if (!canvasSize.width || !canvasSize.height) return []

    const navi = mapServer?.navi
    if (!navi?.resolution || !navi?.origin) return []

    const pois = (mapServer?.poi?.pois ?? []).map((poi) => {
      const { renderX, renderY } = toRenderCoords(poi.x, poi.y, navi, renderScale)
      return { ...poi, renderX, renderY }
    })

    return pois
  }, [canvasSize, renderScale, mapServer, multigrid, imageNaturalSize, naviImageSize])

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
                <RobotImage src={getRobotIcon(marker.robotState)} alt={marker.deviceName} />
              </RobotAvatar>
              <RobotLabel $color={getStateColor(marker.robotState)}>
                {marker.deviceName} / {marker.robotState}
              </RobotLabel>
            </RobotMarker>
          ))}

          {poiMarkers.map((poi) => {
            // CHARGING POI는 클릭 대상에서 제외 (3D SiteMap3D 와 동일한 규칙)
            const clickable = clickPoi && poi.type !== 'CHARGING'
            const isHovered = hoveredPoiId === poi.poiId
            return (
              <PoiMarker
                key={poi.poiId}
                $clickable={clickable}
                style={{
                  left: `${poi.renderX}px`,
                  top: `${poi.renderY}px`
                }}
                onMouseEnter={(e) => {
                  setHoveredPoiId(poi.poiId)
                  const rect = e.currentTarget.getBoundingClientRect()
                  setPoiRect({
                    left: rect.left + rect.width / 2, // POI 마커 중앙
                    top: rect.top, // POI 마커 상단
                    height: rect.height // POI 마커 높이
                  })
                }}
                onMouseLeave={() => {
                  setHoveredPoiId(null)
                  setPoiRect(null)
                }}
                onClick={() => {
                  if (clickable) onPoiClick?.(poi)
                }}
              >
                <PoiLabel>{getLocalizedName(poi.name, i18n.language)}</PoiLabel>
                <PoiIcon src={poiMarkerSvg} alt={getLocalizedName(poi.name, i18n.language)} draggable={false} />
              </PoiMarker>
            )
          })}
        </Canvas>
      )}

      {/* POI Tooltip Layer - Right side of POI marker */}
      {hoveredPoiId &&
        poiRect &&
        poiMarkers.map((poi) => {
          if (poi.poiId !== hoveredPoiId) return null

          return (
            <div
              key={`tooltip-${poi.poiId}`}
              style={{
                position: 'fixed',
                left: `${poiRect.left + 10}px`,
                top: `${poiRect.top + 5}px`,
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#ffffff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: "'LG_Smart_UI', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                zIndex: 10000,
                pointerEvents: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#b0b0b0', minWidth: '80px' }}>Name:</span>
                  <span>{getLocalizedName(poi.name, i18n.language)}</span>
                </div>
                {poi.x != null && poi.y != null && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#b0b0b0', minWidth: '80px' }}>Position:</span>
                    <span>
                      X: {poi.x.toFixed(2)}, Y: {poi.y.toFixed(2)}
                    </span>
                  </div>
                )}
                {poi.yawDeg != null && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#b0b0b0', minWidth: '80px' }}>Yaw:</span>
                    <span>{poi.yawDeg.toFixed(1)}°</span>
                  </div>
                )}
                {poi.tolerance != null && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#b0b0b0', minWidth: '80px' }}>Tolerance:</span>
                    <span>{poi.tolerance.toFixed(2)}m</span>
                  </div>
                )}
                {poi.properties?.description && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#b0b0b0', minWidth: '80px' }}>Description:</span>
                    <span>{poi.properties.description}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
    </Viewport>
  )
}

export default SiteMap
