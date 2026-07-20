import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { extractPathPointsFromMsgs, downsampleByDistance, makeTransforms } from '../mcap/coverageStrip'
import { SmoothViewController } from '../view2d'

export default function CoveragePanel({
  className = '',
  style = {},

  // 데이터
  grid,
  pathPoints = [],
  trackedposeMsgs = [],
  pathMsgs = [],

  // 외관(블랙 테마)
  background = '#0D1117',
  fillColor = 'rgba(156,163,175,0.32)',
  edgeDark = 'rgba(0,0,0,0.65)',
  edgeLight = 'rgba(255,255,255,0.28)',
  centerLineColor = '#9FE3FC',

  // 마스크/채움
  brushWidthM = 0.44,
  dsMinDistM = 0.05,
  useClosing = true,
  closeBlurPx = 2.0,
  closeThreshold = 95,

  // 외곽선 고정 px(얇게)
  edgeOuterPx = 1.0,
  edgeInnerPx = 0.7,

  // 화살표
  arrowEveryMeters = 2.1,
  arrowSizePx = 5,
  arrowFill = '#0B0F14',
  arrowStroke = '#A5F3FC',
  arrowStrokeWidth = 0.8,

  // 플레이 동기
  currentTimestampMs,
  durationMs,
  msToClock,
  followPlay = true,

  // 로딩/게이팅
  loadPhase = 'loading',
  isLoadingLogs = false,
  minSamples = 150,
  minSeconds = 3.0,

  // 맞춤 옵션
  fitMode = 'grid', // 'grid' | 'path'
  autoFitOnData = true,
  padPx = 24,

  showDebugLabel = false,
  overlayTextInit = 'mcap 파일 선택 후 조회 버튼을 눌러주세요',
  centerOnReady = true
}) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  // 1) 경로 포인트 준비
  const allPoints = useMemo(() => {
    let pts
    if (Array.isArray(pathPoints) && pathPoints.length >= 2) {
      pts = pathPoints
    } else {
      pts = extractPathPointsFromMsgs({ trackedposeMsgs, pathMsgs })
    }
    const clean = (pts || [])
      .map((p) => ({ x: +p.x, y: +p.y, t: +(p.tSec ?? p.t ?? 0) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    return downsampleByDistance(clean, dsMinDistM)
  }, [pathPoints, trackedposeMsgs, pathMsgs, dsMinDistM])

  // followPlay: 현재 시점까지
  const points = useMemo(() => {
    if (!Array.isArray(allPoints) || allPoints.length < 2) return []
    if (!followPlay || typeof currentTimestampMs !== 'number' || !isFinite(currentTimestampMs)) {
      return allPoints
    }
    const tMax = currentTimestampMs / 1000
    let i = 1
    while (i < allPoints.length && (allPoints[i].t ?? 0) <= tMax) i++
    return allPoints.slice(0, Math.max(2, i))
  }, [allPoints, followPlay, currentTimestampMs])

  // 준비됨 판단
  const isReadyByData = useMemo(() => {
    if (!Array.isArray(allPoints) || allPoints.length < 2) return false
    const sampleOK = allPoints.length >= minSamples
    const durSec = Math.max(0, allPoints[allPoints.length - 1].t - allPoints[0].t || 0)
    const timeOK = durSec >= minSeconds
    return sampleOK || timeOK
  }, [allPoints, minSamples, minSeconds])

  // 인터랙션/표시 가능 여부(완전 준비)
  const isInteractiveReady = loadPhase === 'ready' && !isLoadingLogs && isReadyByData

  // 2) 캔버스 리사이즈
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      const w = Math.max(10, Math.floor(rect.width))
      const h = Math.max(10, Math.floor(rect.height))
      setCanvasSize((old) => (old.w !== w || old.h !== h ? { w, h } : old))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 3) view(줌/팬) + 스무딩
  const [view, setView] = useState({ zoom: 1, panX: 0, panY: 0 })
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  const smoothRef = useRef(new SmoothViewController(view))
  const smoothRafRef = useRef(0)

  const interactingUntilRef = useRef(0)
  const markInteracting = (ms = 160) => {
    interactingUntilRef.current = performance.now() + ms
  }
  const isInteractingNow = () => performance.now() < interactingUntilRef.current

  useEffect(() => {
    const tick = () => {
      if (!isInteractingNow()) {
        const s = smoothRef.current
        s.setTarget(viewRef.current)
        const changed = s.step(0.18)
        if (changed) renderReq()
      }
      smoothRafRef.current = requestAnimationFrame(tick)
    }
    smoothRafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(smoothRafRef.current)
  }, [])

  // 4) fit 계산 (grid + path 경계 → 중앙 정렬, path 모드 보정 포함)
  const fit = useMemo(() => {
    const cssW = canvasSize.w | 0
    const cssH = canvasSize.h | 0
    if (cssW <= 0 || cssH <= 0) return { scale: 1, offsetX: 0, offsetY: 0, basis: 'none' }

    // ── 경로 경계
    let pMinX = +Infinity,
      pMinY = +Infinity,
      pMaxX = -Infinity,
      pMaxY = -Infinity
    const hasPoints = Array.isArray(allPoints) && allPoints.length >= 2
    if (hasPoints) {
      for (const p of allPoints) {
        const x = +p.x,
          y = +p.y
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        if (x < pMinX) pMinX = x
        if (y < pMinY) pMinY = y
        if (x > pMaxX) pMaxX = x
        if (y > pMaxY) pMaxY = y
      }
    }

    // ── 그리드 경계(숫자 보정 + 유효성 체크)
    const info = grid?.info || null
    const wRaw = Number(info?.width),
      hRaw = Number(info?.height)
    const res = Number(info?.resolution)
    const ox = Number(info?.origin?.position?.x)
    const oy = Number(info?.origin?.position?.y)

    const hasGrid =
      Number.isFinite(wRaw) && wRaw > 0 && Number.isFinite(hRaw) && hRaw > 0 && Number.isFinite(res) && res > 0

    let gMinX = +Infinity,
      gMinY = +Infinity,
      gMaxX = -Infinity,
      gMaxY = -Infinity
    if (hasGrid) {
      const wM = wRaw * res
      const hM = hRaw * res
      const gx = Number.isFinite(ox) ? ox : 0
      const gy = Number.isFinite(oy) ? oy : 0
      gMinX = gx
      gMinY = gy
      gMaxX = gx + wM
      gMaxY = gy + hM
    }

    // ── 합성 경계(basis) 선택
    let minX,
      minY,
      maxX,
      maxY,
      basis = 'none'
    if (fitMode === 'grid' && hasGrid) {
      // grid 모드: grid 경계와 path 경계를 합집합으로(가능하면)
      minX = Math.min(gMinX, hasPoints ? pMinX : +Infinity)
      minY = Math.min(gMinY, hasPoints ? pMinY : +Infinity)
      maxX = Math.max(gMaxX, hasPoints ? pMaxX : -Infinity)
      maxY = Math.max(gMaxY, hasPoints ? pMaxY : -Infinity)
      if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
        minX = gMinX
        minY = gMinY
        maxX = gMaxX
        maxY = gMaxY
      }
      basis = hasPoints ? 'union(grid+path)' : 'grid'
    } else if (hasPoints) {
      minX = pMinX
      minY = pMinY
      maxX = pMaxX
      maxY = pMaxY
      basis = 'path'
    } else if (hasGrid) {
      minX = gMinX
      minY = gMinY
      maxX = gMaxX
      maxY = gMaxY
      basis = 'grid'
    } else {
      return { scale: 1, offsetX: 0, offsetY: 0, basis: 'none' }
    }

    // ── 패딩 및 스케일
    const pad = Math.max(0, padPx | 0)
    const W = Math.max(1, cssW - pad * 2)
    const H = Math.max(1, cssH - pad * 2)

    const worldW = Math.max(1e-6, maxX - minX)
    const worldH = Math.max(1e-6, maxY - minY)
    const scaleMeters = Math.max(1e-6, Math.min(W / worldW, H / worldH))

    // ── 화면 중앙 배치 (y-down)
    const screenCX = cssW / 2
    const screenCY = cssH / 2

    let offsetX, offsetY

    if ((fitMode === 'grid' && hasGrid) || basis === 'grid' || basis === 'union(grid+path)') {
      // grid/world 절대좌표 기준(렌더에서 makeTransforms 사용)
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      offsetX = Math.round(screenCX - centerX * scaleMeters)
      offsetY = Math.round(screenCY + centerY * scaleMeters)
    } else {
      // path 모드일 때는 렌더 식(sx = (x - minX) * scale + offsetX, sy = (maxY - y) * scale + offsetY)에 맞춰 보정
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      offsetX = Math.round(screenCX - (centerX - minX) * scaleMeters) // ← minX 보정
      offsetY = Math.round(screenCY - (maxY - centerY) * scaleMeters) // ← maxY 보정
    }

    return { scale: scaleMeters, offsetX, offsetY, basis }
  }, [grid, allPoints, canvasSize.w, canvasSize.h, fitMode, padPx])

  // 데이터/크기 변동 시 뷰 리셋
  const dataSigRef = useRef('')
  useEffect(() => {
    if (!autoFitOnData) return
    const info = grid?.info
    const sig = `${info?.width || 0}x${info?.height || 0}:${allPoints.length}:${allPoints[0]?.x ?? ''}:${allPoints[0]?.y ?? ''}:${allPoints.at?.(-1)?.x ?? ''}:${allPoints.at?.(-1)?.y ?? ''}:${canvasSize.w}x${canvasSize.h}:${fitMode}`
    if (sig !== dataSigRef.current) {
      dataSigRef.current = sig
      smoothRef.current = new SmoothViewController({ zoom: 1, panX: 0, panY: 0 })
      setView({ zoom: 1, panX: 0, panY: 0 })
      requestAnimationFrame(() => renderReq())
    }
  }, [grid, allPoints, canvasSize.w, canvasSize.h, fitMode, autoFitOnData])

  // fit 생긴 뒤 레이스 방지
  useEffect(() => {
    if (!fit) return
    if (viewRef.current.panX !== 0 || viewRef.current.panY !== 0 || viewRef.current.zoom !== 1) {
      smoothRef.current = new SmoothViewController({ zoom: 1, panX: 0, panY: 0 })
      setView({ zoom: 1, panX: 0, panY: 0 })
    }
  }, [fit?.scale, fit?.offsetX, fit?.offsetY])

  // 안정 렌더러 + rAF 스케줄러
  const renderRef = useRef(() => {})
  const rafRef = useRef(0)

  const renderReq = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => renderRef.current())
  }, [])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // ready 전환 순간 1회 중앙 정렬
  const wasReadyRef = useRef(false)
  useEffect(() => {
    if (!centerOnReady) return
    if (loadPhase === 'ready' && !wasReadyRef.current) {
      wasReadyRef.current = true
      smoothRef.current = new SmoothViewController({ zoom: 1, panX: 0, panY: 0 })
      setView({ zoom: 1, panX: 0, panY: 0 })
      renderReq()
      requestAnimationFrame(renderReq)
    }
    if (loadPhase !== 'ready') wasReadyRef.current = false
  }, [loadPhase, centerOnReady, renderReq])

  // 오버레이(캔버스)
  const drawOverlay = (ctx, { title = '이동면적(준비 중)', subtitle = '' } = {}) => {
    const w = ctx.canvas.width,
      h = ctx.canvas.height
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#E5E7EB'
    ctx.font = '14px sans-serif'
    ctx.fillText(String(title), 12, 22)
    if (subtitle) {
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '12px sans-serif'
      ctx.fillText(String(subtitle), 12, 40)
    }
    ctx.restore()
  }

  // 렌더러
  renderRef.current = () => {
    try {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // HiDPI(레티나) 보정: 내부 버퍼는 dpr배, 좌표계는 CSS px 기준
      const cssW = Math.max(1, canvasSize.w | 0)
      const cssH = Math.max(1, canvasSize.h | 0)
      const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
      const bufW = Math.max(1, Math.round(cssW * dpr))
      const bufH = Math.max(1, Math.round(cssH * dpr))
      if (canvas.width !== bufW) canvas.width = bufW
      if (canvas.height !== bufH) canvas.height = bufH
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // 배경
      ctx.clearRect(0, 0, cssW, cssH)
      ctx.save()
      ctx.fillStyle = background
      ctx.fillRect(0, 0, cssW, cssH)
      ctx.restore()

      const noPts = !Array.isArray(points) || points.length < 2
      const notEnough = !isReadyByData
      const stillLoading = isLoadingLogs || loadPhase !== 'ready'

      if (loadPhase === 'init') return

      if (!isInteractiveReady || noPts || notEnough || stillLoading) {
        drawOverlay(ctx, {
          title: '이동면적(준비 중)',
          subtitle: noPts ? '경로 수집 대기…' : stillLoading ? 'MCAP 로딩 중…' : '데이터 안정화 대기…'
        })
        return
      }

      const useInstant = isInteractingNow()
      const cur = useInstant ? viewRef.current : (smoothRef.current.value ?? viewRef.current)
      const zoom = Math.max(1e-6, cur.zoom)
      const baseScale = Math.max(1e-6, fit?.scale || 1)
      const localScale = baseScale * zoom
      const offsetX = fit?.offsetX || 0
      const offsetY = fit?.offsetY || 0

      let worldToScreenFn
      let res = 0.05
      const info = grid?.info

      if (fitMode === 'grid' && info?.width && info?.height) {
        const base = makeTransforms(info, { scale: localScale, offsetX, offsetY })
        worldToScreenFn = (x, y) => base.worldToScreen(x - cur.panX, y - cur.panY)
        res = info.resolution || 0.05
      } else {
        // path-bounds 변환
        let minX = +Infinity,
          minY = +Infinity,
          maxX = -Infinity,
          maxY = -Infinity
        for (const p of points) {
          if (p.x < minX) minX = p.x
          if (p.y < minY) minY = p.y
          if (p.x > maxX) maxX = p.x
          if (p.y > maxY) maxY = p.y
        }
        worldToScreenFn = (x, y) => {
          const sx = (x - minX - cur.panX) * localScale + offsetX
          const sy = (maxY - (y - cur.panY)) * localScale + offsetY
          return { sx, sy }
        }
        res = 0.05
      }

      // === A) 마스크 (오프스크린은 CSS px 버퍼, setTransform 사용 안 함) ===
      const maskCvs = document.createElement('canvas')
      maskCvs.width = cssW
      maskCvs.height = cssH
      const maskCtx = maskCvs.getContext('2d')

      const widthPx = (brushWidthM / res) * localScale

      maskCtx.save()
      maskCtx.fillStyle = '#000'
      maskCtx.fillRect(0, 0, cssW, cssH)
      maskCtx.strokeStyle = '#fff'
      maskCtx.lineCap = 'round'
      maskCtx.lineJoin = 'round'
      maskCtx.beginPath()
      let s = worldToScreenFn(points[0].x, points[0].y)
      maskCtx.moveTo(s.sx, s.sy)
      for (let i = 1; i < points.length; i++) {
        s = worldToScreenFn(points[i].x, points[i].y)
        maskCtx.lineTo(s.sx, s.sy)
      }
      maskCtx.lineWidth = Math.max(1, widthPx)
      maskCtx.stroke()
      maskCtx.restore()

      // === B) 클로징 (blur 캔버스도 CSS px 버퍼로 유지) ===
      let usedMask = maskCvs
      if (useClosing) {
        const blurred = document.createElement('canvas')
        blurred.width = cssW
        blurred.height = cssH
        const bctx = blurred.getContext('2d')
        bctx.save()
        bctx.filter = `blur(${Math.max(0, closeBlurPx)}px)`
        bctx.drawImage(maskCvs, 0, 0, cssW, cssH)
        bctx.restore()

        const img = bctx.getImageData(0, 0, blurred.width, blurred.height)
        const data = img.data
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]
          const on = a >= closeThreshold
          data[i] = 255
          data[i + 1] = 255
          data[i + 2] = 255
          data[i + 3] = on ? 255 : 0
        }
        bctx.putImageData(img, 0, 0)
        usedMask = blurred
      }

      // === C) 단색 채움 (크기 명시하여 DPR 충돌 방지) ===
      ctx.save()
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = fillColor
      ctx.fillRect(0, 0, cssW, cssH)
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(usedMask, 0, 0, cssW, cssH)
      ctx.restore()

      // D) 외곽선 (고정 px)
      ctx.save()
      ctx.globalCompositeOperation = 'source-over'
      // 바깥
      ctx.strokeStyle = edgeDark
      ctx.lineWidth = edgeOuterPx
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      s = worldToScreenFn(points[0].x, points[0].y)
      ctx.moveTo(s.sx, s.sy)
      for (let i = 1; i < points.length; i++) {
        s = worldToScreenFn(points[i].x, points[i].y)
        ctx.lineTo(s.sx, s.sy)
      }
      ctx.stroke()
      // 안쪽
      ctx.strokeStyle = edgeLight
      ctx.lineWidth = edgeInnerPx
      ctx.stroke()
      ctx.restore()

      // E) 센터라인
      ctx.save()
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = centerLineColor
      ctx.lineWidth = 1.0
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      s = worldToScreenFn(points[0].x, points[0].y)
      ctx.moveTo(s.sx, s.sy)
      for (let i = 1; i < points.length; i++) {
        s = worldToScreenFn(points[i].x, points[i].y)
        ctx.lineTo(s.sx, s.sy)
      }
      ctx.stroke()
      ctx.restore()

      // F) 화살표
      let accum = 0
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1],
          p1 = points[i]
        const dx = p1.x - p0.x,
          dy = p1.y - p0.y
        const d = Math.hypot(dx, dy)
        if (!(d > 1e-6)) continue
        accum += d
        if (accum >= arrowEveryMeters) {
          accum = 0
          const ang = Math.atan2(dy, dx)
          const v = worldToScreenFn(p1.x, p1.y)
          if (Number.isFinite(v.sx) && Number.isFinite(v.sy)) {
            drawArrowHead(ctx, v.sx, v.sy, ang, arrowSizePx)
          }
        }
      }

      // G) 시간 라벨
      if (typeof currentTimestampMs === 'number' && typeof durationMs === 'number' && msToClock) {
        const label = `${msToClock(currentTimestampMs)} / ${msToClock(durationMs)}`
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        const W = Math.max(120, ctx.measureText(label).width + 14)
        ctx.fillRect(cssW - W - 8, 6, W, 18)
        ctx.fillStyle = '#E5E7EB'
        ctx.font = '12px sans-serif'
        ctx.fillText(label, cssW - W - 2, 19)
        ctx.restore()
      }

      if (showDebugLabel) {
        const curZoom = isInteractingNow()
          ? viewRef.current.zoom
          : (smoothRef.current.value?.zoom ?? viewRef.current.zoom)
        const lbl = `pts:${points.length} fit:${(fit?.scale ?? 1).toFixed(3)} zoom:${curZoom.toFixed(2)}`
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        const W = Math.max(180, ctx.measureText(lbl).width + 14)
        ctx.fillRect(8, 6, W, 18)
        ctx.fillStyle = '#E5E7EB'
        ctx.font = '12px sans-serif'
        ctx.fillText(lbl, 12, 19)
        ctx.restore()
      }
    } catch (err) {
      console.warn('[CoveragePanel] render error:', err)
    }
  }

  function drawArrowHead(ctx, x, y, angle, size) {
    const w = size,
      h = size * 1.2
    const tri = [
      { x: 0, y: 0 },
      { x: -w * 0.55, y: -h },
      { x: w * 0.55, y: -h }
    ]
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle + Math.PI / 2)
    ctx.beginPath()
    ctx.moveTo(tri[0].x, tri[0].y)
    ctx.lineTo(tri[1].x, tri[1].y)
    ctx.lineTo(tri[2].x, tri[2].y)
    ctx.closePath()
    ctx.fillStyle = arrowFill
    ctx.fill()
    ctx.lineWidth = arrowStrokeWidth
    ctx.strokeStyle = arrowStroke
    ctx.stroke()
    ctx.restore()
  }

  // ── 마우스 휠 줌(ready 상태에서만)
  const onCanvasWheel = useCallback(
    (e) => {
      if (!isInteractiveReady) return
      e.preventDefault()
      const cvs = canvasRef.current
      if (!cvs) return
      const rect = cvs.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top

      const info = grid?.info
      const pts = points
      const fitSnap = fit

      const cur = viewRef.current
      const baseScale = Math.max(1e-6, fitSnap?.scale || 1)
      const zoom = Math.max(1e-6, cur.zoom)
      const localScale = baseScale * zoom
      const offsetX = fitSnap?.offsetX || 0
      const offsetY = fitSnap?.offsetY || 0

      const wBefore = (() => {
        if (fitMode === 'grid' && info?.width && info?.height) {
          const base = makeTransforms(info, { scale: localScale, offsetX, offsetY })
          if (typeof base.screenToWorld === 'function') {
            const w = base.screenToWorld(px, py)
            return { x: w.x + cur.panX, y: w.y + cur.panY }
          }
        }
        // path 모드 역변환
        let minX = +Infinity,
          minY = +Infinity,
          maxX = -Infinity,
          maxY = -Infinity
        for (const p of Array.isArray(pts) ? pts : []) {
          if (p.x < minX) minX = p.x
          if (p.y < minY) minY = p.y
          if (p.x > maxX) maxX = p.x
          if (p.y > maxY) maxY = p.y
        }
        const x = (px - offsetX) / localScale + minX + cur.panX
        const y = maxY - (py - offsetY) / localScale + cur.panY
        return { x, y }
      })()

      const sensitivity = 0.0015
      const nextZoom = Math.max(0.2, Math.min(10, zoom * (1 - e.deltaY * sensitivity)))

      setView((prev) => {
        const next = { ...prev, zoom: nextZoom }
        const baseScale2 = Math.max(1e-6, fitSnap?.scale || 1)
        const local2 = baseScale2 * next.zoom

        let wAfter = null
        if (fitMode === 'grid' && info?.width && info?.height) {
          const base = makeTransforms(info, { scale: local2, offsetX, offsetY })
          if (typeof base.screenToWorld === 'function') {
            const w = base.screenToWorld(px, py)
            wAfter = { x: w.x + next.panX, y: w.y + next.panY }
          }
        }
        if (!wAfter) {
          let minX = +Infinity,
            minY = +Infinity,
            maxX = -Infinity,
            maxY = -Infinity
          for (const p of Array.isArray(pts) ? pts : []) {
            if (p.x < minX) minX = p.x
            if (p.y < minY) minY = p.y
            if (p.x > maxX) maxX = p.x
            if (p.y > maxY) maxY = p.y
          }
          const x = (px - offsetX) / local2 + minX + next.panX
          const y = maxY - (py - offsetY) / local2 + next.panY
          wAfter = { x, y }
        }
        const dX = wBefore.x - wAfter.x
        const dY = wBefore.y - wAfter.y
        return { ...next, panX: next.panX + dX, panY: next.panY + dY }
      })

      markInteracting(300)
      renderReq()
    },
    [isInteractiveReady, fit, grid, points, fitMode, renderReq]
  )

  // ── 드래그 패닝(좌클릭)
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 })
  const onCanvasMouseDown = useCallback(
    (e) => {
      if (!isInteractiveReady) return
      if (e.button !== 0) return
      const cvs = canvasRef.current
      if (!cvs) return
      e.preventDefault()
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY }

      const onMove = (ev) => {
        if (!dragRef.current.dragging) return
        const dx = ev.clientX - dragRef.current.lastX
        const dy = ev.clientY - dragRef.current.lastY
        dragRef.current.lastX = ev.clientX
        dragRef.current.lastY = ev.clientY

        const baseScale = Math.max(1e-6, fit?.scale || 1)
        const zoom = Math.max(1e-6, viewRef.current.zoom)
        const localScale = baseScale * zoom
        const dPanX = -dx / localScale
        const dPanY = +dy / localScale // y-down
        setView((prev) => ({ ...prev, panX: prev.panX + dPanX, panY: prev.panY + dPanY }))
        markInteracting(160)
        renderReq()
      }
      const onUp = () => {
        dragRef.current.dragging = false
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove, { passive: true })
      window.addEventListener('mouseup', onUp, { passive: true })
    },
    [isInteractiveReady, fit, renderReq]
  )

  // 뷰/데이터/리사이즈 변화 시 렌더
  useEffect(() => {
    renderReq()
  }, [view])
  useEffect(() => {
    renderReq()
  }, [grid, allPoints, points, canvasSize.w, canvasSize.h, loadPhase, isLoadingLogs, fit, followPlay])

  // non-passive wheel/touch
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const wheelHandler = (ev) => {
      onCanvasWheel(ev)
    }
    const touchMoveBlocker = (ev) => {
      if (isInteractiveReady) ev.preventDefault()
    }
    cvs.addEventListener('wheel', wheelHandler, { passive: false })
    cvs.addEventListener('touchmove', touchMoveBlocker, { passive: false })
    return () => {
      cvs.removeEventListener('wheel', wheelHandler)
      cvs.removeEventListener('touchmove', touchMoveBlocker)
    }
  }, [onCanvasWheel, isInteractiveReady])

  // 오버레이(HTML)
  const overlayVisible = !isInteractiveReady
  const overlayLabel =
    loadPhase === 'init' ? overlayTextInit : loadPhase === 'error' ? '로딩 실패' : '이동면적 준비 중…'

  return (
    <div ref={rootRef} className={className} style={{ ...style, width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isInteractiveReady ? (dragRef.current.dragging ? 'grabbing' : 'grab') : 'default',
          touchAction: 'none',
          userSelect: 'none'
        }}
        onContextMenu={(e) => e.preventDefault()}
        onWheel={() => {}}
        onMouseDown={onCanvasMouseDown}
      />

      {/* 준비중 오버레이 — 스피너 제거, 텍스트만 */}
      <div
        aria-live="polite"
        role="status"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: overlayVisible ? 1 : 0,
          transition: 'opacity 160ms ease-out',
          background: overlayVisible ? 'rgba(0,0,0,0.35)' : 'transparent',
          color: '#E5E7EB',
          fontSize: 14,
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.55)',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {overlayLabel}
        </div>
      </div>

      {/* 좌측 상단 라벨(자리만 유지) */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 8,
          color: '#E5E7EB',
          fontSize: 12,
          background: 'rgba(0,0,0,0.55)',
          padding: '2px 6px',
          borderRadius: 4,
          userSelect: 'none',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      ></div>
    </div>
  )
}
