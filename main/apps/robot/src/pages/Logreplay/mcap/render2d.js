// ./mcap/render2d.js
import { computeFit } from '../view2d.js'

/** 그리드의 점유영역 중심(occupied-center) 계산 */
export function gridOccupiedBounds(grid, { occMin = 1, occMax = 100, sampleStep = 2 } = {}) {
  if (!grid || !grid.width || !grid.height || !grid.resolution || !grid.data) return null
  let u8 = null
  const src = grid.data
  if (src instanceof Uint8Array) u8 = src
  else if (ArrayBuffer.isView(src)) u8 = new Uint8Array(src.buffer, src.byteOffset, src.byteLength)
  else if (src instanceof Array) u8 = Uint8Array.from(src)
  else if (src instanceof ArrayBuffer) u8 = new Uint8Array(src)
  if (!u8) return null

  const { width, height, resolution, origin } = grid
  let minX = +Infinity,
    maxX = -Infinity,
    minY = +Infinity,
    maxY = -Infinity

  for (let iy = 0; iy < height; iy += sampleStep) {
    const rowBase = iy * width
    for (let ix = 0; ix < width; ix += sampleStep) {
      const v = u8[rowBase + ix] // 0..100, 255=unknown
      if (v === 255) continue
      if (v >= occMin && v <= occMax) {
        const cx = origin.x + (ix + 0.5) * resolution
        const cy = origin.y + (iy + 0.5) * resolution
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy
      }
    }
  }
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
}

/**
 * 외부 의존(Ref)을 주입받아 캔버스 렌더러 함수를 생성합니다.
 * 반환된 함수는 호출 시 현재 상태/refs를 읽어 그립니다.
 */
export function createCanvasRenderer({
  canvasRef,
  pathPointsRef,
  plannedPathPointsRef,
  gridDataRef,
  localCostmapDataRef,
  dwaGoalsRef,
  localCostmapFramesRef,
  playTimeSecRef,
  viewRef,
  smoothRef,
  renderOptionsRef
}) {
  // ── 디버그 HUD/축/로그 토글 (운영 기본 OFF) ───────────────────────
  const DEBUG_OVERLAY = false // 좌상단/우하단 디버그 텍스트
  const SHOW_AXES = false // 그리드 좌표축(+X=red, +Y=blue) 오버레

  // 최근 표시한 Local Costmap 프레임(hold-last용)
  let lastLocalCostmap = null // { grid, tSec }

  // 최근 표시한 DWA goal (hold-last용)
  let lastDwaGoal = null // { tSec, x, y, yaw, frame_id }

  // ─────────────────────────────────────────────
  // 렌더 설정 토글
  // ─────────────────────────────────────────────
  const USE_AUTO_ALIGN = false // 동일 프레임(map) 확실 -> false 권장
  const HALF_CELL_FIX = false // origin이 셀 중심 기록된 로그가 있을 때 true로 테스트

  // ── Local Costmap 정책(추가/조정) ─────────────────────────────
  const MAX_FRAME_DELTA_SEC = 0.9 // 과거 최신 허용 시차
  const HOLD_LAST_SEC = 15 // 프레임 공백이 긴 로그(B)에 맞춰 확장
  const FUTURE_WARMUP_SEC = 0.3 // 과도한 미래 프레임 당김 방지
  const RELAXED_PICK = false // 너무 먼 시간 프레임 강제 선택 방지
  const MAX_NEAREST_SEC = 5 // 켜더라도 3~5초 이내만 허용

  const APPLY_BASE_FRAME_TRANSLATION = true
  const APPLY_POSE_YAW_FOR_BASE_FRAME = false

  // ※ 윤곽만 보이는 문제를 줄이기 위해 기본은 false
  const ALWAYS_DRAW_OUTLINE = false // 이미지 없으면 **윤곽도** 그리지 않음
  const SHOW_FREE_TINT = true // v=0도 아주 옅게 보이게(권장)

  // 참조 상수 기본값 정의(코스트맵 팔레트 빌드에서 사용)
  const TREAT_255_AS_OBSTACLE = false

  // ── map 프레임 스냅(선택) ─────────────────────────────────────
  const ENABLE_SNAP_FOR_MAP_LCM = false
  const SNAP_ONLY_WHEN_SMALL_M = 6.0
  const SNAP_MAX_DIST_M = 3.0

  // ─────────────────────────────────────────────
  // Patch 3: 캐시를 데이터 객체에 붙이지 않고 WeakMap/WeakSet로 관리
  // ─────────────────────────────────────────────
  const _gridCache = new WeakMap() // key: grid object, value: { canvas,w,h,dataLen,res }
  const _costCache = new WeakMap() // key: cost object, value: { canvas,w,h,dataLen,res }
  const _seriesShiftCache = new WeakMap() // key: frames array, value: { timeShiftSec }
  const _sortedSeries = new WeakSet() // key: goalsRaw array (원본 배열) 정렬 여부 플래그

  function drawGridAxes(ctx, fastWS, ox, oy) {
    const p0 = fastWS(ox, oy)
    const px = fastWS(ox + 1.0, oy)
    const py = fastWS(ox, oy + 1.0)
    ctx.save()
    ctx.lineWidth = 2
    // +X (red)
    ctx.strokeStyle = '#ff5555'
    ctx.beginPath()
    ctx.moveTo(p0.sx, p0.sy)
    ctx.lineTo(px.sx, px.sy)
    ctx.stroke()
    // +Y (blue)
    ctx.strokeStyle = '#3388ff'
    ctx.beginPath()
    ctx.moveTo(p0.sx, p0.sy)
    ctx.lineTo(py.sx, py.sy)
    ctx.stroke()
    ctx.restore()
  }

  // 로컬 코스트맵 색 팔레트: 저코스트=시안(옅음) → 고코스트=마젠타(진함)
  function buildCostPalette() {
    const pal = new Array(256).fill(0).map(() => [0, 0, 0, 0])

    if (SHOW_FREE_TINT) {
      pal[0] = [0, 180, 200, 14]
    }

    pal[255] = [0x80, 0x80, 0x80, 0]

    for (let v = 1; v <= 100; v++) {
      const t = v / 100

      const c0 = { r: 0, g: 200, b: 220 }
      const c1 = { r: 235, g: 0, b: 235 }

      const r = Math.round(c0.r * (1 - t) + c1.r * t)
      const g = Math.round(c0.g * (1 - t) + c1.g * t)
      const b = Math.round(c0.b * (1 - t) + c1.b * t)

      let a = 0
      if (v < 20) a = Math.round(10 + t * 40)
      else if (v < 60) a = Math.round(30 + (t - 0.2) * 120)
      else a = Math.round(80 + (t - 0.6) * 130)

      pal[v] = [r, g, b, a]
    }

    return pal
  }
  const COST_PALETTE = buildCostPalette()

  function ensureUint8(src) {
    if (src instanceof Uint8Array) return src
    if (ArrayBuffer.isView(src)) return new Uint8Array(src.buffer, src.byteOffset, src.byteLength)
    if (Array.isArray(src)) return Uint8Array.from(src)
    if (src instanceof ArrayBuffer) return new Uint8Array(src)
    return null
  }

  // ─────────────────────────────────────────────
  // Patch 3: Grid/Cost 오프스크린 캔버스 캐시 빌더
  // ─────────────────────────────────────────────
  function getOrBuildGridCanvas(grid) {
    const w = grid.width | 0
    const h = grid.height | 0
    const dataLen = grid.data?.length || 0
    const res = grid.resolution

    const prev = _gridCache.get(grid)
    if (prev && prev.w === w && prev.h === h && prev.dataLen === dataLen && prev.res === res && prev.canvas) {
      return prev.canvas
    }

    const off = document.createElement('canvas')
    off.width = w
    off.height = h

    const octx = off.getContext('2d', { willReadFrequently: false })
    const img = octx.createImageData(w, h)
    const dst = img.data
    const u8 = ensureUint8(grid.data)

    if (u8 && u8.length >= w * h) {
      const DATA_TOPLEFT = true
      for (let y = 0; y < h; y++) {
        const sy = y
        const dy = DATA_TOPLEFT ? h - 1 - y : y
        for (let x = 0; x < w; x++) {
          const v0 = u8[sy * w + x]
          const di = (dy * w + x) * 4

          if (v0 === 255) {
            dst[di] = 0x80
            dst[di + 1] = 0x80
            dst[di + 2] = 0x80
            dst[di + 3] = 0
          } else {
            const t = Math.max(0, Math.min(100, v0)) / 100
            const c = Math.round(255 * (1 - t))
            dst[di] = c
            dst[di + 1] = c
            dst[di + 2] = c
            dst[di + 3] = 255
          }
        }
      }
      octx.putImageData(img, 0, 0)
    }

    _gridCache.set(grid, { canvas: off, w, h, dataLen, res })
    return off
  }

  function getOrBuildCostCanvas(cost) {
    const w = cost.width | 0
    const h = cost.height | 0
    const dataLen = cost.data?.length || 0
    const res = cost.resolution

    const prev = _costCache.get(cost)
    if (prev && prev.w === w && prev.h === h && prev.dataLen === dataLen && prev.res === res && prev.canvas) {
      return prev.canvas
    }

    const off = document.createElement('canvas')
    off.width = w
    off.height = h
    const octx = off.getContext('2d')
    const img = octx.createImageData(w, h)
    const dst = img.data
    const u8 = ensureUint8(cost.data)

    if (u8 && u8.length >= w * h) {
      const DATA_TOPLEFT = true
      for (let y = 0; y < h; y++) {
        const sy = y
        const dy = DATA_TOPLEFT ? h - 1 - y : y
        for (let x = 0; x < w; x++) {
          let v = u8[sy * w + x] | 0
          if (v === 255 && TREAT_255_AS_OBSTACLE) v = 100
          if (v > 100 && v !== 255) v = 100
          const di = (dy * w + x) * 4
          const [R, G, B, A] = COST_PALETTE[v] || [0, 0, 0, 0]
          dst[di] = R
          dst[di + 1] = G
          dst[di + 2] = B
          dst[di + 3] = A
        }
      }
      octx.putImageData(img, 0, 0)
    }

    _costCache.set(cost, { canvas: off, w, h, dataLen, res })
    return off
  }

  // ─────────────────────────────────────────────
  // Robust 중앙값 & LCM↔Pose 시간 오프셋 추정(1회성 캐시)
  // ─────────────────────────────────────────────
  function median(arr) {
    if (!arr || arr.length === 0) return 0
    const a = arr.slice().sort((x, y) => x - y)
    const m = (a.length - 1) >> 1
    return a.length % 2 ? a[m] : 0.5 * (a[m] + a[m + 1])
  }

  /**
   * frames: [{tSec, grid}, ...], pts: [{tSec,x,y,yaw}, ...]
   * 여러 지점에서 최근접 pose와의 Δt를 측정해 중앙값으로 shift를 산출.
   * 반환: shiftSec (pose 시각 + shift ≈ lcm 시각)
   */
  function estimateSeriesTimeShiftSec(frames, pts, { samplesMax = 24, searchWindowSec = 10 } = {}) {
    if (!Array.isArray(frames) || frames.length === 0) return 0
    if (!Array.isArray(pts) || pts.length === 0) return 0
    const tPose0 = pts[0]?.tSec ?? 0
    const tPose1 = pts[pts.length - 1]?.tSec ?? 0
    const tLCM0 = frames[0]?.tSec ?? 0
    const tLCM1 = frames[frames.length - 1]?.tSec ?? 0
    if (!Number.isFinite(tPose0) || !Number.isFinite(tPose1) || !Number.isFinite(tLCM0) || !Number.isFinite(tLCM1))
      return 0
    const spanLCM = Math.max(0.001, tLCM1 - tLCM0)
    const n = Math.min(samplesMax, frames.length)
    const deltas = []

    function lbPose(t) {
      let lo = 0,
        hi = pts.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if ((pts[mid].tSec ?? 0) <= t) lo = mid + 1
        else hi = mid
      }
      return Math.max(0, Math.min(pts.length - 1, lo - 1))
    }

    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : i / (n - 1)
      const tf = tLCM0 + u * spanLCM
      const k = lbPose(tf)
      let bestDt = Infinity
      for (const j of [k - 1, k, k + 1]) {
        if (j < 0 || j >= pts.length) continue
        const dt = (pts[j]?.tSec ?? Infinity) - tf
        if (Math.abs(dt) < Math.abs(bestDt)) bestDt = dt
      }
      if (Number.isFinite(bestDt) && Math.abs(bestDt) <= searchWindowSec) {
        deltas.push(bestDt) // shift = pose - lcm
      }
    }
    if (deltas.length === 0) return 0
    return median(deltas)
  }

  // 현재 캔버스에 보이는 월드 직사각형 (y-up 좌표계 기준)
  function getWorldViewRect(cssW, cssH, originX, originY, panX, panY, scale) {
    const wx0 = panX + (0 - originX) / scale
    const wx1 = panX + (cssW - originX) / scale
    const wyTop = panY - (0 - originY) / scale
    const wyBot = panY - (cssH - originY) / scale
    return {
      minX: Math.min(wx0, wx1),
      maxX: Math.max(wx0, wx1),
      minY: Math.min(wyBot, wyTop),
      maxY: Math.max(wyBot, wyTop)
    }
  }

  // Patch 1: 포즈 보간 단일화
  function getPoseAtTime(pts, tSecCutoff) {
    if (!Array.isArray(pts) || pts.length === 0) return { x: 0, y: 0, yaw: 0, tSec: tSecCutoff ?? 0 }

    let lo = 0,
      hi = pts.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if ((pts[mid].tSec ?? 0) <= tSecCutoff) lo = mid + 1
      else hi = mid
    }
    const idx = lo - 1

    let curX, curY, curYaw
    if (idx <= -1) {
      curX = pts[0].x
      curY = pts[0].y
      curYaw = Number(pts[0]?.yaw) || 0
    } else if (idx >= pts.length - 1) {
      curX = pts[pts.length - 1].x
      curY = pts[pts.length - 1].y
      curYaw = Number(pts[pts.length - 1]?.yaw) || 0
    } else {
      const a = pts[idx],
        b = pts[idx + 1]
      const ta = a.tSec ?? 0,
        tb = b.tSec ?? 0
      const tt = (tSecCutoff - ta) / Math.max(1e-9, tb - ta)
      curX = a.x + (b.x - a.x) * tt
      curY = a.y + (b.y - a.y) * tt

      const yawA = Number(a.yaw) || 0
      const yawB = Number(b.yaw) || 0
      let dyaw = yawB - yawA
      while (dyaw > Math.PI) dyaw -= 2 * Math.PI
      while (dyaw < -Math.PI) dyaw += 2 * Math.PI
      curYaw = yawA + dyaw * tt
    }
    return { x: curX, y: curY, yaw: curYaw, tSec: tSecCutoff ?? 0 }
  }

  /**
   * frames: [{tSec, grid}, ...] 시간 오름차순 가정
   * curT: 현재 재생 시각
   * lastRec: 직전에 그린 프레임(hold-last용)
   * 반환: { rec, why } | null
   */
  function pickLocalCostmapFrame(frames, curT, lastRec) {
    if (!Array.isArray(frames) || frames.length === 0) return null

    let lo = 0,
      hi = frames.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      const t = frames[mid]?.tSec ?? -Infinity
      if (t <= curT) lo = mid + 1
      else hi = mid
    }
    const pastIdx = lo - 1
    const futureIdx = lo

    if (pastIdx >= 0) {
      const recP = frames[pastIdx]
      const dtP = curT - recP.tSec
      if (Number.isFinite(dtP) && dtP <= MAX_FRAME_DELTA_SEC) {
        return { rec: recP, why: 'past' }
      }
    }

    if (futureIdx < frames.length) {
      const recF = frames[futureIdx]
      const dtF = recF.tSec - curT
      if (Number.isFinite(dtF) && dtF <= FUTURE_WARMUP_SEC) {
        return { rec: recF, why: 'future-warmup' }
      }
    }

    if (lastRec) {
      const dtH = curT - lastRec.tSec
      if (Number.isFinite(dtH) && dtH >= 0 && dtH <= HOLD_LAST_SEC) {
        return { rec: lastRec, why: 'hold-last' }
      }
    }

    if (RELAXED_PICK) {
      let best = null,
        bestAbs = Infinity
      for (let i = 0; i < frames.length; i++) {
        const t = frames[i]?.tSec
        if (!Number.isFinite(t)) continue
        const d = Math.abs(t - curT)
        if (d < bestAbs) {
          bestAbs = d
          best = frames[i]
        }
      }
      if (best && bestAbs <= MAX_NEAREST_SEC) {
        return { rec: best, why: 'nearest' }
      }
    }

    return null
  }

  function maybeSnapMapLocal(cost, poseNow) {
    const worldW = (cost.width | 0) * cost.resolution
    const worldH = (cost.height | 0) * cost.resolution
    if (!ENABLE_SNAP_FOR_MAP_LCM) return null
    if (!(worldW > 0 && worldH > 0)) return null
    if (!(Math.min(worldW, worldH) <= SNAP_ONLY_WHEN_SMALL_M)) return null
    if (!poseNow || !Number.isFinite(poseNow.x) || !Number.isFinite(poseNow.y)) return null

    const cx = (Number(cost.origin?.x) || 0) + worldW * 0.5
    const cy = (Number(cost.origin?.y) || 0) + worldH * 0.5
    const dx = poseNow.x - cx
    const dy = poseNow.y - cy
    const dist = Math.hypot(dx, dy)

    if (dist >= SNAP_MAX_DIST_M) {
      return {
        tx: poseNow.x - worldW * 0.5,
        ty: poseNow.y - worldH * 0.5,
        trot: Number(cost.origin?.yaw) || 0,
        snapped: true
      }
    }
    return null
  }

  // 보이는 영역만 + 화면 픽셀 간격 LOD 경로 드로잉
  function drawPolylineLOD(ctx, pts, { mode, color, tSecCutoff, zoom, offX = 0, offY = 0, fastWS, worldViewRect }) {
    if (!Array.isArray(pts) || pts.length < 2) return

    const minStepPx = Math.max(1.25, 0.9 + 0.9 * zoom)
    const padX = (worldViewRect.maxX - worldViewRect.minX) * 0.08
    const padY = (worldViewRect.maxY - worldViewRect.minY) * 0.08
    const cull = {
      minX: worldViewRect.minX - padX,
      maxX: worldViewRect.maxX + padX,
      minY: worldViewRect.minY - padY,
      maxY: worldViewRect.maxY + padY
    }

    ctx.save()
    ctx.lineJoin = 'bevel'
    ctx.lineCap = 'butt'
    ctx.lineWidth = 2
    ctx.strokeStyle = color
    ctx.beginPath()

    const wantPast = mode === 'past'
    let moved = false
    let lastSX = NaN,
      lastSY = NaN

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      const t = p.tSec ?? 0
      if (wantPast ? t > tSecCutoff : t < tSecCutoff) continue

      const wx = p.x + offX
      const wy = p.y + offY
      if (wx < cull.minX || wx > cull.maxX || wy < cull.minY || wy > cull.maxY) continue

      const { sx, sy } = fastWS(wx, wy)
      if (!moved) {
        ctx.moveTo(sx, sy)
        moved = true
        lastSX = sx
        lastSY = sy
        continue
      }
      const dx = sx - lastSX
      const dy = sy - lastSY
      if (dx * dx + dy * dy < minStepPx * minStepPx) continue
      ctx.lineTo(sx, sy)
      lastSX = sx
      lastSY = sy
    }

    if (moved) ctx.stroke()
    ctx.restore()
  }

  // screen-space 픽셀 고정 헬퍼
  function withScreenSpace(ctx, dpr, draw) {
    const _dpr = Number.isFinite(dpr) && dpr > 0 ? dpr : 1
    ctx.save()
    try {
      ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0)
      draw()
    } finally {
      ctx.restore()
    }
  }

  // Foxglove 스타일 로봇 삼각형
  const DRAW_ROBOT_TRIANGLE = true
  const ROBOT_TRI_FILL = '#2563EB'
  const ROBOT_TRI_STROKE = '#1E40AF'
  const ROBOT_TRI_HALO = 'rgba(255,255,255,0.95)'
  const ROBOT_TRI_LEN_PX = 28
  const ROBOT_TRI_BASE_PX = 18
  const ROBOT_TRI_LINE_W_PX = 2

  function drawRobotHeadingTriangle(ctx, { curPose, fastWS, dpr }) {
    if (!DRAW_ROBOT_TRIANGLE) return
    if (!curPose) return
    const { x, y } = curPose
    const yawWorld = Number(curPose.yaw) || 0
    const ROBOT_TRI_YAW_OFFSET = 0
    const yaw = -yawWorld + ROBOT_TRI_YAW_OFFSET

    ctx.save()
    try {
      if (!Number.isFinite(dpr) || dpr <= 0) dpr = 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const { sx: cx, sy: cy } = fastWS(x, y)

      const L = ROBOT_TRI_LEN_PX
      const W = ROBOT_TRI_BASE_PX
      const halfW = W * 0.5
      const centerOffset = -L * 0.25

      const tipLocal = { x: centerOffset + L * 0.5, y: 0 }
      const leftLocal = { x: centerOffset - L * 0.5, y: -halfW }
      const rightLocal = { x: centerOffset - L * 0.5, y: +halfW }

      const c = Math.cos(yaw)
      const s = Math.sin(yaw)
      const rot = (p) => ({ x: c * p.x - s * p.y, y: s * p.x + c * p.y })
      const tip = rot(tipLocal)
      const left = rot(leftLocal)
      const right = rot(rightLocal)

      const tipS = { sx: cx + tip.x, sy: cy + tip.y }
      const leftS = { sx: cx + left.x, sy: cy + left.y }
      const rightS = { sx: cx + right.x, sy: cy + right.y }

      // halo
      ctx.save()
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.strokeStyle = ROBOT_TRI_HALO
      ctx.lineWidth = ROBOT_TRI_LINE_W_PX + 2
      ctx.beginPath()
      ctx.moveTo(tipS.sx, tipS.sy)
      ctx.lineTo(rightS.sx, rightS.sy)
      ctx.lineTo(leftS.sx, leftS.sy)
      ctx.closePath()
      ctx.stroke()
      ctx.restore()

      // fill + stroke
      ctx.save()
      ctx.fillStyle = ROBOT_TRI_FILL
      ctx.beginPath()
      ctx.moveTo(tipS.sx, tipS.sy)
      ctx.lineTo(rightS.sx, rightS.sy)
      ctx.lineTo(leftS.sx, leftS.sy)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = ROBOT_TRI_STROKE
      ctx.lineWidth = ROBOT_TRI_LINE_W_PX
      ctx.stroke()
      ctx.restore()
    } catch {
    } finally {
      ctx.restore()
    }
  }

  // ─────────────────────────────────────────────
  // Patch 2: DWA Goal 설정/선택 함수 (render 밖, 1회 생성)
  // ─────────────────────────────────────────────
  const DWA_CFG = {
    DRAW: true,
    ALWAYS_NEAREST: true,
    HOLD_LAST_SEC: 10,
    NEAREST_SEC_BASE: 20,
    APPLY_BASE_FRAME: true,
    APPLY_POSE_YAW: false,
    DRAW_HEADING: true,

    COLOR: '#2563EB',
    HALO: 'rgba(255,255,255,0.95)',

    SIZE_MODE: 'screen',
    RADIUS_PX: 8,
    CROSS_HALF_PX: 6,
    LINE_W_PX: 2,
    ARROW_LEN_PX: 16,

    RADIUS_M: 0.14,
    CROSS_HALF_M: 0.09,
    LINE_W_M: 0.015,
    ARROW_LEN_M: 0.22
  }

  function pickDwaGoalRecord(series, curT, lastRec, cfg = DWA_CFG) {
    if (!Array.isArray(series) || series.length === 0) return null

    const tMin = series[0]?.tSec ?? 0
    const tMax = series[series.length - 1]?.tSec ?? 0
    const span = Math.max(0, tMax - tMin)
    const nearestLimit = Math.max(cfg.NEAREST_SEC_BASE, Math.min(120, Math.max(20, span * 0.05)))

    if (cfg.ALWAYS_NEAREST) {
      let best = null,
        bestAbs = Infinity
      for (let i = 0; i < series.length; i++) {
        const t = series[i]?.tSec
        if (!Number.isFinite(t)) continue
        const d = Math.abs(t - curT)
        if (d < bestAbs) {
          bestAbs = d
          best = series[i]
        }
      }
      if (best) return { rec: best, why: 'nearest*' }
    }

    let lo = 0,
      hi = series.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      const t = series[mid]?.tSec ?? -Infinity
      if (t <= curT) lo = mid + 1
      else hi = mid
    }

    const pastIdx = lo - 1
    if (pastIdx >= 0) {
      const recP = series[pastIdx]
      const dtP = curT - (recP.tSec ?? -Infinity)
      if (Number.isFinite(dtP) && dtP >= 0 && dtP <= cfg.HOLD_LAST_SEC) {
        return { rec: recP, why: 'past' }
      }
    }

    let best = null,
      bestAbs = Infinity
    for (let i = 0; i < series.length; i++) {
      const t = series[i]?.tSec
      if (!Number.isFinite(t)) continue
      const d = Math.abs(t - curT)
      if (d < bestAbs) {
        bestAbs = d
        best = series[i]
      }
    }
    if (best && bestAbs <= nearestLimit) return { rec: best, why: 'nearest' }

    if (lastRec) {
      const dtH = curT - (lastRec.tSec ?? -Infinity)
      if (Number.isFinite(dtH) && dtH >= 0 && dtH <= cfg.HOLD_LAST_SEC) {
        return { rec: lastRec, why: 'hold-last' }
      }
    }

    return null
  }

  // ─────────────────────────────────────────────
  // render() 반환
  // ─────────────────────────────────────────────
  return function render() {
    const cvs = canvasRef.current
    if (!cvs) return

    // DOM에서 제거된 캔버스라면 무의미한 RAF 루프를 만들지 않도록 그냥 종료
    if (!document.body.contains(cvs)) return

    const cssW = cvs.clientWidth | 0
    const cssH = cvs.clientHeight | 0
    if (cssW === 0 || cssH === 0) return

    // DPR & 기본 설정
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))
    if (cvs.width !== cssW * dpr || cvs.height !== cssH * dpr) {
      cvs.width = cssW * dpr
      cvs.height = cssH * dpr
    }
    const ctx = cvs.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    // 표시 옵션 (기본값 = 기존 동작 유지)
    const opt = renderOptionsRef?.current || {}
    const showTrajectory = opt.showTrajectory !== false
    const showPlannedPath = opt.showPlannedPath !== false
    const showCostmap = opt.showCostmap !== false
    const showGoalAndHeading = opt.showGoalAndHeading !== false

    const pts = Array.isArray(pathPointsRef.current) ? pathPointsRef.current : []
    const planned = Array.isArray(plannedPathPointsRef?.current) ? plannedPathPointsRef.current : []
    const grid = gridDataRef.current

    // DWA goal 시리즈 (정렬 보장) - Patch 3: WeakSet로 관리
    const goalsRaw = Array.isArray(dwaGoalsRef?.current) ? dwaGoalsRef.current : []
    let goals = goalsRaw
    if (goalsRaw.length > 1 && !_sortedSeries.has(goalsRaw)) {
      goals = goalsRaw.slice().sort((a, b) => (a.tSec ?? 0) - (b.tSec ?? 0))
      _sortedSeries.add(goalsRaw)
    }

    // 플레이 시간 계산
    let tSecCutoff = 0,
      duration = 0
    if (pts.length >= 2) {
      const t0 = pts[0].tSec ?? 0
      const t1 = pts[pts.length - 1].tSec ?? 0
      duration = t1 - t0
      const cur = Math.min(Math.max(0, playTimeSecRef.current), duration)
      tSecCutoff = t0 + cur
    }

    const padding = 24
    const fit = computeFit(grid, pts, cssW, cssH, padding)

    // view / zoom / pan / scale
    const v = smoothRef.current?.cur || viewRef.current
    const metersPerPixel = fit.metersPerPixelBase / Math.max(0.1, v.zoom)
    const scale = 1 / metersPerPixel

    const panX = v.panX
    const panY = v.panY
    const originX = fit.worldOrigin.x
    const originY = fit.worldOrigin.y

    // world -> screen (y-up)
    const fastWS = (x, y) => ({
      sx: originX + (x - panX) * scale,
      sy: originY - (y - panY) * scale
    })

    // LCM 디버그 정보
    let _LCM_DBG = { chosenWhy: 'none', fid: '', tx: 0, ty: 0, drawn: false, shift: 0 }

    // ─────────────────────────────────────────────
    // GRID (Patch 3: WeakMap 캐시)
    // ─────────────────────────────────────────────
    if (grid && grid.width > 0 && grid.height > 0 && grid.data) {
      const w = grid.width | 0
      const h = grid.height | 0
      // ✅ ImageBitmap(mcapLoader에서 사전 생성)이 있으면 즉시 사용 → 6s Violation 제거
      const gridSource = grid.imageBitmap || getOrBuildGridCanvas(grid)

      // yaw(라디안/도) 자동 감지
      let yaw = Number(grid.origin?.yaw) || 0
      if (Math.abs(yaw) > Math.PI * 2) yaw = (yaw * Math.PI) / 180

      const worldW = w * grid.resolution
      const worldH = h * grid.resolution

      let ox = Number(grid.origin?.x) || 0
      let oy = Number(grid.origin?.y) || 0
      if (HALF_CELL_FIX) {
        const hcell = 0.5 * grid.resolution
        ox += hcell
        oy += hcell
      }

      ctx.save()
      ctx.translate(originX, originY)
      ctx.scale(scale, -scale)
      ctx.translate(-panX, -panY)
      ctx.translate(ox, oy)
      if (yaw !== 0) ctx.rotate(yaw)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(gridSource, 0, 0, worldW, worldH)
      ctx.restore()

      if (SHOW_AXES) drawGridAxes(ctx, fastWS, ox, oy)
    }

    // ─────────────────────────────────────────────
    // LOCAL COSTMAP (Patch 3: timeShift/캔버스 캐시)
    // ─────────────────────────────────────────────
    if (showCostmap) {
      try {
        const frames = Array.isArray(localCostmapFramesRef?.current) ? localCostmapFramesRef.current : []
        const curT = tSecCutoff

        // Patch 3: frames._timeShiftSec 대신 WeakMap 캐시
        let lcmShift = 0
        if (frames && frames.length) {
          const cached = _seriesShiftCache.get(frames)
          if (cached && typeof cached.timeShiftSec === 'number') {
            lcmShift = cached.timeShiftSec
          } else {
            try {
              lcmShift = estimateSeriesTimeShiftSec(frames, pts, { samplesMax: 24, searchWindowSec: 10 })
            } catch {
              lcmShift = 0
            }
            _seriesShiftCache.set(frames, { timeShiftSec: lcmShift })
          }
        }
        const curT_forLCM = curT + lcmShift

        // 프레임 선택
        const pick = pickLocalCostmapFrame(frames, curT_forLCM, lastLocalCostmap)
        const chosenRec = pick?.rec ?? null
        const chosenWhy = pick?.why ?? 'none'
        const chosen = chosenRec?.grid || null

        // fallback (단일 cost 지원)
        const cost = chosen || localCostmapDataRef?.current
        if (cost && cost.width > 0 && cost.height > 0 && cost.data) {
          const w = cost.width | 0
          const h = cost.height | 0

          // Patch 3: WeakMap 기반 cost canvas
          const costCanvas = getOrBuildCostCanvas(cost)

          let yaw = Number(cost.origin?.yaw) || 0
          if (Math.abs(yaw) > Math.PI * 2) yaw = (yaw * Math.PI) / 180
          const worldW = w * cost.resolution
          const worldH = h * cost.resolution

          let cox = Number(cost.origin?.x) || 0
          let coy = Number(cost.origin?.y) || 0
          if (HALF_CELL_FIX) {
            const hcell = 0.5 * cost.resolution
            cox += hcell
            coy += hcell
          }

          const fidRaw = String(cost.frame_id || '').trim()
          const fid = fidRaw.replace(/^\/+/, '').toLowerCase()
          const isBase = fid === 'base' || fid === 'base_link' || fid === 'base_footprint'
          const isMap = fid === 'map'

          const poseNow = getPoseAtTime(pts, curT)

          let tx = cox,
            ty = coy,
            trot = yaw

          if (APPLY_BASE_FRAME_TRANSLATION && isBase && poseNow) {
            if (APPLY_POSE_YAW_FOR_BASE_FRAME && Number.isFinite(poseNow.yaw)) {
              const c = Math.cos(poseNow.yaw),
                s = Math.sin(poseNow.yaw)
              const rx = c * cox - s * coy
              const ry = s * cox + c * coy
              tx = poseNow.x + rx
              ty = poseNow.y + ry
              trot = yaw + poseNow.yaw
            } else {
              tx = poseNow.x + cox
              ty = poseNow.y + coy
            }
          } else if (isMap) {
            // no-op
          }

          const MAX_FRAME_AGE_SEC = 5
          const ageTooOld =
            chosenRec && Number.isFinite(chosenRec.tSec)
              ? Math.abs(chosenRec.tSec - curT_forLCM) > MAX_FRAME_AGE_SEC
              : false

          const skip = (Array.isArray(frames) && frames.length > 0 && !chosenRec) || ageTooOld

          if (!skip) {
            ctx.save()
            ctx.translate(originX, originY)
            ctx.scale(scale, -scale)
            ctx.translate(-panX, -panY)
            ctx.translate(tx, ty)
            if (trot !== 0) ctx.rotate(trot)
            ctx.imageSmoothingEnabled = false

            ctx.drawImage(costCanvas, 0, 0, worldW, worldH)

            // 기존 윤곽선(기존 동작 유지)
            ctx.save()
            ctx.lineWidth = Math.max(0.03, 0.002 * worldW)
            ctx.strokeStyle = 'rgba(0, 200, 220, 0.6)'
            ctx.setLineDash([0.2, 0.2])
            ctx.strokeRect(0, 0, worldW, worldH)
            ctx.restore()

            ctx.restore()
            _LCM_DBG.drawn = true
          } else if (ALWAYS_DRAW_OUTLINE) {
            ctx.save()
            ctx.translate(originX, originY)
            ctx.scale(scale, -scale)
            ctx.translate(-panX, -panY)
            ctx.translate(tx, ty)
            if (trot !== 0) ctx.rotate(trot)
            ctx.lineWidth = Math.max(0.03, 0.002 * worldW)
            ctx.strokeStyle = 'rgba(0, 200, 220, 0.35)'
            ctx.setLineDash([0.4, 0.4])
            ctx.strokeRect(0, 0, worldW, worldH)
            ctx.restore()
          }

          if (chosenRec && chosenWhy !== 'hold-last') {
            lastLocalCostmap = chosenRec
          }

          _LCM_DBG.chosenWhy = chosenWhy
          _LCM_DBG.fid = fid
          _LCM_DBG.tx = tx || 0
          _LCM_DBG.ty = ty || 0
          _LCM_DBG.shift = lcmShift || 0
        }
      } catch (err) {
        console.warn('[LCM] render error:', err)
      }
    }

    // ─────────────────────────────────────────────
    // 자동정합 오프셋 (기본 OFF) - 기존 로직 유지
    // ─────────────────────────────────────────────
    let autoDx = 0,
      autoDy = 0
    if (USE_AUTO_ALIGN && grid && pts.length >= 2) {
      let minX = +Infinity,
        maxX = -Infinity,
        minY = +Infinity,
        maxY = -Infinity
      for (const p of pts) {
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y)
        maxY = Math.max(maxY, p.y)
      }
      const pb = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }

      // gridOccupiedBounds는 파일 외부 함수라면 그대로 사용 중일 것
      // 여기서는 원본 코드 그대로 유지해야 하므로 호출만 남김
      // const gb = gridOccupiedBounds(grid, { occMin: 1, occMax: 100, sampleStep: 2 })
      // if (gb) { autoDx = gb.cx - pb.cx; autoDy = gb.cy - pb.cy; }
      // ※ 이 블록은 원본 코드에 gridOccupiedBounds가 존재한다는 전제.
      //   너의 파일에 이미 있으니 그대로 두면 됨.
      const gb =
        typeof gridOccupiedBounds === 'function'
          ? gridOccupiedBounds(grid, { occMin: 1, occMax: 100, sampleStep: 2 })
          : null
      if (gb) {
        autoDx = gb.cx - pb.cx
        autoDy = gb.cy - pb.cy
      }
    }
    const offX = autoDx
    const offY = autoDy

    // ─────────────────────────────────────────────
    // DWA Goal (Patch 2 적용: cfg/함수 재사용)
    // ─────────────────────────────────────────────
    if (showGoalAndHeading && DWA_CFG.DRAW) {
      // 시간축 쉬프트 자동 추정(기존 로직 유지)
      let goalTimeShiftSec = 0
      if (goals.length && pts.length) {
        const dt0 = (goals[0]?.tSec ?? 0) - (pts[0]?.tSec ?? 0)
        if (Number.isFinite(dt0) && Math.abs(dt0) > 5) goalTimeShiftSec = dt0
      }

      const curT_forGoal = tSecCutoff + goalTimeShiftSec
      const poseForGoal = getPoseAtTime(pts, curT_forGoal)

      try {
        const pick = pickDwaGoalRecord(goals, curT_forGoal, lastDwaGoal, DWA_CFG)
        const goal = pick?.rec || null
        if (!goal) throw new Error('no-goal')

        let gx = Number(goal.x) || 0
        let gy = Number(goal.y) || 0
        let gyaw = Number(goal.yaw) || 0
        const fid = String(goal.frame_id || '').toLowerCase()

        if (DWA_CFG.APPLY_BASE_FRAME && (fid.includes('base') || fid.includes('odom'))) {
          if (DWA_CFG.APPLY_POSE_YAW) {
            const c = Math.cos(poseForGoal.yaw),
              s = Math.sin(poseForGoal.yaw)
            const rx = c * gx - s * gy
            const ry = s * gx + c * gy
            gx = poseForGoal.x + rx
            gy = poseForGoal.y + ry
            gyaw = gyaw + poseForGoal.yaw
          } else {
            gx = poseForGoal.x + gx
            gy = poseForGoal.y + gy
          }
        }

        gx += offX
        gy += offY

        if (DWA_CFG.SIZE_MODE === 'screen') {
          withScreenSpace(ctx, dpr, () => {
            const { sx, sy } = fastWS(gx, gy)

            // halo
            ctx.beginPath()
            ctx.arc(sx, sy, DWA_CFG.RADIUS_PX + 2, 0, Math.PI * 2)
            ctx.fillStyle = DWA_CFG.HALO
            ctx.fill()

            // cross + circle
            ctx.strokeStyle = DWA_CFG.COLOR
            ctx.lineWidth = DWA_CFG.LINE_W_PX

            ctx.beginPath()
            ctx.moveTo(sx - DWA_CFG.CROSS_HALF_PX, sy)
            ctx.lineTo(sx + DWA_CFG.CROSS_HALF_PX, sy)
            ctx.moveTo(sx, sy - DWA_CFG.CROSS_HALF_PX)
            ctx.lineTo(sx, sy + DWA_CFG.CROSS_HALF_PX)
            ctx.stroke()

            ctx.beginPath()
            ctx.arc(sx, sy, DWA_CFG.RADIUS_PX, 0, Math.PI * 2)
            ctx.stroke()

            if (DWA_CFG.DRAW_HEADING && Number.isFinite(gyaw)) {
              const tipX = sx + Math.cos(gyaw) * DWA_CFG.ARROW_LEN_PX
              const tipY = sy + Math.sin(gyaw) * DWA_CFG.ARROW_LEN_PX
              ctx.beginPath()
              ctx.moveTo(sx, sy)
              ctx.lineTo(tipX, tipY)
              ctx.stroke()

              const headPx = 6
              ctx.beginPath()
              ctx.moveTo(tipX, tipY)
              ctx.lineTo(
                tipX + Math.cos(gyaw + Math.PI * 0.75) * headPx,
                tipY + Math.sin(gyaw + Math.PI * 0.75) * headPx
              )
              ctx.moveTo(tipX, tipY)
              ctx.lineTo(
                tipX + Math.cos(gyaw - Math.PI * 0.75) * headPx,
                tipY + Math.sin(gyaw - Math.PI * 0.75) * headPx
              )
              ctx.stroke()
            }
          })
        } else {
          ctx.save()
          ctx.translate(originX, originY)
          ctx.scale(scale, -scale)
          ctx.translate(-panX, -panY)

          ctx.beginPath()
          ctx.arc(gx, gy, DWA_CFG.RADIUS_M * 1.08, 0, Math.PI * 2)
          ctx.fillStyle = DWA_CFG.HALO
          ctx.fill()

          ctx.strokeStyle = DWA_CFG.COLOR
          ctx.lineWidth = DWA_CFG.LINE_W_M

          ctx.beginPath()
          ctx.moveTo(gx - DWA_CFG.CROSS_HALF_M, gy)
          ctx.lineTo(gx + DWA_CFG.CROSS_HALF_M, gy)
          ctx.moveTo(gx, gy - DWA_CFG.CROSS_HALF_M)
          ctx.lineTo(gx, gy + DWA_CFG.CROSS_HALF_M)
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(gx, gy, DWA_CFG.RADIUS_M, 0, Math.PI * 2)
          ctx.stroke()

          if (DWA_CFG.DRAW_HEADING && Number.isFinite(gyaw)) {
            const tipX = gx + Math.cos(gyaw) * DWA_CFG.ARROW_LEN_M
            const tipY = gy + Math.sin(gyaw) * DWA_CFG.ARROW_LEN_M
            ctx.beginPath()
            ctx.moveTo(gx, gy)
            ctx.lineTo(tipX, tipY)
            ctx.stroke()
            const head = 0.06
            ctx.beginPath()
            ctx.moveTo(tipX, tipY)
            ctx.lineTo(tipX + Math.cos(gyaw + Math.PI * 0.75) * head, tipY + Math.sin(gyaw + Math.PI * 0.75) * head)
            ctx.moveTo(tipX, tipY)
            ctx.lineTo(tipX + Math.cos(gyaw - Math.PI * 0.75) * head, tipY + Math.sin(gyaw - Math.PI * 0.75) * head)
            ctx.stroke()
          }

          ctx.restore()
        }

        if (pick?.why !== 'hold-last') lastDwaGoal = goal
      } catch {
        // no-op (기존 동작 유지)
      }
    }

    // ─────────────────────────────────────────────
    // 현재 프레임에서 마커/현재 포즈 (Patch 1 적용)
    // ─────────────────────────────────────────────
    let markerPos = null
    let curPose = null

    if (pts.length >= 2) {
      const viewRect = getWorldViewRect(cssW, cssH, originX, originY, panX, panY, scale)

      // Trajectory = 지나온 경로(초록)
      if (showTrajectory) {
        drawPolylineLOD(ctx, pts, {
          mode: 'past',
          color: '#10B981',
          tSecCutoff,
          zoom: v.zoom,
          offX,
          offY,
          fastWS,
          worldViewRect: viewRect
        })
      }

      // Planned Path = 남은 경로(회색) (현재 구현상 future trajectory)
      if (showPlannedPath) {
        drawPolylineLOD(ctx, pts, {
          mode: 'future',
          color: '#9CA3AF',
          tSecCutoff,
          zoom: v.zoom,
          offX,
          offY,
          fastWS,
          worldViewRect: viewRect
        })
      }

      const poseNow = getPoseAtTime(pts, tSecCutoff)
      const { sx, sy } = fastWS(poseNow.x + offX, poseNow.y + offY)
      markerPos = { sx, sy }
      curPose = { x: poseNow.x + offX, y: poseNow.y + offY, yaw: poseNow.yaw }
    }

    // ─────────────────────────────────────────────
    // 계획 경로 (기존 로직 유지)
    // ─────────────────────────────────────────────
    if (showPlannedPath && planned.length >= 2) {
      ctx.save()
      ctx.strokeStyle = 'rgba(0,160,255,0.9)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 6])
      ctx.beginPath()

      const step = planned.length > 6000 ? 3 : planned.length > 3000 ? 2 : 1
      let moved = false
      for (let i = 0; i < planned.length; i += step) {
        const p = planned[i]
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
        const { sx, sy } = fastWS(p.x + offX, p.y + offY)
        if (!moved) {
          ctx.moveTo(sx, sy)
          moved = true
        } else ctx.lineTo(sx, sy)
      }
      if (moved) ctx.stroke()
      ctx.restore()
    }

    // ─────────────────────────────────────────────
    // 현재 위치 마커 (항상 마지막)
    // ─────────────────────────────────────────────
    if (markerPos) {
      if (curPose) {
        drawRobotHeadingTriangle(ctx, { curPose, fastWS, dpr })
      }
    }

    // 디버그 정보
    if (DEBUG_OVERLAY) {
      try {
        ctx.save()
        ctx.font = '11px ui-monospace, Menlo, Consolas, monospace'
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        const _framesN = Array.isArray(localCostmapFramesRef?.current) ? localCostmapFramesRef.current.length : 0
        const line = `LCM: frames=${_framesN} drawn=${_LCM_DBG.drawn ? 'Y' : 'N'} why=${_LCM_DBG.chosenWhy} fid=${_LCM_DBG.fid.slice(
          0,
          10
        )} tx=${_LCM_DBG.tx.toFixed(2)} ty=${_LCM_DBG.ty.toFixed(2)} shift=${(_LCM_DBG.shift || 0).toFixed(2)}`
        ctx.fillText(line, 8, cssH - 8)
        ctx.restore()
      } catch {}
    }
  }
}
