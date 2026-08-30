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
  localCostmapFramesRef,
  playTimeSecRef,
  viewRef,
  smoothRef
}) {
  // ── 디버그 HUD/축/로그 토글 (운영 기본 OFF) ───────────────────────
  const DEBUG_OVERLAY = false // 좌상단/우하단 디버그 텍스트
  const SHOW_AXES = false // 그리드 좌표축(+X=red, +Y=blue) 오버레

  // 최근 표시한 Local Costmap 프레임(hold-last용)
  let lastLocalCostmap = null // { grid, tSec }

  // ─────────────────────────────────────────────
  // 렌더 설정 토글
  // ─────────────────────────────────────────────
  const USE_AUTO_ALIGN = false // 동일 프레임(map) 확실 -> false 권장
  const HALF_CELL_FIX = false // origin이 셀 중심 기록된 로그가 있을 때 true로 테스트

  // ── Local Costmap 정책(추가/조정) ─────────────────────────────

  const MAX_FRAME_DELTA_SEC = 0.9 // 과거 최신 허용 시차
  const HOLD_LAST_SEC = 15 // 🔼 프레임 공백이 긴 로그(B)에 맞춰 확장
  const FUTURE_WARMUP_SEC = 0.5 // 🔼 경계에서 가까운 미래 허용 폭 소폭 확장
  const RELAXED_PICK = true // 🔛 완화 모드 on
  const MAX_NEAREST_SEC = 30 // 🔛 최장 30초까지 '가까운 프레임' 강제 선택

  const APPLY_BASE_FRAME_TRANSLATION = true
  const APPLY_POSE_YAW_FOR_BASE_FRAME = false

  // ※ 윤곽만 보이는 문제를 줄이기 위해 기본은 false
  const ALWAYS_DRAW_OUTLINE = false // 🔒 이미지 없으면 **윤곽도** 그리지 않음(윤곽선만 보이는 케이스 제거)
  const SHOW_FREE_TINT = true // v=0도 아주 옅게 보이게(권장)

  // ── map 프레임 스냅(선택) ─────────────────────────────────────
  // 로컬창(작은 창)인데 frame_id가 "map"이며 창 중심이 로봇에서 멀리 떨어졌으면
  // 로봇 주변으로 스냅시키는 휴리스틱 (필요시 false로 꺼도 됨)
  const ENABLE_SNAP_FOR_MAP_LCM = true
  const SNAP_ONLY_WHEN_SMALL_M = 6.0 // 창의 가로/세로가 이 값(m)보다 작으면 로컬로 간주
  const SNAP_MAX_DIST_M = 3.0 // 창센터–로봇 거리가 이 값(m) 이상이면 스냅

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
  // [REPLACE] 로컬 코스트맵 색 팔레트: 저코스트=시안(옅음) → 고코스트=마젠타(진함)
  function buildCostPalette() {
    // 0..100까지만 사용. 0은 완전 투명, 255(unknown)도 투명.
    const pal = new Array(256).fill(0).map(() => [0, 0, 0, 0])

    // ※ 필요 시 0 값을 아주 옅게 보이게 하고 싶다면 아래 한 줄 주석 해제
    if (SHOW_FREE_TINT) {
      pal[0] = [0, 180, 200, 14] // free도 아주 희미하게 (원하면 알파 10~16 조절)
    }

    // 기본은 255=unknown 투명. (아래에서 옵션으로 장애물 취급 가능)
    pal[255] = [0x80, 0x80, 0x80, 0]

    // 저비용(가까운 free/낮은 inflation): 시안톤(청록)으로 아주 옅게
    // 중간 비용: 보라/핑크로 점차 전환
    // 고비용(장애물에 가까움): 마젠타에 가깝게 + 알파 강하게
    for (let v = 1; v <= 100; v++) {
      const t = v / 100 // 0→저비용, 1→고비용

      // 색상 보간: 시안(0, 200, 220) → 마젠타(235, 0, 235)
      const c0 = { r: 0, g: 200, b: 220 } // 저비용
      const c1 = { r: 235, g: 0, b: 235 } // 고비용

      const r = Math.round(c0.r * (1 - t) + c1.r * t)
      const g = Math.round(c0.g * (1 - t) + c1.g * t)
      const b = Math.round(c0.b * (1 - t) + c1.b * t)

      // 알파: 저비용은 거의 투명, 고비용은 선명 (최대 210 정도로 과도한 불투명 방지)
      // 시각적으로 0~100의 하위대역(0~20)은 거의 안 보이게, 60 이상부터 존재감 있게
      let a = 0
      if (v < 20)
        a = Math.round(10 + t * 40) // 10~18 정도
      else if (v < 60)
        a = Math.round(30 + (t - 0.2) * 120) // 30~78 정도
      else a = Math.round(80 + (t - 0.6) * 130) // 80~~210

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

  // [ADD] 현재 캔버스에 보이는 월드 직사각형 (y-up 좌표계 기준)
  function getWorldViewRect(cssW, cssH, originX, originY, panX, panY, scale) {
    // 스크린(0,0)과 (W,H)에 해당하는 월드 좌표
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
  function getPoseAtTime(pts, tSecCutoff) {
    if (!Array.isArray(pts) || pts.length === 0) return { x: 0, y: 0, yaw: 0 }
    // 이진 탐색으로 tSecCutoff 이하 최댓값 인덱스
    let lo = 0,
      hi = pts.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if ((pts[mid].tSec ?? 0) <= tSecCutoff) lo = mid + 1
      else hi = mid
    }
    const idx = lo - 1
    let curX, curY
    if (idx <= -1) {
      curX = pts[0].x
      curY = pts[0].y
    } else if (idx >= pts.length - 1) {
      curX = pts[pts.length - 1].x
      curY = pts[pts.length - 1].y
    } else {
      const a = pts[idx],
        b = pts[idx + 1]
      const ta = a.tSec ?? 0,
        tb = b.tSec ?? 0
      const tt = (tSecCutoff - ta) / Math.max(1e-9, tb - ta)
      curX = a.x + (b.x - a.x) * tt
      curY = a.y + (b.y - a.y) * tt
    }
    const yaw = idx >= 0 ? Number(pts[Math.min(idx, pts.length - 1)]?.yaw) || 0 : 0
    return { x: curX, y: curY, yaw }
  }

  /**
   * frames: [{tSec, grid}, ...] 시간 오름차순 가정
   * curT: 현재 재생 시각
   * lastRec: 직전에 그린 프레임(hold-last용)
   * 반환: { rec, why } | null
   */
  function pickLocalCostmapFrame(frames, curT, lastRec) {
    if (!Array.isArray(frames) || frames.length === 0) {
      // 스트리밍 프레임 자체가 아직 없음 → null (fallback은 렌더 구간에서 처리)
      return null
    }

    // curT 이하에서 가장 최근 인덱스 (lower_bound)
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

    // 1) 과거 최신 Δt 검사
    if (pastIdx >= 0) {
      const recP = frames[pastIdx]
      const dtP = curT - recP.tSec
      if (Number.isFinite(dtP) && dtP <= MAX_FRAME_DELTA_SEC) {
        return { rec: recP, why: 'past' }
      }
    }

    // 2) 가까운 미래 워밍업
    if (futureIdx < frames.length) {
      const recF = frames[futureIdx]
      const dtF = recF.tSec - curT
      if (Number.isFinite(dtF) && dtF <= FUTURE_WARMUP_SEC) {
        return { rec: recF, why: 'future-warmup' }
      }
    }

    // 3) 홀드-라스트
    if (lastRec) {
      const dtH = curT - lastRec.tSec
      if (Number.isFinite(dtH) && dtH >= 0 && dtH <= HOLD_LAST_SEC) {
        return { rec: lastRec, why: 'hold-last' }
      }
    }

    // 4) (옵션) 완화: 가장 가까운 프레임을 MAX_NEAREST_SEC 이내면 선택
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
    // cost: {width,height,resolution,origin:{x,y}, ...}
    const worldW = (cost.width | 0) * cost.resolution
    const worldH = (cost.height | 0) * cost.resolution
    if (!ENABLE_SNAP_FOR_MAP_LCM) return null
    if (!(worldW > 0 && worldH > 0)) return null
    if (!(Math.min(worldW, worldH) <= SNAP_ONLY_WHEN_SMALL_M)) return null

    const cx = (Number(cost.origin?.x) || 0) + worldW * 0.5
    const cy = (Number(cost.origin?.y) || 0) + worldH * 0.5
    const dx = (poseNow?.x ?? 0) - cx
    const dy = (poseNow?.y ?? 0) - cy
    const dist = Math.hypot(dx, dy)

    if (dist >= SNAP_MAX_DIST_M) {
      // 창을 로봇 중심으로 스냅: 좌하단(origin)을 로봇-반폭/반높이로 이동
      return {
        tx: (poseNow?.x ?? 0) - worldW * 0.5,
        ty: (poseNow?.y ?? 0) - worldH * 0.5,
        trot: Number(cost.origin?.yaw) || 0,
        snapped: true
      }
    }
    return null
  }
  // [ADD] 경로를 '보이는 영역만' 그리고, '화면-픽셀 간격' 기준으로 점을 줄이는 LOD 드로잉
  function drawPolylineLOD(
    ctx,
    pts,
    {
      mode, // 'past' | 'future'
      color,
      tSecCutoff,
      zoom,
      offX = 0,
      offY = 0,
      fastWS,
      worldViewRect
    }
  ) {
    if (!Array.isArray(pts) || pts.length < 2) return

    // 줌이 커질수록 화면에서 최소 점 간격을 더 크게 요구 → 그려야 할 세그먼트 수를 제한
    const minStepPx = Math.max(1.25, 0.9 + 0.9 * zoom) // z=1→~1.8px, z=3→~3.6px 정도
    // 화면 밖 한가운데서 끊어지지 않도록, 보이는 영역을 살짝 확장해서 그리기
    const padX = (worldViewRect.maxX - worldViewRect.minX) * 0.08
    const padY = (worldViewRect.maxY - worldViewRect.minY) * 0.08
    const cull = {
      minX: worldViewRect.minX - padX,
      maxX: worldViewRect.maxX + padX,
      minY: worldViewRect.minY - padY,
      maxY: worldViewRect.maxY + padY
    }

    ctx.save()
    // round join/cap은 비용이 큽니다 → bevel/butt로 교체 (시각적 차이는 미미, 성능은 향상)
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
      if (dx * dx + dy * dy < minStepPx * minStepPx) continue // 화면-픽셀 기준 디시메이션
      ctx.lineTo(sx, sy)
      lastSX = sx
      lastSY = sy
    }

    if (moved) ctx.stroke()
    ctx.restore()
  }

  return function render() {
    const cvs = canvasRef.current
    if (!cvs) return
    if (!document.body.contains(cvs)) {
      requestAnimationFrame(render)
      return
    }

    const cssW = cvs.clientWidth | 0
    const cssH = cvs.clientHeight | 0
    if (cssW === 0 || cssH === 0) {
      requestAnimationFrame(render)
      return
    }

    // ─────────────────────────────────────────────
    // DPR & 기본 설정
    // ─────────────────────────────────────────────
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))
    if (cvs.width !== cssW * dpr || cvs.height !== cssH * dpr) {
      cvs.width = cssW * dpr
      cvs.height = cssH * dpr
    }
    const ctx = cvs.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const pts = Array.isArray(pathPointsRef.current) ? pathPointsRef.current : []
    const planned = Array.isArray(plannedPathPointsRef?.current) ? plannedPathPointsRef.current : []
    const grid = gridDataRef.current

    // ─────────────────────────────────────────────
    // 플레이 시간 계산
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // view / zoom / pan / scale
    // ─────────────────────────────────────────────
    const v = smoothRef.current?.cur || viewRef.current
    const metersPerPixel = fit.metersPerPixelBase / Math.max(0.1, v.zoom)
    const scale = 1 / metersPerPixel

    const panX = v.panX
    const panY = v.panY

    const originX = fit.worldOrigin.x
    const originY = fit.worldOrigin.y

    // world -> screen (y-업 좌표계 가정)
    const fastWS = (x, y) => ({
      sx: originX + (x - panX) * scale,
      sy: originY - (y - panY) * scale
    })

    // ─────────────────────────────────────────────
    // GRID 오프스크린 캐싱 (중복 플립 제거)
    // ─────────────────────────────────────────────
    if (grid && grid.width > 0 && grid.height > 0 && grid.data) {
      const w = grid.width | 0
      const h = grid.height | 0

      // 캐시 무효화 조건
      const needRebuild =
        !grid._cachedCanvas ||
        grid._cachedCanvas.width !== w ||
        grid._cachedCanvas.height !== h ||
        grid._cachedVersion !== (grid.data?.length || 0) ||
        grid._cachedResolution !== grid.resolution

      if (needRebuild) {
        const off = document.createElement('canvas')
        off.width = w
        off.height = h

        const octx = off.getContext('2d', { willReadFrequently: false })
        const img = octx.createImageData(w, h)
        const dst = img.data

        // data -> Uint8Array
        let u8 = null
        const src = grid.data
        if (src instanceof Uint8Array) u8 = src
        else if (ArrayBuffer.isView(src)) u8 = new Uint8Array(src.buffer, src.byteOffset, src.byteLength)
        else if (Array.isArray(src)) u8 = Uint8Array.from(src)
        else if (src instanceof ArrayBuffer) u8 = new Uint8Array(src)

        if (u8 && u8.length >= w * h) {
          // ★ 오프스크린에서는 더 이상 y-뒤집기 하지 않음 (dy=y)

          // 🔧 로그에 따라 row0이 Top-Left(이미지 좌상단) 기준인 경우가 있음
          const DATA_TOPLEFT = true // ← 우선 true로 테스트 (맞으면 나중에 옵션화)
          for (let y = 0; y < h; y++) {
            const sy = y
            const dy = DATA_TOPLEFT ? h - 1 - y : y // ← Top-Left면 한 번 뒤집기
            for (let x = 0; x < w; x++) {
              const v0 = u8[sy * w + x]
              const di = (dy * w + x) * 4

              if (v0 === 255) {
                // unknown: 투명
                dst[di] = 0x80
                dst[di + 1] = 0x80
                dst[di + 2] = 0x80
                dst[di + 3] = 0
              } else {
                // 0..100 → 맵(밝음=빈공간, 어두움=장애물)
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

        grid._cachedCanvas = off
        grid._cachedVersion = grid.data?.length || 0
        grid._cachedResolution = grid.resolution
      }

      // yaw(라디안/도) 자동 감지
      let yaw = Number(grid.origin?.yaw) || 0
      if (Math.abs(yaw) > Math.PI * 2) {
        // 흔한 deg 기록 방지
        yaw = (yaw * Math.PI) / 180
      }

      // 월드 크기(m)
      const worldW = w * grid.resolution
      const worldH = h * grid.resolution

      // origin + 반 셀 보정(옵션)
      let ox = Number(grid.origin?.x) || 0
      let oy = Number(grid.origin?.y) || 0
      if (HALF_CELL_FIX) {
        const hcell = 0.5 * grid.resolution
        ox += hcell
        oy += hcell
      }

      // 월드 좌표로 드로우 (이 단계에서만 y-업 변환)
      ctx.save()
      ctx.translate(originX, originY)
      ctx.scale(scale, -scale)
      ctx.translate(-panX, -panY)
      ctx.translate(ox, oy)
      if (yaw !== 0) ctx.rotate(yaw)
      ctx.imageSmoothingEnabled = false

      ctx.drawImage(grid._cachedCanvas, 0, 0, worldW, worldH)
      ctx.restore()

      if (SHOW_AXES) {
        drawGridAxes(ctx, fastWS, ox, oy)
      }
    }

    // ─────────────────────────────────────────────
    // LOCAL COSTMAP (반투명 레이어) — OccupancyGrid time-series
    // ─────────────────────────────────────────────
    {
      const frames = Array.isArray(localCostmapFramesRef?.current) ? localCostmapFramesRef.current : []
      const curT = tSecCutoff

      // 1) 프레임 선택
      const pick = pickLocalCostmapFrame(frames, curT, lastLocalCostmap)
      const chosenRec = pick?.rec ?? null
      const chosenWhy = pick?.why ?? 'none'
      const chosen = chosenRec?.grid || null

      // 2) fallback (단일 cost 지원)
      const cost = chosen || localCostmapDataRef?.current
      if (!(cost && cost.width > 0 && cost.height > 0 && cost.data)) {
        // 아무것도 없음 → 코스트맵 레이어만 스킵 (그리드/경로/마커는 계속)
        // 윤곽도 그리지 않음(ALWAYS_DRAW_OUTLINE=false)
        // (원하면 여기서 작은 HUD 텍스트를 표시할 수 있음)
      } else {
        // (A) 오프스크린 팔레트 캐시 (기존 로직 유지)
        const w = cost.width | 0
        const h = cost.height | 0
        const needRebuild =
          !cost._cachedCostCanvas ||
          cost._cachedCostCanvas.width !== w ||
          cost._cachedCostCanvas.height !== h ||
          cost._cachedCostVersion !== (cost.data?.length || 0) ||
          cost._cachedCostResolution !== cost.resolution

        if (needRebuild) {
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
          cost._cachedCostCanvas = off
          cost._cachedCostVersion = cost.data?.length || 0
          cost._cachedCostResolution = cost.resolution
        }

        // (B) 좌표계 보정
        let yaw = Number(cost.origin?.yaw) || 0
        if (Math.abs(yaw) > Math.PI * 2) yaw = (yaw * Math.PI) / 180
        const worldW = (cost.width | 0) * cost.resolution
        const worldH = (cost.height | 0) * cost.resolution

        let cox = Number(cost.origin?.x) || 0
        let coy = Number(cost.origin?.y) || 0
        if (HALF_CELL_FIX) {
          const hcell = 0.5 * cost.resolution
          cox += hcell
          coy += hcell
        }

        const frameId = String(cost.frame_id || '').toLowerCase()
        const poseNow = getPoseAtTime(pts, curT)
        let tx = cox,
          ty = coy,
          trot = yaw

        if (APPLY_BASE_FRAME_TRANSLATION && (frameId.includes('base') || frameId.includes('odom'))) {
          if (APPLY_POSE_YAW_FOR_BASE_FRAME) {
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
        } else if (frameId.includes('map') && ENABLE_SNAP_FOR_MAP_LCM) {
          const snap = maybeSnapMapLocal(cost, poseNow)
          if (snap?.snapped) {
            tx = snap.tx
            ty = snap.ty
            trot = snap.trot
          }
        }

        // (C) 그리기 (스킵 시 윤곽도 그리지 않음)
        const skip = Array.isArray(frames) && frames.length > 0 && !chosenRec
        if (!skip) {
          ctx.save()
          ctx.translate(originX, originY)
          ctx.scale(scale, -scale)
          ctx.translate(-panX, -panY)
          ctx.translate(tx, ty)
          if (trot !== 0) ctx.rotate(trot)
          ctx.imageSmoothingEnabled = false

          // 이미지
          ctx.drawImage(cost._cachedCostCanvas, 0, 0, worldW, worldH)
          // ── [복원] 로컬 코스트맵 윤곽(점선) — 예전 방식 그대로 (월드 단위) ──
          ctx.save()
          ctx.lineWidth = Math.max(0.03, 0.002 * worldW) // 월드 단위 두께(맵 크기에 비례)
          ctx.strokeStyle = 'rgba(0, 200, 220, 0.6)' // 범례의 시안 계열
          ctx.setLineDash([0.2, 0.2]) // 월드 단위 점선 간격(0.4m)
          ctx.strokeRect(0, 0, worldW, worldH)
          ctx.restore()

          ctx.restore()
        } else if (ALWAYS_DRAW_OUTLINE) {
          // 원한다면 윤곽만
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

        // (D) hold-last 캐시 업데이트
        if (chosenRec && chosenWhy !== 'hold-last') {
          lastLocalCostmap = chosenRec
        }
      }
    }
    // ─────────────────────────────────────────────
    // 자동정합 오프셋 (기본 OFF)
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
      const gb = gridOccupiedBounds(grid, { occMin: 1, occMax: 100, sampleStep: 2 })
      if (gb) {
        autoDx = gb.cx - pb.cx
        autoDy = gb.cy - pb.cy
      }
    }
    const offX = autoDx
    const offY = autoDy

    // ─────────────────────────────────────────────
    // 현재 프레임에서 화면 좌표로 환산된 마커 위치 (마지막에 그리기 위함)
    // + 현재 로봇 pose(yaw 포함)도 같이 확보 (frame 변환용)
    // ─────────────────────────────────────────────
    let markerPos = null
    let curPose = null // {x,y,yaw}

    // ─────────────────────────────────────────────
    // 실제 주행 경로 (가시영역 컬링 + 화면-공간 LOD)
    // ─────────────────────────────────────────────
    if (pts.length >= 2) {
      // 현재 프레임의 화면에 보이는 월드 영역 계산
      const viewRect = getWorldViewRect(cssW, cssH, originX, originY, panX, panY, scale)

      // 과거/미래를 각각 한 번씩만 그립니다.
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

      // 현재 위치(보간) — 기존 로직 유지
      let idx = 0
      {
        let lo = 0,
          hi = pts.length
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if ((pts[mid].tSec ?? 0) <= tSecCutoff) lo = mid + 1
          else hi = mid
        }
        idx = lo - 1
      }

      let curX, curY
      if (idx <= -1) {
        curX = pts[0].x
        curY = pts[0].y
      } else if (idx >= pts.length - 1) {
        curX = pts[pts.length - 1].x
        curY = pts[pts.length - 1].y
      } else {
        const a = pts[idx],
          b = pts[idx + 1]
        const ta = a.tSec ?? 0,
          tb = b.tSec ?? 0
        const tt = (tSecCutoff - ta) / Math.max(1e-9, tb - ta)
        curX = a.x + (b.x - a.x) * tt
        curY = a.y + (b.y - a.y) * tt
      }

      const { sx, sy } = fastWS(curX + offX, curY + offY)
      markerPos = { sx, sy }

      // yaw도 같이 확보 (로봇 헤딩)
      let yawNow = 0
      if (idx >= 0) {
        yawNow = Number(pts[Math.min(idx, pts.length - 1)]?.yaw) || 0
      }
      curPose = { x: curX + offX, y: curY + offY, yaw: yawNow }
    }

    // ─────────────────────────────────────────────
    // 계획 경로 (마커보다 먼저)
    // ─────────────────────────────────────────────
    if (planned.length >= 2) {
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
      // halo
      ctx.save()
      ctx.beginPath()
      ctx.arc(markerPos.sx, markerPos.sy, 6, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fill()
      ctx.restore()

      // 본체
      ctx.beginPath()
      ctx.fillStyle = '#EF4444'
      ctx.arc(markerPos.sx, markerPos.sy, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // 디버그 정보 (토글로 제어)
    if (DEBUG_OVERLAY) {
      try {
        ctx.save()
        ctx.font = '11px ui-monospace, Menlo, Consolas, monospace'
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillText(
          `LCM: frames=${
            Array.isArray(localCostmapFramesRef?.current) ? localCostmapFramesRef.current.length : 0
          } why=${chosenWhy} fid=${String(cost?.frame_id || '').slice(0, 10)} tx=${(tx ?? 0).toFixed(2)} ty=${(ty ?? 0).toFixed(2)}`,
          8,
          cssH - 8
        )
        ctx.restore()
      } catch {}

      try {
        ctx.font = '12px ui-monospace, Menlo, Consolas, monospace'
        ctx.fillStyle = 'rgba(0,0,0,0.7)'

        const yawDbg = (() => {
          let y = Number(grid?.origin?.yaw) || 0
          if (Math.abs(y) > Math.PI * 2) y = (y * Math.PI) / 180
          return y
        })()

        const lines = [
          `pts=${pts.length} planned=${planned.length}`,
          `mpp=${metersPerPixel.toFixed(4)} zoom=${v.zoom.toFixed(2)}`,
          grid ? `grid: w=${grid.width} h=${grid.height} res=${grid.resolution.toFixed(3)}` : `grid: (none)`,
          grid
            ? `origin=(${(grid.origin?.x || 0).toFixed(3)}, ${(grid.origin?.y || 0).toFixed(3)}) yaw=${yawDbg.toFixed(3)}rad`
            : `origin=(0,0) yaw=0`,
          `off=(dx=${offX.toFixed(3)}, dy=${offY.toFixed(3)}) halfCell=${HALF_CELL_FIX ? 'on' : 'off'}`
        ]
        let y = 14
        for (const t of lines) {
          ctx.fillText(t, 8, y)
          y += 14
        }
      } catch {}
    }
  }
}
