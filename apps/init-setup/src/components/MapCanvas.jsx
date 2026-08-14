import React, { useEffect, useRef, useCallback, useState } from 'react'
import { SPATIAL_TOPICS, subscribedTopicOf } from '@/constants/topics'

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
 *   3. 로봇 위치 마커             (파란 원 + 방향 화살표)
 */
function MapCanvas({ mapData, scanData, odomData, robotPose = null, subscribedTopics = [], customTopicsData = {} }) {
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
    if (subscribedTopicOf(subscribedTopics, 'scan') && scanData && odomData) {
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

    // ── Layer 3: 로봇 위치 마커 렌더링 ──────────────────────────────────
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
      const ROBOT_R = Math.max(6, CELL_SIZE * 2)

      ctx.beginPath()
      ctx.arc(px, py, ROBOT_R, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(41, 128, 185, 0.85)'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + ROBOT_R * 1.5 * Math.cos(yaw), py - ROBOT_R * 1.5 * Math.sin(yaw))
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // ── Layer 4: 커스텀 시각적 토픽 렌더링 ──────────────────────────────
    // 1) /scan_matched_points2 (매치된 라이다 점군)
    if (subscribedTopics.includes('/scan_matched_points2')) {
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

    // 2) /trajectory_node_list (궤적 선 그리기)
    if (subscribedTopics.includes('/trajectory_node_list')) {
      const trajData = customTopicsData['/trajectory_node_list']
      const pts = getPointsList(trajData)
      if (pts.length > 1) {
        ctx.beginPath()
        const start = worldToCanvas(pts[0].x, pts[0].y)
        ctx.moveTo(start.px, start.py)
        for (let i = 1; i < pts.length; i++) {
          const pt = worldToCanvas(pts[i].x, pts[i].y)
          ctx.lineTo(pt.px, pt.py)
        }
        ctx.strokeStyle = '#e67e22'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // 2-1) /lio/path (LIO 주행 궤적 — nav_msgs/Path)
    if (subscribedTopics.includes('/lio/path')) {
      const pathData = customTopicsData['/lio/path']
      const pts = getPointsList(pathData)
      if (pts.length > 1) {
        ctx.beginPath()
        const start = worldToCanvas(pts[0].x, pts[0].y)
        ctx.moveTo(start.px, start.py)
        for (let i = 1; i < pts.length; i++) {
          const pt = worldToCanvas(pts[i].x, pts[i].y)
          ctx.lineTo(pt.px, pt.py)
        }
        ctx.strokeStyle = '#8e44ad'
        ctx.lineWidth = 2
        ctx.stroke()
      }
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
  }, [mapData, scanData, odomData, robotPose, subscribedTopics, customTopicsData, applyFit])

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
      dragRef.current = { x: e.clientX, y: e.clientY }
      wrapper.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e) => {
      const drag = dragRef.current
      if (!drag) return
      const view = viewRef.current
      view.tx += e.clientX - drag.x
      view.ty += e.clientY - drag.y
      dragRef.current = { x: e.clientX, y: e.clientY }
      userAdjustedRef.current = true
      clampView()
      renderRef.current()
    }

    const handleMouseUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      wrapper.style.cursor = 'grab'
    }

    // 더블클릭 → 전체보기로 초기화
    const handleDoubleClick = () => {
      const canvas = canvasRef.current
      const { w, h } = gridSizeRef.current
      if (!canvas || !w || !h) return
      applyFit(canvas.width, canvas.height, w, h)
      userAdjustedRef.current = false
      renderRef.current()
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
  }, [wrapperEl, applyFit, clampView])

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
  if (prevProps.subscribedTopics !== nextProps.subscribedTopics) return false

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
    '/tf_static'
  ]

  for (const key of spatialKeys) {
    if (prevProps.customTopicsData[key] !== nextProps.customTopicsData[key]) {
      return false
    }
  }

  return true
})

export default MemoizedMapCanvas
