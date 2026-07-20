import React, { useEffect, useRef, useCallback } from 'react'

// OccupancyGrid의 장애물 확률(0~100)에 따른 밝기(0~255) 값을 미리 계산한 캐시 배열
const BRIGHTNESS_CACHE = new Uint8Array(101)
for (let i = 0; i <= 100; i++) {
  BRIGHTNESS_CACHE[i] = Math.round(255 * (1 - i / 100))
}

/**
 * MapCanvas
 *
 * /map (OccupancyGrid) + /scan (LaserScan) + /odom (로봇 위치)를
 * HTML Canvas 2D API로 렌더링하는 컴포넌트.
 *
 * 렌더링 레이어 순서 (아래에서 위로):
 *   1. OccupancyGrid 격자 지도  (회색/흰색/검정)
 *   2. LaserScan 포인트          (빨간 점들)
 *   3. 로봇 위치 마커             (파란 원 + 방향 화살표)
 */
function MapCanvas({
  mapData,
  scanData,
  odomData,
  subscribedTopics = [],
  customTopicsData = {}
}) {
  const canvasRef = useRef(null)
  const mapCacheCanvasRef = useRef(null)
  const mapCacheValidRef = useRef(false)
  const lastMapDataRef = useRef(null)

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

    // 캔버스 크기를 컨테이너 크기 기반으로 계산
    const maxSize = Math.min(canvas.parentElement?.clientWidth || 600, 700)
    const CELL_SIZE = hasMap ? Math.max(1, Math.floor(maxSize / Math.max(width, height))) : 1

    const targetWidth = width * CELL_SIZE
    const targetHeight = height * CELL_SIZE

    // 크기가 실제로 변경되었을 때만 가로/세로 속성을 할당하여 Canvas 초기화 오버헤드 방지
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
    } else {
      // 크기가 변경되지 않았다면 이전 그림을 지워줌
      ctx.clearRect(0, 0, targetWidth, targetHeight)
    }

    // ROS 월드 좌표(미터) → 캔버스 픽셀 좌표 변환
    // 지도 원점 또는 임의의 중앙 원점 (-12.5m, -12.5m) 사용해 (0,0)을 중앙에 오게 함
    const origin = hasMap
      ? (mapData.info.origin?.position ?? { x: 0, y: 0 })
      : { x: -12.5, y: -12.5 }

    const worldToCanvas = (wx, wy) => {
      const col = (wx - origin.x) / resolution
      const row = (wy - origin.y) / resolution
      const px = col * CELL_SIZE
      const py = (height - row) * CELL_SIZE
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

        ctx.drawImage(
          mapCacheCanvasRef.current,
          0,
          0,
          width,
          height,
          0,
          0,
          canvas.width,
          canvas.height
        )
      } else {
        // 캐시 준비중인 경우의 대체 렌더링
        ctx.fillStyle = '#cccccc'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
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
    if (subscribedTopics.includes('/lidar_points') && scanData && odomData) {
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
    if (subscribedTopics.includes('/odom') && odomData) {
      const pos = odomData.pose?.pose?.position ?? { x: 0, y: 0 }
      const quat = odomData.pose?.pose?.orientation ?? { x: 0, y: 0, z: 0, w: 1 }
      const yaw = Math.atan2(2 * (quat.w * quat.z + quat.x * quat.y), 1 - 2 * (quat.y * quat.y + quat.z * quat.z))

      const { px, py } = worldToCanvas(pos.x, pos.y)
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
  }, [mapData, scanData, odomData, subscribedTopics, customTopicsData])

  // 데이터 변경 시 리렌더링
  useEffect(() => {
    render()
  }, [render])

  // 창 크기 변경 시 리렌더링
  useEffect(() => {
    const handleResize = () => render()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [render])

  const hasSpatialSubscription = subscribedTopics.some((t) =>
    [
      '/map',
      '/odom',
      '/lidar_points',
      '/tf',
      '/tf_static',
      '/scan_matched_points2',
      '/trajectory_node_list',
      '/constraint_list',
      '/landmark_poses_list',
      '/map_updates',
      '/initialpose',
      '/goal_pose',
      '/clicked_point'
    ].includes(t)
  )

  if (!hasSpatialSubscription) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderText}>시각화 가능한 토픽을 구독해주세요.</span>
      </div>
    )
  }

  if (subscribedTopics.includes('/map') && !mapData) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderText}>/map 토픽 수신 대기 중...</span>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  )
}

const styles = {
  wrapper: {
    overflow: 'auto',
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 12,
    background: '#e8e8e8'
  },
  canvas: {
    display: 'block',
    imageRendering: 'pixelated', // 픽셀 선명하게
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
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
  if (prevProps.subscribedTopics !== nextProps.subscribedTopics) return false

  // Check spatial keys in customTopicsData
  const spatialKeys = [
    '/scan_matched_points2',
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
