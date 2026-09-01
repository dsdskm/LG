import React, { useEffect, useRef, useCallback, useState } from 'react'
import { FOOTPRINT_TOPICS, SPATIAL_TOPICS, subscribedTopicOf } from '@/constants/topics'
import { transformPoint } from '@/utils/tf'

// OccupancyGrid의 장애물 확률(0~100)에 따른 밝기(0~255) 값을 미리 계산한 캐시 배열
const BRIGHTNESS_CACHE = new Uint8Array(101)
for (let i = 0; i <= 100; i++) {
  BRIGHTNESS_CACHE[i] = Math.round(255 * (1 - i / 100))
}

// 뷰 조작 한계 — fit 배율 대비 상대값이라 지도 크기와 무관하게 동작한다
const ZOOM_MIN_RATIO = 0.5 // fit 대비 최소 배율(전체보기보다 조금 더 축소 가능)
const ZOOM_MAX_RATIO = 40 // fit 대비 최대 배율
const ZOOM_STEP = 1.1 // 휠 한 칸당 배율
const KEEP_VISIBLE = 0.3 // 팬 시 지도가 뷰포트와 최소로 겹쳐야 하는 비율
// 클릭으로 인정하는 이동 허용치(px) — 이보다 움직이면 팬(드래그)으로 본다.
const CLICK_SLOP = 4
// footprint 토픽(nav2 costmap)이 없을 때 로봇 마커에 쓰는 반경(m).
// 격자 칸 수가 아니라 미터로 잡아야 지도 해상도가 달라져도 실제 크기로 보인다.
// nav2 의 robot_radius 는 corepath 이미지 안 파라미터라 저장소에서 읽을 수 없어 대략치다 —
// 실제 치수가 확인되면 이 상수만 고치면 된다.
const FALLBACK_ROBOT_RADIUS_M = 0.3
// 마커 반경(px) — POI 는 이 크기로 고정하고, 로봇은 실제 크기가 이보다 작게 보일 때의 최소치로 쓴다.
// POI 는 크기가 있는 물체가 아니라 한 지점이고, 축소했을 때도 눌러 확인할 수 있어야 한다.
const MARKER_RADIUS_PX = 12
// 방향 표시 삼각형 — 마커 반경 대비 길이/밑변 절반. 밑변은 본체(원/폴리곤)에 묻히고 꼭지점만
// 밖으로 나와 부채꼴처럼 보인다(가는 선보다 방향이 한눈에 들어온다).
const MARKER_ARROW_LENGTH_RATIO = 1.9
const MARKER_ARROW_HALF_WIDTH_RATIO = 0.72
// 마커 중심의 흰 점 — 마커가 커지면 본체가 면으로 보여 정확한 좌표가 어디인지 흐려진다.
const MARKER_CORE_RATIO = 0.3
// POI 를 클릭으로 잡는 판정 반경(px) — 마커보다 조금 넉넉하게 잡아 정확히 점을 찍지 않아도 집힌다.
const POI_HIT_RADIUS_PX = MARKER_RADIUS_PX + 4

/**
 * 방향(yaw)을 가리키는 삼각형. 마커 본체보다 먼저 그려서 밑변이 본체에 묻히게 한다.
 * 흰 테두리를 먼저 깔아 어두운 벽/점군 위에서도 윤곽이 살아 있게 한다.
 *
 * @param {number} yaw ROS 기준 방향(rad). 캔버스 y 축은 아래가 +라서 sin 부호를 뒤집어 쓴다.
 * @param {number} radius 마커 본체 반경(px) — 삼각형 크기는 여기에 비례한다.
 */
const drawHeadingWedge = (ctx, px, py, yaw, radius, fill) => {
  const dirX = Math.cos(yaw)
  const dirY = -Math.sin(yaw)
  const tipLen = radius * MARKER_ARROW_LENGTH_RATIO
  const halfWidth = radius * MARKER_ARROW_HALF_WIDTH_RATIO

  ctx.beginPath()
  ctx.moveTo(px + dirX * tipLen, py + dirY * tipLen)
  // 밑변 두 점 — 진행 방향에 수직으로 벌린다.
  ctx.lineTo(px - dirY * halfWidth, py + dirX * halfWidth)
  ctx.lineTo(px + dirY * halfWidth, py - dirX * halfWidth)
  ctx.closePath()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.fillStyle = fill
  ctx.fill()
}

/** 마커 중심을 찍는 흰 점. 본체를 그린 뒤 위에 얹는다. */
const drawMarkerCore = (ctx, px, py, radius) => {
  ctx.beginPath()
  ctx.arc(px, py, radius * MARKER_CORE_RATIO, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.fill()
}

// POI 타입별 색상 — marker: 점/화살표, label: 이름 글자(흰 테두리 위에 얹히므로 더 진하게).
// 키는 목록의 poi.type 값이다(@repo/ui SemanticDetail 의 POI_TYPES = GENERAL/ETC, 그리고 BE 가
// 쓰는 CHARGING). 색 계열은 robot 앱 SiteMap 의 POI 표기(충전 초록 / 그 외 앰버)를 따른다.
const POI_TYPE_COLORS = {
  GENERAL: { marker: 'rgba(245, 158, 11, 0.9)', label: '#8a5200' }, // 앰버
  CHARGING: { marker: 'rgba(22, 163, 74, 0.9)', label: '#0f5132' }, // 초록
  ETC: { marker: 'rgba(142, 68, 173, 0.9)', label: '#5b2c6f' } // 보라
}
// 위 표에 없는 타입(BE 가 새 타입을 추가한 경우) 색을 만들 때 쓰는 해시 승수 —
// 타입 이름이 같으면 언제나 같은 색이 나오게 한다.
const POI_UNKNOWN_TYPE_HUE_SEED = 31
// 삭제 예정 POI 색 — 타입 구분보다 "지워질 POI" 라는 사실이 먼저 보여야 하므로 무채색으로 낮춘다.
const POI_DELETED_COLORS = { marker: 'rgba(127, 140, 141, 0.6)', label: '#7f8c8d' }

/** 문자열 → 0~359 색상각. 알려지지 않은 POI 타입에 안정적인 색을 배정한다. */
const hueOfText = (text) => {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * POI_UNKNOWN_TYPE_HUE_SEED + text.charCodeAt(i)) % 360
  }
  return hash
}

/** POI 타입에 대응하는 마커/라벨 색. 삭제 예정(작업본의 softDelete)은 타입과 무관하게 무채색이다. */
const poiColorsOf = (type, isDeleted) => {
  if (isDeleted) return POI_DELETED_COLORS
  if (POI_TYPE_COLORS[type]) return POI_TYPE_COLORS[type]
  const hue = hueOfText(String(type ?? ''))
  return { marker: `hsla(${hue}, 62%, 42%, 0.9)`, label: `hsl(${hue}, 70%, 26%)` }
}

/**
 * MapCanvas
 *
 * OccupancyGrid(지도) + PointCloud2/LaserScan(라이다) + 로봇 위치를
 * HTML Canvas 2D API로 렌더링하는 컴포넌트.
 * 토픽 이름은 로봇 구성에 따라 다르므로(@/constants/topics) 역할로 판단한다.
 *
 * 로봇 위치는 지도와 같은 프레임이어야 하므로 TF 합성 결과(robotPose, map->base_link)를
 * 쓴다. Odometry 토픽의 pose 는 lio_odom 프레임 기준이라 TF 부재 시 폴백으로만 쓴다.
 *
 * 렌더링 레이어 순서 (아래에서 위로):
 *   1. OccupancyGrid 격자 지도  (회색/흰색/검정)
 *   2. LaserScan 포인트          (빨간 점들)
 *   3. 커스텀 토픽(궤적/랜드마크/TF 등)
 *   4. POI 마커                   (타입별 색 점 + 방향 삼각형 + 이름)
 *   5. 로봇 위치 마커             (파란 외형 + 방향 삼각형)
 *      크기는 footprint 토픽(nav2 costmap)이 있으면 실제 폴리곤, 없으면 상수 반경으로 그린다.
 *      POI 와 겹쳐도 로봇이 보여야 하므로 가장 위에 그린다.
 *
 * @param {Array} [pois] 지도 위에 찍을 POI 목록. 각 항목은 시맨틱 화면의 POI 형태를 그대로 쓴다
 *   — { name: { default }, pose: { position: {x,y}, orientation: {x,y,z,w} }, editStatus }.
 *   좌표는 지도(map) 프레임 기준이라 보정 없이 찍는다.
 *
 * @param {Function} [onMapClick] 지도 클릭 시 호출 — ({x, y, canvasX, canvasY, poi}).
 *   x/y 는 지도 프레임 월드 좌표(m), canvasX/Y 는 래퍼 기준 픽셀(말풍선 배치용).
 *   드래그(팬)와 구분하기 위해 CLICK_SLOP 이내로 움직인 경우만 클릭으로 본다.
 *   클릭 지점이 POI 마커(POI_HIT_RADIUS_PX) 안이면 그 POI 를 poi 로 함께 넘기고, x/y/canvasX/Y 도
 *   마커 좌표로 맞춘다 — 말풍선이 마커에 붙고, 이동 목표가 클릭 오차 없이 POI 그 자리가 된다.
 *   POI 를 잡지 못하면 poi 는 null 이다.
 * @param {Function} [onViewChange] 줌/팬/전체보기로 뷰가 바뀔 때 호출 — canvasX/Y 기준 오버레이를
 *   띄운 쪽이 위치가 어긋난 오버레이를 닫을 수 있게 알려준다.
 */
function MapCanvas({
  mapData,
  scanData,
  odomData,
  robotPose = null,
  subscribedTopics = [],
  customTopicsData = {},
  frameCorrections = {},
  // 지도 위에 찍을 POI 목록(시맨틱 화면의 목록 그대로). 빈 배열이면 아무것도 그리지 않는다.
  pois = [],
  // 라이다 점군 표시. POI 편집처럼 지도 자체가 관심사인 화면은 false 로 끈다
  // (구독은 유지되므로 다른 화면/패널의 표시는 영향받지 않는다).
  showScan = true,
  onMapClick = null,
  onViewChange = null
}) {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const mapCacheCanvasRef = useRef(null)
  const mapCacheValidRef = useRef(false)
  const lastMapDataRef = useRef(null)

  // 뷰 변환 — scale: 격자 1칸당 화면 픽셀 수, tx/ty: 지도 좌상단의 캔버스 좌표
  const viewRef = useRef({ scale: 0, tx: 0, ty: 0 })
  const fitScaleRef = useRef(0)
  // 현재 뷰가 어떤 격자 크기에 맞춰졌는지 — 지도가 바뀌면 다시 fit 한다
  const fitKeyRef = useRef('')
  // 사용자가 휠/드래그로 뷰를 건드렸는지 — 건드린 뒤에는 리사이즈 시 자동 fit 하지 않는다
  const userAdjustedRef = useRef(false)
  // 격자 크기 캐시 — 휠/드래그 핸들러가 render 없이도 클램프할 수 있게 한다
  const gridSizeRef = useRef({ w: 0, h: 0 })
  const dragRef = useRef(null)
  // 최신 render 를 이벤트 핸들러에서 호출하기 위한 ref
  const renderRef = useRef(() => {})

  // 클릭 좌표 역변환에 필요한 지도 기하 정보 — render 가 매번 갱신한다.
  const geoRef = useRef(null)
  // 지금 화면에 찍혀 있는 POI 마커의 캔버스 좌표 — 클릭으로 POI 를 집는 판정에 쓴다.
  // 줌/팬마다 값이 달라지므로 render 가 매번 다시 채운다(상태로 들 필요가 없다).
  const poiHitsRef = useRef([])
  // 콜백은 ref 로 들고 쓴다 — 리스너를 다시 붙이지 않아도 최신 함수가 호출된다.
  const onMapClickRef = useRef(onMapClick)
  const onViewChangeRef = useRef(onViewChange)
  useEffect(() => {
    onMapClickRef.current = onMapClick
    onViewChangeRef.current = onViewChange
  }, [onMapClick, onViewChange])

  /** 캔버스 픽셀 → ROS 월드 좌표(m). worldToCanvas 의 역변환. 지도 정보가 없으면 null. */
  const canvasToWorld = useCallback((canvasX, canvasY) => {
    const geo = geoRef.current
    const { scale, tx, ty } = viewRef.current
    if (!geo || !scale) return null
    const col = (canvasX - tx) / scale
    const row = geo.gridHeight - (canvasY - ty) / scale
    return { x: col * geo.resolution + geo.origin.x, y: row * geo.resolution + geo.origin.y }
  }, [])

  // 래퍼는 구독 상태에 따라 마운트/언마운트되므로, 리스너를 다시 붙이도록 state 로도 보관한다
  const [wrapperEl, setWrapperEl] = useState(null)
  const setWrapperNode = useCallback((node) => {
    wrapperRef.current = node
    setWrapperEl(node)
  }, [])

  /** 지도 전체가 보이도록 배율/위치를 계산해 뷰에 반영 */
  const applyFit = useCallback((canvasW, canvasH, gridW, gridH) => {
    if (!canvasW || !canvasH || !gridW || !gridH) return
    const scale = Math.min(canvasW / gridW, canvasH / gridH) * 0.95
    fitScaleRef.current = scale
    viewRef.current = {
      scale,
      tx: (canvasW - gridW * scale) / 2,
      ty: (canvasH - gridH * scale) / 2
    }
  }, [])

  /** 드래그로 지도를 화면 밖으로 완전히 밀어내지 못하도록 이동량 제한 */
  const clampView = useCallback(() => {
    const canvas = canvasRef.current
    const { w: gridW, h: gridH } = gridSizeRef.current
    if (!canvas || !gridW || !gridH) return
    const view = viewRef.current
    const mapW = gridW * view.scale
    const mapH = gridH * view.scale
    const keepX = Math.min(mapW, canvas.width) * KEEP_VISIBLE
    const keepY = Math.min(mapH, canvas.height) * KEEP_VISIBLE
    view.tx = Math.min(Math.max(view.tx, keepX - mapW), canvas.width - keepX)
    view.ty = Math.min(Math.max(view.ty, keepY - mapH), canvas.height - keepY)
  }, [])

  // mapData가 업데이트되면 백그라운드 캐시 캔버스에 지도를 미리 그림 (Double Buffering)
  useEffect(() => {
    if (!mapData) {
      mapCacheValidRef.current = false
      lastMapDataRef.current = null
      return
    }

    // mapData 레퍼런스가 동일한 경우 다시 그리지 않음
    if (lastMapDataRef.current === mapData) {
      return
    }

    lastMapDataRef.current = mapData

    const { width, height } = mapData.info
    const { data } = mapData

    if (!mapCacheCanvasRef.current) {
      mapCacheCanvasRef.current = document.createElement('canvas')
    }

    const cacheCanvas = mapCacheCanvasRef.current
    cacheCanvas.width = width
    cacheCanvas.height = height
    const cacheCtx = cacheCanvas.getContext('2d')

    // ImageData를 사용해 1차원 픽셀 버퍼에 고속 기록
    const imgData = cacheCtx.createImageData(width, height)
    const buf = imgData.data

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const rosRow = row
        // Canvas 좌표계는 y축이 반대이므로 반전 매핑
        const canvasRow = height - 1 - row

        const cellIndex = rosRow * width + col
        const cellValue = data[cellIndex]
        const bufIndex = (canvasRow * width + col) * 4

        if (cellValue === -1) {
          // 미탐색 영역: #cccccc
          buf[bufIndex] = 204
          buf[bufIndex + 1] = 204
          buf[bufIndex + 2] = 204
          buf[bufIndex + 3] = 255
        } else if (cellValue === 0) {
          // 빈 영역: #ffffff
          buf[bufIndex] = 255
          buf[bufIndex + 1] = 255
          buf[bufIndex + 2] = 255
          buf[bufIndex + 3] = 255
        } else {
          // 장애물: 명도 대비 그라데이션 (미리 계산된 캐시 배열 활용)
          const brightness = BRIGHTNESS_CACHE[cellValue] ?? 0
          buf[bufIndex] = brightness
          buf[bufIndex + 1] = brightness
          buf[bufIndex + 2] = brightness
          buf[bufIndex + 3] = 255
        }
      }
    }

    cacheCtx.putImageData(imgData, 0, 0)
    mapCacheValidRef.current = true
  }, [mapData])

  /**
   * 토픽 payload 의 프레임에 맞는 보정량을 찾는다.
   *
   * lio_node 는 매핑 중 궤적/경로를 lio_odom 기준으로 발행한다(측위 모드에서는 map 기준).
   * 루프 클로저로 map->lio_odom 보정이 0이 아니게 되면 그 좌표를 지도에 그대로 찍을 수 없다.
   * frame_id 가 없거나 이미 map 이면 null 을 돌려줘서 transformPoint 가 좌표를 그대로 쓴다.
   */
  const correctionFor = (topicData) => frameCorrections[topicData?.header?.frame_id] ?? null

  const getPointsList = (topicData) => {
    if (!topicData) return []
    if (Array.isArray(topicData.poses)) {
      return topicData.poses.map((p) => p.pose?.position ?? p.position ?? p)
    }
    if (Array.isArray(topicData.points) || topicData.points instanceof Float32Array) {
      return topicData.points
    }
    if (Array.isArray(topicData)) {
      return topicData.map((p) => p.position ?? p)
    }
    return []
  }

  /**
   * 전체 캔버스 렌더링 함수
   * 데이터가 변경될 때마다 호출됨
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const hasMap = !!mapData
    const width = hasMap ? mapData.info.width : 500
    const height = hasMap ? mapData.info.height : 500
    const resolution = hasMap ? mapData.info.resolution : 0.05 // 기본 5cm

    // 캔버스는 컨테이너(뷰포트)를 가득 채우고, 지도는 뷰 변환(scale/tx/ty)으로 배치한다
    const wrapper = wrapperRef.current
    const targetWidth = Math.max(1, Math.floor(wrapper?.clientWidth || canvas.clientWidth || 600))
    const targetHeight = Math.max(1, Math.floor(wrapper?.clientHeight || canvas.clientHeight || 400))

    // 크기가 실제로 변경되었을 때만 가로/세로 속성을 할당하여 Canvas 초기화 오버헤드 방지
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
    } else {
      // 크기가 변경되지 않았다면 이전 그림을 지워줌
      ctx.clearRect(0, 0, targetWidth, targetHeight)
    }

    // 지도(또는 기본 격자)가 바뀌면 화면 가운데에 전체가 보이도록 다시 맞춘다
    gridSizeRef.current = { w: width, h: height }
    const fitKey = `${width}x${height}`
    if (fitKeyRef.current !== fitKey || viewRef.current.scale <= 0) {
      fitKeyRef.current = fitKey
      userAdjustedRef.current = false
      applyFit(targetWidth, targetHeight, width, height)
    }

    const { scale: CELL_SIZE, tx, ty } = viewRef.current

    // ROS 월드 좌표(미터) → 캔버스 픽셀 좌표 변환
    // 지도 원점 또는 임의의 중앙 원점 (-12.5m, -12.5m) 사용해 (0,0)을 중앙에 오게 함
    const origin = hasMap ? (mapData.info.origin?.position ?? { x: 0, y: 0 }) : { x: -12.5, y: -12.5 }

    // 클릭 역변환(canvasToWorld)이 같은 기준을 쓰도록 현재 지도 기하를 남긴다.
    geoRef.current = { origin, resolution, gridHeight: height }

    const worldToCanvas = (wx, wy) => {
      const col = (wx - origin.x) / resolution
      const row = (wy - origin.y) / resolution
      const px = col * CELL_SIZE + tx
      const py = (height - row) * CELL_SIZE + ty
      return { px, py }
    }

    // ── Layer 1: OccupancyGrid 또는 격자 배경 렌더링 ─────────────────────
    if (hasMap) {
      if (mapCacheValidRef.current && mapCacheCanvasRef.current) {
        // Nearest-neighbor 필터링으로 픽셀을 또렷하게 렌더링
        ctx.imageSmoothingEnabled = false
        ctx.mozImageSmoothingEnabled = false
        ctx.webkitImageSmoothingEnabled = false
        ctx.msImageSmoothingEnabled = false

        ctx.drawImage(mapCacheCanvasRef.current, 0, 0, width, height, tx, ty, width * CELL_SIZE, height * CELL_SIZE)
      } else {
        // 캐시 준비중인 경우의 대체 렌더링
        ctx.fillStyle = '#cccccc'
        ctx.fillRect(tx, ty, width * CELL_SIZE, height * CELL_SIZE)
      }
    } else {
      // 맵이 없는 경우 격자 판 그리기
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 1

      const step = 1.0 // 1미터 간격
      const minX = origin.x
      const maxX = origin.x + width * resolution
      const minY = origin.y
      const maxY = origin.y + height * resolution

      for (let wx = Math.ceil(minX); wx <= maxX; wx += step) {
        const { px } = worldToCanvas(wx, 0)
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, canvas.height)
        ctx.stroke()
      }
      for (let wy = Math.ceil(minY); wy <= maxY; wy += step) {
        const { py } = worldToCanvas(0, wy)
        ctx.beginPath()
        ctx.moveTo(0, py)
        ctx.lineTo(canvas.width, py)
        ctx.stroke()
      }
    }

    // ── Layer 2: LaserScan 또는 PointCloud2 렌더링 ────────────────────────────────────────
    if (showScan && subscribedTopicOf(subscribedTopics, 'scan') && scanData && odomData) {
      const pos = odomData.pose?.pose?.position ?? { x: 0, y: 0 }
      const quat = odomData.pose?.pose?.orientation ?? { x: 0, y: 0, z: 0, w: 1 }
      const yaw = Math.atan2(2 * (quat.w * quat.z + quat.x * quat.y), 1 - 2 * (quat.y * quat.y + quat.z * quat.z))

      ctx.fillStyle = 'rgba(231, 76, 60, 0.7)'
      ctx.beginPath()

      const r = Math.max(1.5, CELL_SIZE / 3)

      if (scanData.points instanceof Float32Array) {
        // PointCloud2 형식인 경우 (Float32Array 플랫 버퍼)
        const cosYaw = Math.cos(yaw)
        const sinYaw = Math.sin(yaw)
        const len = scanData.points.length
        for (let i = 0; i < len; i += 2) {
          const x = scanData.points[i]
          const y = scanData.points[i + 1]
          const wx = pos.x + (x * cosYaw - y * sinYaw)
          const wy = pos.y + (x * sinYaw + y * cosYaw)
          const { px, py } = worldToCanvas(wx, wy)

          ctx.moveTo(px + r, py)
          ctx.arc(px, py, r, 0, Math.PI * 2)
        }
      } else if (Array.isArray(scanData.points)) {
        // 기존 객체 배열 형식인 경우
        const cosYaw = Math.cos(yaw)
        const sinYaw = Math.sin(yaw)
        scanData.points.forEach((pt) => {
          if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return
          const wx = pos.x + (pt.x * cosYaw - pt.y * sinYaw)
          const wy = pos.y + (pt.x * sinYaw + pt.y * cosYaw)
          const { px, py } = worldToCanvas(wx, wy)

          ctx.moveTo(px + r, py)
          ctx.arc(px, py, r, 0, Math.PI * 2)
        })
      } else if (scanData.ranges) {
        // LaserScan 형식인 경우
        const { angle_min, angle_increment, ranges, range_max } = scanData
        ranges.forEach((range, i) => {
          if (!isFinite(range) || range <= 0 || range >= range_max) return
          const angle = yaw + angle_min + i * angle_increment
          const wx = pos.x + range * Math.cos(angle)
          const wy = pos.y + range * Math.sin(angle)
          const { px, py } = worldToCanvas(wx, wy)

          ctx.moveTo(px + r, py)
          ctx.arc(px, py, r, 0, Math.PI * 2)
        })
      }
      ctx.fill()
    }

    // ── Layer 3: 커스텀 시각적 토픽 렌더링 ──────────────────────────────
    // 1) /scan_matched_points2 (매치된 라이다 점군)
    if (showScan && subscribedTopics.includes('/scan_matched_points2')) {
      const ptsData = customTopicsData['/scan_matched_points2']
      const pts = getPointsList(ptsData)
      ctx.fillStyle = 'rgba(52, 152, 219, 0.7)'
      ctx.beginPath()

      if (pts instanceof Float32Array) {
        const len = pts.length
        for (let i = 0; i < len; i += 2) {
          const { px, py } = worldToCanvas(pts[i], pts[i + 1])
          ctx.moveTo(px + 2, py)
          ctx.arc(px, py, 2, 0, Math.PI * 2)
        }
      } else if (Array.isArray(pts)) {
        pts.forEach((pt) => {
          if (typeof pt.x === 'number' && typeof pt.y === 'number') {
            const { px, py } = worldToCanvas(pt.x, pt.y)
            ctx.moveTo(px + 2, py)
            ctx.arc(px, py, 2, 0, Math.PI * 2)
          }
        })
      }
      ctx.fill()
    }

    /** 궤적 선 하나를 그린다 — 점들은 topicData 의 프레임 기준이라 map 으로 보정해서 찍는다. */
    const drawTrajectory = (topicData, strokeStyle) => {
      const pts = getPointsList(topicData)
      if (pts.length < 2) return
      const correction = correctionFor(topicData)

      ctx.beginPath()
      const first = transformPoint(correction, pts[0])
      const start = worldToCanvas(first.x, first.y)
      ctx.moveTo(start.px, start.py)
      for (let i = 1; i < pts.length; i++) {
        const world = transformPoint(correction, pts[i])
        const pt = worldToCanvas(world.x, world.y)
        ctx.lineTo(pt.px, pt.py)
      }
      ctx.strokeStyle = strokeStyle
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // 2) /trajectory_node_list (궤적 선 그리기)
    if (subscribedTopics.includes('/trajectory_node_list')) {
      drawTrajectory(customTopicsData['/trajectory_node_list'], '#e67e22')
    }

    // 2-1) /lio/path (LIO 주행 궤적 — nav_msgs/Path).
    // 매핑 중에는 lio_odom 기준으로 발행되므로 보정 없이 그리면 루프 클로저 이후 지도와 어긋난다.
    if (subscribedTopics.includes('/lio/path')) {
      drawTrajectory(customTopicsData['/lio/path'], '#8e44ad')
    }

    // 3) /landmark_poses_list (랜드마크 마커)
    if (subscribedTopics.includes('/landmark_poses_list')) {
      const landmarkData = customTopicsData['/landmark_poses_list']
      const pts = getPointsList(landmarkData)
      pts.forEach((pt) => {
        if (typeof pt.x === 'number' && typeof pt.y === 'number') {
          const { px, py } = worldToCanvas(pt.x, pt.y)
          ctx.beginPath()
          ctx.arc(px, py, 6, 0, Math.PI * 2)
          ctx.fillStyle = '#2ecc71'
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      })
    }

    // 4) /goal_pose (목표지점 깃발)
    if (subscribedTopics.includes('/goal_pose') && customTopicsData['/goal_pose']) {
      const gData = customTopicsData['/goal_pose']
      const pose = gData.pose?.position ?? gData.position ?? gData
      if (typeof pose.x === 'number' && typeof pose.y === 'number') {
        const { px, py } = worldToCanvas(pose.x, pose.y)
        ctx.beginPath()
        ctx.arc(px, py, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#e74c3c'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.fillStyle = '#fff'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('G', px, py)
      }
    }

    // 5) /initialpose (시작지점 포즈)
    if (subscribedTopics.includes('/initialpose') && customTopicsData['/initialpose']) {
      const initData = customTopicsData['/initialpose']
      const pose = initData.pose?.pose?.position ?? initData.pose?.position ?? initData
      if (typeof pose.x === 'number' && typeof pose.y === 'number') {
        const { px, py } = worldToCanvas(pose.x, pose.y)
        ctx.beginPath()
        ctx.arc(px, py, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#2ecc71'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.fillStyle = '#fff'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('S', px, py)
      }
    }

    // 6) /clicked_point (클릭된 위치 점)
    if (subscribedTopics.includes('/clicked_point') && customTopicsData['/clicked_point']) {
      const clickData = customTopicsData['/clicked_point']
      const pt = clickData.point ?? clickData
      if (typeof pt.x === 'number' && typeof pt.y === 'number') {
        const { px, py } = worldToCanvas(pt.x, pt.y)
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#f1c40f'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }

    // 7) /tf 및 /tf_static (좌표축 프레임 렌더링)
    const drawTF = (tfData) => {
      if (!tfData || !Array.isArray(tfData.transforms)) return
      tfData.transforms.forEach((t) => {
        const translation = t.transform?.translation
        const rotation = t.transform?.rotation
        if (!translation) return

        const { px, py } = worldToCanvas(translation.x, translation.y)

        let yaw = 0
        if (rotation) {
          yaw = Math.atan2(
            2 * (rotation.w * rotation.z + rotation.x * rotation.y),
            1 - 2 * (rotation.y * rotation.y + rotation.z * rotation.z)
          )
        }

        // X축 (빨강)
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px + 15 * Math.cos(yaw), py - 15 * Math.sin(yaw))
        ctx.strokeStyle = '#e74c3c'
        ctx.lineWidth = 2
        ctx.stroke()

        // Y축 (초록)
        const yawY = yaw + Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px + 15 * Math.cos(yawY), py - 15 * Math.sin(yawY))
        ctx.strokeStyle = '#2ecc71'
        ctx.lineWidth = 2
        ctx.stroke()

        // 라벨 이름
        ctx.fillStyle = '#34495e'
        ctx.font = '9px monospace'
        ctx.fillText(t.child_frame_id || '', px + 8, py - 8)
      })
    }

    if (subscribedTopics.includes('/tf')) {
      drawTF(customTopicsData['/tf'])
    }
    if (subscribedTopics.includes('/tf_static')) {
      drawTF(customTopicsData['/tf_static'])
    }

    // ── Layer 4: POI 마커 ────────────────────────────────────────────────
    // 지도(map) 프레임 좌표를 그대로 찍는다 — POI 는 저장된 맵 기준 좌표라 보정 대상이 아니다.
    // 마지막 레이어로 두어 지도/점군 위에 얹는다.
    poiHitsRef.current = []
    if (pois.length > 0) {
      ctx.font = '600 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'

      pois.forEach((poi) => {
        const position = poi?.pose?.position
        if (typeof position?.x !== 'number' || typeof position?.y !== 'number') return

        const { px, py } = worldToCanvas(position.x, position.y)
        // 클릭 판정용 좌표를 그린 그대로 남긴다 — 그리기와 판정이 같은 뷰 변환을 쓰게 된다.
        poiHitsRef.current.push({ poi, px, py })
        // 색은 타입(poi.type)으로 구분한다. 삭제 예정(작업본의 softDelete)은 목록에도 남아 있으므로
        // 지우지 않고 무채색으로 낮춰 구분만 한다.
        const isDeleted = !!poi?.editStatus?.softDelete
        const { marker: fill, label: labelColor } = poiColorsOf(poi?.type, isDeleted)

        // 방향(orientation) 이 있으면 삼각형으로 함께 보여준다 — POI 는 도착 지점의 방향도 뜻한다.
        const quat = poi?.pose?.orientation
        if (quat && (quat.z !== 0 || quat.w !== 1)) {
          const yaw = Math.atan2(
            2 * (quat.w * quat.z + quat.x * quat.y),
            1 - 2 * (quat.y * quat.y + quat.z * quat.z)
          )
          drawHeadingWedge(ctx, px, py, yaw, MARKER_RADIUS_PX, fill)
        }

        ctx.beginPath()
        ctx.arc(px, py, MARKER_RADIUS_PX, 0, Math.PI * 2)
        ctx.fillStyle = fill
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
        drawMarkerCore(ctx, px, py, MARKER_RADIUS_PX)

        // 이름 — 지도(흰 바탕/검은 벽) 어디에서나 읽히도록 흰 테두리를 두른 글자로 찍는다.
        const label = poi?.name?.default ?? poi?.name?.['ko-KR'] ?? poi?.name?.['en-US'] ?? ''
        if (label) {
          const ty = py - MARKER_RADIUS_PX - 5
          ctx.lineWidth = 3
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
          ctx.strokeText(label, px, ty)
          ctx.fillStyle = labelColor
          ctx.fillText(label, px, ty)
        }
      })
    }

    // ── Layer 5: 로봇 위치 마커 렌더링 ──────────────────────────────────
    // 가장 마지막(최상위) 레이어다 — POI 와 겹쳐도 로봇이 어디에 있는지가 먼저 보여야 한다.
    // 지도와 같은 프레임(map)인 robotPose 를 우선 사용한다. TF 가 아직 안 모였을 때만
    // /lio/odom 으로 폴백한다 — 이 값은 lio_odom 프레임이라 보정량이 반영되지 않는다.
    const markerPose =
      robotPose ??
      (subscribedTopicOf(subscribedTopics, 'odom') && odomData
        ? (() => {
            const pos = odomData.pose?.pose?.position ?? { x: 0, y: 0 }
            const quat = odomData.pose?.pose?.orientation ?? { x: 0, y: 0, z: 0, w: 1 }
            return {
              x: pos.x,
              y: pos.y,
              yaw: Math.atan2(2 * (quat.w * quat.z + quat.x * quat.y), 1 - 2 * (quat.y * quat.y + quat.z * quat.z))
            }
          })()
        : null)

    if (markerPose) {
      const { yaw } = markerPose
      const { px, py } = worldToCanvas(markerPose.x, markerPose.y)

      // 크기는 로봇 외형(footprint) 폴리곤이 있으면 그걸 그대로 쓰고, 없으면 상수 반경으로
      // 폴백한다 — footprint 는 nav2(corepath) 가 떠 있을 때만 발행되므로 매핑 단계에서는 없다.
      const footprintTopic = FOOTPRINT_TOPICS.find((topic) => subscribedTopics.includes(topic))
      const footprintData = footprintTopic ? customTopicsData[footprintTopic] : null
      const footprintPts = footprintData?.polygon?.points ?? []
      // 폴리곤 점들은 costmap global_frame 기준이라 map 으로 보정해서 찍는다
      // (global_costmap 은 이미 map 이라 보정량이 null 이 되고 좌표가 그대로 쓰인다).
      const footprintCorrection = correctionFor(footprintData)

      // 본체 크기를 픽셀로 먼저 잡는다 — 방향 삼각형이 본체 밖으로 나와야 하므로 폴리곤이 있으면
      // 그 최대 반경을 쓴다(그러지 않으면 큰 로봇에서 삼각형이 본체에 완전히 묻힌다).
      const footprintCanvasPts =
        footprintPts.length >= 3
          ? footprintPts.map((pt) => {
              const world = transformPoint(footprintCorrection, pt)
              return worldToCanvas(world.x, world.y)
            })
          : []
      const footprintRadiusPx = footprintCanvasPts.reduce(
        (max, corner) => Math.max(max, Math.hypot(corner.px - px, corner.py - py)),
        0
      )
      // 실제 크기에 비례하되, 축소했을 때 POI 보다 작아지지 않도록 MARKER_RADIUS_PX 를 하한으로 둔다.
      const radiusPx = Math.max(
        MARKER_RADIUS_PX,
        footprintRadiusPx || (FALLBACK_ROBOT_RADIUS_M / resolution) * CELL_SIZE
      )
      const robotFill = 'rgba(41, 128, 185, 0.9)'

      // 방향 삼각형을 본체보다 먼저 그려 밑변을 본체 안에 묻는다(POI 마커와 같은 규약).
      drawHeadingWedge(ctx, px, py, yaw, radiusPx, robotFill)

      ctx.beginPath()
      if (footprintCanvasPts.length >= 3) {
        footprintCanvasPts.forEach((corner, i) => {
          if (i === 0) ctx.moveTo(corner.px, corner.py)
          else ctx.lineTo(corner.px, corner.py)
        })
        ctx.closePath()
      } else {
        ctx.arc(px, py, radiusPx, 0, Math.PI * 2)
      }
      ctx.fillStyle = robotFill
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      drawMarkerCore(ctx, px, py, radiusPx)
    }
  }, [
    mapData,
    scanData,
    odomData,
    robotPose,
    subscribedTopics,
    customTopicsData,
    frameCorrections,
    pois,
    showScan,
    applyFit
  ])

  // 데이터 변경 시 리렌더링
  useEffect(() => {
    render()
  }, [render])

  // 이벤트 핸들러가 항상 최신 render 를 쓰도록 ref 로 유지
  useEffect(() => {
    renderRef.current = render
  }, [render])

  // 컨테이너 크기 변경 시 — 사용자가 뷰를 건드리지 않았으면 다시 가운데 맞춤
  useEffect(() => {
    const wrapper = wrapperEl
    if (!wrapper || typeof ResizeObserver === 'undefined') {
      const handleResize = () => renderRef.current()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }

    const observer = new ResizeObserver(() => {
      if (!userAdjustedRef.current) {
        // fitKey 를 비워 render 가 새 캔버스 크기로 다시 fit 하게 한다
        fitKeyRef.current = ''
      } else {
        clampView()
      }
      renderRef.current()
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [wrapperEl, clampView])

  // 휠 확대/축소(커서 기준) + 드래그 이동
  useEffect(() => {
    const wrapper = wrapperEl
    if (!wrapper) return

    const zoomAt = (mx, my, factor) => {
      const view = viewRef.current
      const fitScale = fitScaleRef.current || view.scale
      if (!view.scale || !fitScale) return
      const next = Math.min(Math.max(view.scale * factor, fitScale * ZOOM_MIN_RATIO), fitScale * ZOOM_MAX_RATIO)
      if (next === view.scale) return
      // 커서 아래의 지도 지점이 그대로 유지되도록 이동량 보정
      const ratio = next / view.scale
      viewRef.current = {
        scale: next,
        tx: mx - (mx - view.tx) * ratio,
        ty: my - (my - view.ty) * ratio
      }
      userAdjustedRef.current = true
      clampView()
      renderRef.current()
      onViewChangeRef.current?.()
    }

    // 브라우저가 React 의 onWheel 을 passive 로 등록해 preventDefault 가 먹지 않으므로
    // 네이티브 리스너를 passive: false 로 직접 붙인다(페이지 스크롤 방지).
    const handleWheel = (e) => {
      e.preventDefault()
      const rect = (canvasRef.current ?? wrapper).getBoundingClientRect()
      if (!rect.width || !rect.height) return
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP)
    }

    const handleMouseDown = (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      // startX/Y 는 클릭 판정(이동 거리)과 말풍선 위치 계산에 쓰므로 드래그 중에도 유지한다.
      dragRef.current = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false }
      wrapper.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e) => {
      const drag = dragRef.current
      if (!drag) return
      const view = viewRef.current
      view.tx += e.clientX - drag.x
      view.ty += e.clientY - drag.y
      const moved =
        drag.moved || Math.abs(e.clientX - drag.startX) > CLICK_SLOP || Math.abs(e.clientY - drag.startY) > CLICK_SLOP
      dragRef.current = { ...drag, x: e.clientX, y: e.clientY, moved }
      userAdjustedRef.current = true
      clampView()
      renderRef.current()
    }

    const handleMouseUp = () => {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      wrapper.style.cursor = 'grab'

      // 팬이었으면 뷰가 바뀐 것만 알리고, 제자리 클릭이면 월드 좌표로 바꿔 올려보낸다.
      if (drag.moved) {
        onViewChangeRef.current?.()
        return
      }
      const handler = onMapClickRef.current
      if (!handler) return
      const rect = (canvasRef.current ?? wrapper).getBoundingClientRect()
      const canvasX = drag.startX - rect.left
      const canvasY = drag.startY - rect.top

      // 먼저 POI 를 집었는지 본다 — 겹쳐 있으면 클릭 지점에 가장 가까운 하나만 고른다.
      const hit = poiHitsRef.current.reduce((best, candidate) => {
        const distance = Math.hypot(candidate.px - canvasX, candidate.py - canvasY)
        if (distance > POI_HIT_RADIUS_PX) return best
        return !best || distance < best.distance ? { ...candidate, distance } : best
      }, null)
      if (hit) {
        const position = hit.poi.pose.position
        handler({ x: position.x, y: position.y, canvasX: hit.px, canvasY: hit.py, poi: hit.poi })
        return
      }

      const world = canvasToWorld(canvasX, canvasY)
      if (world) handler({ ...world, canvasX, canvasY, poi: null })
    }

    // 더블클릭 → 전체보기로 초기화
    const handleDoubleClick = () => {
      const canvas = canvasRef.current
      const { w, h } = gridSizeRef.current
      if (!canvas || !w || !h) return
      applyFit(canvas.width, canvas.height, w, h)
      userAdjustedRef.current = false
      renderRef.current()
      onViewChangeRef.current?.()
    }

    wrapper.addEventListener('wheel', handleWheel, { passive: false })
    wrapper.addEventListener('mousedown', handleMouseDown)
    wrapper.addEventListener('dblclick', handleDoubleClick)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      wrapper.removeEventListener('wheel', handleWheel)
      wrapper.removeEventListener('mousedown', handleMouseDown)
      wrapper.removeEventListener('dblclick', handleDoubleClick)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [wrapperEl, applyFit, clampView, canvasToWorld])

  const hasSpatialSubscription = subscribedTopics.some((t) => SPATIAL_TOPICS.includes(t))

  if (!hasSpatialSubscription) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderText}>시각화 가능한 토픽을 구독해주세요.</span>
      </div>
    )
  }

  const mapTopic = subscribedTopicOf(subscribedTopics, 'map')
  if (mapTopic && !mapData) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderText}>{mapTopic} 토픽 수신 대기 중...</span>
      </div>
    )
  }

  return (
    <div ref={setWrapperNode} style={styles.wrapper} title="휠: 확대/축소 · 드래그: 이동 · 더블클릭: 전체보기">
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  )
}

const styles = {
  // 지도를 담는 고정 뷰포트 — 스크롤 대신 캔버스 내부 뷰 변환(줌/팬)으로 탐색한다
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    // 부모 높이가 확정되지 않는 레이아웃에서도 캔버스가 찌그러지지 않도록 최소 높이 확보
    minHeight: 400,
    background: '#e8e8e8',
    cursor: 'grab',
    touchAction: 'none'
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
    imageRendering: 'pixelated' // 픽셀 선명하게
  },
  placeholder: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#e8e8e8',
    minHeight: 400
  },
  placeholderText: {
    color: '#888',
    fontSize: 16
  }
}

const MemoizedMapCanvas = React.memo(MapCanvas, (prevProps, nextProps) => {
  if (prevProps.mapData !== nextProps.mapData) return false
  if (prevProps.scanData !== nextProps.scanData) return false
  if (prevProps.odomData !== nextProps.odomData) return false
  if (prevProps.robotPose !== nextProps.robotPose) return false
  // 보정량이 갱신되면(루프 클로저 등) 궤적을 다시 그려야 한다.
  if (prevProps.frameCorrections !== nextProps.frameCorrections) return false
  if (prevProps.showScan !== nextProps.showScan) return false
  // POI 목록은 편집(생성/수정/삭제 예정)마다 새 배열이 오므로 레퍼런스 비교로 충분하다.
  if (prevProps.pois !== nextProps.pois) return false
  if (prevProps.subscribedTopics !== nextProps.subscribedTopics) return false
  // 콜백은 ref 로 최신값을 쓰지만, 부모가 새 함수를 넘기면 리스너 재등록이 필요할 수 있어 함께 본다.
  if (prevProps.onMapClick !== nextProps.onMapClick) return false
  if (prevProps.onViewChange !== nextProps.onViewChange) return false

  // Check spatial keys in customTopicsData
  const spatialKeys = [
    '/scan_matched_points2',
    '/lio/path',
    '/trajectory_node_list',
    '/landmark_poses_list',
    '/goal_pose',
    '/initialpose',
    '/clicked_point',
    '/tf',
    '/tf_static',
    ...FOOTPRINT_TOPICS
  ]

  for (const key of spatialKeys) {
    if (prevProps.customTopicsData[key] !== nextProps.customTopicsData[key]) {
      return false
    }
  }

  return true
})

export default MemoizedMapCanvas
