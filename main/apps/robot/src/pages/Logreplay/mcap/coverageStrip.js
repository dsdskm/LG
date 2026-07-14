// Logreplay/mcap/coverageStrip.js

// 1) 메시지에서 경로 점 추출
//  - trackedpose (geometry_msgs/PoseStamped) 우선 사용
//  - 없으면 path (nav_msgs/Path)에서 포즈 배열 평탄화
export function extractPathPointsFromMsgs({ trackedposeMsgs = [], pathMsgs = [] }) {
  const pts = []

  const normStamp = (stamp) => {
    // ROS1: { secs, nsecs }, ROS2: { sec, nanosec }, or float seconds
    if (!stamp) return 0
    if (typeof stamp.secs === 'number' || typeof stamp.nsecs === 'number') {
      const s = stamp.secs ?? 0
      const ns = stamp.nsecs ?? 0
      return s + ns * 1e-9
    }
    if (typeof stamp.sec === 'number' || typeof stamp.nanosec === 'number') {
      const s = stamp.sec ?? 0
      const ns = stamp.nanosec ?? 0
      return s + ns * 1e-9
    }
    if (typeof stamp === 'number') return stamp
    return 0
  }

  // PoseStamped류
  for (const m of trackedposeMsgs) {
    try {
      const p = m?.pose?.position || m?.pose?.pose?.position || m?.pose?.pose?.pose?.position
      if (!p) continue
      const t = normStamp(m?.header?.stamp)
      pts.push({ t, x: p.x, y: p.y })
    } catch {}
  }

  // Path류 (fallback)
  if (pts.length === 0) {
    for (const path of pathMsgs) {
      const arr = path?.poses || []
      for (const ps of arr) {
        const p = ps?.pose?.position
        if (!p) continue
        const t = normStamp(ps?.header?.stamp ?? path?.header?.stamp)
        pts.push({ t, x: p.x, y: p.y })
      }
    }
  }

  // 시간순 정렬 및 NaN 제거
  const filtered = pts.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  filtered.sort((a, b) => a.t - b.t)
  return filtered
}

// 2) 경로 다운샘플 (거리 기준, m 단위)
export function downsampleByDistance(points, minDistM = 0.05) {
  if ((points?.length || 0) <= 2) return points || []
  const out = [points[0]]
  let last = points[0]
  const min2 = minDistM * minDistM
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - last.x
    const dy = points[i].y - last.y
    if (dx * dx + dy * dy >= min2) {
      out.push(points[i])
      last = points[i]
    }
  }
  return out
}

// 3) 좌표 변환자 구성 (월드[m] → 라스터[pixel] → 화면[pixel])
//   - OccupancyGrid info: resolution, width, height, origin(x,y)
export function makeTransforms(gridInfo, view) {
  const res = gridInfo?.resolution || 0.05
  const gW = gridInfo?.width || 1
  const gH = gridInfo?.height || 1
  const org = gridInfo?.origin?.position || gridInfo?.origin || { x: 0, y: 0 }
  const orgX = org.x || 0
  const orgY = org.y || 0

  const scale = view?.scale ?? 1
  const offsetX = view?.offsetX ?? 0
  const offsetY = view?.offsetY ?? 0

  const worldToRaster = (x, y) => {
    const rx = (x - orgX) / res
    const ry = (y - orgY) / res
    return { rx, ry }
  }

  const rasterToScreen = (rx, ry) => {
    // 라스터 원점(좌하) vs 캔버스 원점(좌상) → y 플립(gH - ry)
    const sx = rx * scale + offsetX
    const sy = (gH - ry) * scale + offsetY
    return { sx, sy }
  }

  const worldToScreen = (x, y) => {
    const { rx, ry } = worldToRaster(x, y)
    return rasterToScreen(rx, ry)
  }

  return { worldToRaster, rasterToScreen, worldToScreen, res, gW, gH, scale, offsetX, offsetY }
}

// 4) 경로 스트립 그리기
export function drawCoverageStrip(
  ctx,
  gridInfo,
  view,
  points,
  {
    brushWidthM = 0.4,
    color = 'rgba(76, 201, 91, 0.85)',
    composite = 'source-over',
    lineCap = 'round',
    lineJoin = 'round'
  } = {}
) {
  if (!ctx || !gridInfo || !points || points.length < 2) return

  const { worldToScreen, res, scale } = makeTransforms(gridInfo, view)
  const lineWidthPx = Math.max(1, (brushWidthM / res) * scale)

  ctx.save()
  ctx.globalCompositeOperation = composite
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidthPx
  ctx.lineCap = lineCap
  ctx.lineJoin = lineJoin

  ctx.beginPath()
  let p0 = points[0]
  let { sx: x0, sy: y0 } = worldToScreen(p0.x, p0.y)
  ctx.moveTo(x0, y0)

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const { sx, sy } = worldToScreen(p.x, p.y)
    ctx.lineTo(sx, sy)
  }

  ctx.stroke()
  ctx.restore()
}
