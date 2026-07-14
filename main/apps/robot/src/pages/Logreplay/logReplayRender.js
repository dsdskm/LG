// src/pages/Logreplay/logReplayRender.js
import { useEffect, useMemo, useRef, useState } from 'react'

/** ─────────────────────────────────────────────────────────────
 *  3D: Three.js 기반 로봇 뷰어 훅
 *  - 외부 API 변경 없이 useLogReplayLogic 내부에서 사용되도록 설계
 *  - mount ref가 연결되면 자동 init/cleanup
 *  - playIndex/poses3d에 따라 로봇 pose 반영
 *  ───────────────────────────────────────────────────────────── */
export function useThreeRobot(playIndex = 0) {
  const threeMountRef = useRef(null)
  const threeInitedRef = useRef(false)
  const threeRendererRef = useRef(null)
  const threeSceneRef = useRef(null)
  const threeCameraRef = useRef(null)
  const threeRobotRef = useRef(null)
  const threeRafRef = useRef(0)

  const [poses3d, setPoses3d] = useState([]) // [{tSec,x,y,yaw}]

  const durationSec = useMemo(() => {
    if (!poses3d || poses3d.length < 2) return 0
    return poses3d[poses3d.length - 1].tSec - poses3d[0].tSec || 0
  }, [poses3d])

  const currentTimeSec = useMemo(() => {
    if (!poses3d || poses3d.length === 0) return 0
    const idx = Math.max(0, Math.min(poses3d.length - 1, Math.floor((playIndex / 499) * (poses3d.length - 1))))
    return poses3d[idx].tSec - poses3d[0].tSec || 0
  }, [playIndex, poses3d])

  // mount 연결되면 자동 init
  useEffect(() => {
    if (threeInitedRef.current) return
    const mount = threeMountRef.current
    if (!mount) return

    let cancelled = false
    ;(async () => {
      const THREE = await import('three')
      if (cancelled) return

      const width = mount.clientWidth || 800
      const height = mount.clientHeight || 600
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000)
      camera.position.set(0, -8, 6)
      camera.lookAt(0, 0, 0)

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(width, height)
      mount.appendChild(renderer.domElement)

      scene.add(new THREE.GridHelper(20, 20, 0x248eff, 0x666666))
      scene.add(new THREE.AmbientLight(0xffffff, 0.8))
      const dir = new THREE.DirectionalLight(0xffffff, 0.6)
      dir.position.set(5, -5, 10)
      scene.add(dir)

      const robot = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.4, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xff5c5c })
      )
      scene.add(robot)

      threeSceneRef.current = scene
      threeCameraRef.current = camera
      threeRendererRef.current = renderer
      threeRobotRef.current = robot
      threeInitedRef.current = true

      const onResize = () => {
        const w = mount.clientWidth || 800
        const h = mount.clientHeight || 600
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      const renderLoop = () => {
        renderer.render(scene, camera)
        threeRafRef.current = requestAnimationFrame(renderLoop)
      }
      renderLoop()

      // cleanup
      return () => {
        cancelAnimationFrame(threeRafRef.current)
        window.removeEventListener('resize', onResize)
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
        renderer.dispose()
        threeInitedRef.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // playIndex/poses3d → 로봇 pose 반영
  useEffect(() => {
    if (!threeInitedRef.current || poses3d.length === 0 || !threeRobotRef.current) return
    const idx = Math.max(0, Math.min(poses3d.length - 1, Math.floor((playIndex / 499) * (poses3d.length - 1))))
    const p = poses3d[idx]
    threeRobotRef.current.position.set(p.x || 0, p.y || 0, 0)
    threeRobotRef.current.rotation.set(0, 0, p.yaw || 0)
  }, [playIndex, poses3d])

  // 훅 언마운트 시 3D 정리
  useEffect(() => {
    return () => {
      try {
        cancelAnimationFrame(threeRafRef.current)
        const mount = threeMountRef.current
        const renderer = threeRendererRef.current
        if (mount && renderer && mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement)
        }
        if (renderer) renderer.dispose?.()
        threeInitedRef.current = false
      } catch {
        /* noop */
      }
    }
  }, [])

  return {
    threeMountRef,
    poses3d,
    setPoses3d,
    durationSec,
    currentTimeSec
  }
}

/** ─────────────────────────────────────────────────────────────
 *  캔버스/맵/로그 유틸
 *  ───────────────────────────────────────────────────────────── */
export function makeMapPlaceholder(label = 'MAP') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#e5e7eb" offset="0%"/>
          <stop stop-color="#f9fafb" offset="100%"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <g fill="#6b7280" font-family="Arial, Helvetica, sans-serif" pointer-events="none">
        <text
          x="50%" y="50%"
          font-size="18" font-weight="500"
          dominant-baseline="middle" text-anchor="middle"
          textLength="560" lengthAdjust="spacingAndGlyphs">
          ${escapeXml(label)}
        </text>
      </g>
    </svg>
  `.trim()
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function escapeXml(unsafe) {
  return (unsafe || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function detectLevel(line) {
  if (!line) return 'UNKNOWN'
  const p1 = line.match(/\[\s*(INFO|WARN|ERROR|DEBUG)\s*\]/)
  if (p1) return p1[1]
  const p2 = line.match(/\]\s*(INFO|WARN|ERROR|DEBUG)\b/)
  if (p2) return p2[1]
  const p3 = line.match(/\b(INFO|WARN|ERROR|DEBUG)\b/)
  if (p3) return p3[1]
  return 'UNKNOWN'
}

export function extractFilenameFromContentDisposition(cd) {
  try {
    const starMatch = cd.match(/filename\*\s*=\s*([^']*)''([^;]+)/i)
    if (starMatch && starMatch[2]) return decodeURIComponent(starMatch[2])
    const match = cd.match(/filename\s*=\s*("?)([^";]+)\1/i)
    if (match && match[2]) return match[2]
  } catch (_) {}
  return null
}

export function triggerAnchorDownload(href, fileName, openInNewTab = false) {
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = href
  if (fileName) a.download = fileName
  a.rel = 'noopener'
  if (openInNewTab) a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** OccupancyGrid → 스크린 변환(월드→스크린) : 중앙 정렬 + contain 스케일 + 패딩 */
export function buildTransformFromGrid(grid, canvas, opts = {}) {
  const { width, height, resolution, origin } = grid
  const w_m = width * resolution
  const h_m = height * resolution

  const dpr = window.devicePixelRatio || 1
  const W = canvas.clientWidth | 0
  const H = canvas.clientHeight | 0
  if (W === 0 || H === 0) {
    console.warn('[grid-draw] canvas has zero size', { W, H, node: canvas })
    return null
  }

  // 옵션: 기본 패딩/센터링/fit
  const {
    padding = 12, // 좌우/상하 여백(px)
    fit = 'contain', // 현재는 contain만 사용
    center = true // true면 컨텐츠 박스 내 중앙 정렬
  } = opts

  // 컨텐츠 박스 크기
  const contentW = Math.max(0, W - padding * 2)
  const contentH = Math.max(0, H - padding * 2)
  if (contentW === 0 || contentH === 0) {
    console.warn('[grid-draw] content box is zero', { contentW, contentH, W, H, padding })
    return null
  }

  // contain 스케일
  const scaleX = contentW / w_m
  const scaleY = contentH / h_m
  const S = Math.max(1e-9, fit === 'contain' ? Math.min(scaleX, scaleY) : Math.min(scaleX, scaleY)) // 향후 cover 등 확장 여지

  const drawW = w_m * S
  const drawH = h_m * S

  // 중앙 정렬 오프셋(tx, ty): 컨텐츠 박스 내부에서 남는 여백의 절반씩
  let tx = padding
  let ty = padding
  if (center) {
    tx += (contentW - drawW) / 2
    ty += (contentH - drawH) / 2
  }

  // 변환 객체: 모든 그리기는 같은 worldToScreen을 사용
  return {
    dpr,
    W,
    H,
    pad: padding,
    S,
    originX: origin.x,
    originY: origin.y,
    w_m,
    h_m,
    tx, // 화면 기준 좌상단 오프셋 X
    ty, // 화면 기준 좌상단 오프셋 Y
    /** 월드 → 스크린
     *  - X: 원점 보정 후 스케일 + tx
     *  - Y: 상하 반전 (픽셀 래스터는 위→아래 증가)
     */
    worldToScreen(X, Y) {
      const sx = tx + (X - origin.x) * S
      const sy = ty + (h_m - (Y - origin.y)) * S // y invert
      return { sx, sy }
    }
  }
}

/** Grid 래스터를 캔버스에 그리기 (중앙 정렬 변환 사용) */
export function drawGridOnCanvas(canvas, grid, xf, { unknownAlpha = 0.0, palette = 'map' } = {}) {
  if (!xf) return
  const ctx = canvas.getContext('2d')
  const { dpr, W, H } = xf

  // HiDPI 스케일 적용
  const wantW = Math.floor(W * dpr)
  const wantH = Math.floor(H * dpr)
  if (canvas.width !== wantW || canvas.height !== wantH) {
    canvas.width = wantW
    canvas.height = wantH
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 배경 채우기
  ctx.fillStyle = '#F3F4F6'
  ctx.fillRect(0, 0, W, H)

  const { width, height, data } = grid

  // 1픽셀=1셀 오프스크린 버퍼에 그리드 생성
  const off = document.createElement('canvas')
  off.width = width
  off.height = height
  const octx = off.getContext('2d')
  const img = octx.createImageData(width, height)
  const dst = img.data

  for (let y = 0; y < height; y++) {
    const srcY = y
    const dstY = height - 1 - y // 상하 반전
    for (let x = 0; x < width; x++) {
      const v = data[srcY * width + x] // -1→255 | 0..100
      const di = (dstY * width + x) * 4
      if (v === 255) {
        // unknown
        dst[di + 0] = 0x80
        dst[di + 1] = 0x80
        dst[di + 2] = 0x80
        dst[di + 3] = Math.floor(255 * unknownAlpha)
      } else {
        const t = Math.max(0, Math.min(100, v)) / 100 // 0..1
        let r,
          g,
          b,
          a = 255
        if (palette === 'raw') {
          const c = Math.round(255 * (1 - t))
          r = g = b = c
        } else if (palette === 'costmap') {
          const c = Math.round(255 * (0.2 + 0.8 * t))
          r = 255
          g = 255 - c
          b = 255 - c
        } else {
          // default "map": 흑백(점유 높을수록 검게)
          const c = Math.round(255 * (1 - t))
          r = g = b = c
        }
        dst[di + 0] = r
        dst[di + 1] = g
        dst[di + 2] = b
        dst[di + 3] = a
      }
    }
  }
  octx.putImageData(img, 0, 0)

  // 그리기 크기/위치 (중앙 정렬된 좌상단 = xf.tx, xf.ty)
  const drawW = grid.width * grid.resolution * xf.S
  const drawH = grid.height * grid.resolution * xf.S

  ctx.imageSmoothingEnabled = false
  const left = Math.round(xf.tx)
  const top = Math.round(xf.ty)
  ctx.drawImage(off, left, top, Math.round(drawW), Math.round(drawH))

  // (옵션) 테두리 시각화 - 필요 없으면 주석 처리하세요
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 1
  ctx.strokeRect(left, top, Math.round(drawW), Math.round(drawH))
}

/** 타임라인: 같은 변환으로 '현재 시점까지' 경로 + 현재 위치(보간) 마커 */
export function drawPathTimelineWithTransform(
  canvas,
  points,
  xf,
  tSecCutoff,
  {
    colorPast = '#10B981', // 진행 구간
    colorFuture = '#9CA3AF', // 미진행 구간(점선)
    markerColor = '#EF4444', // 현재 위치
    lineWidth = 2
  } = {}
) {
  if (!canvas || !xf || !Array.isArray(points) || points.length === 0) return
  const ctx = canvas.getContext('2d')
  const { dpr } = xf
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 0) tSec 기준 오름차순이라고 가정(상위에서 정렬 완료)
  const n = points.length

  // 1) cutoff가 위치한 구간(이진 탐색)
  let lo = 0,
    hi = n // [lo, hi)
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if ((points[mid].tSec ?? 0) <= tSecCutoff) lo = mid + 1
    else hi = mid
  }
  const idx = lo - 1

  // 2) 보간: 현재 위치 계산
  let curX, curY
  if (idx <= -1) {
    curX = points[0].x
    curY = points[0].y
  } else if (idx >= n - 1) {
    curX = points[n - 1].x
    curY = points[n - 1].y
  } else {
    const a = points[idx],
      b = points[idx + 1]
    const ta = a.tSec ?? 0,
      tb = b.tSec ?? 0
    const denom = Math.max(1e-9, tb - ta)
    const t = Math.min(1, Math.max(0, (tSecCutoff - ta) / denom))
    curX = a.x + (b.x - a.x) * t
    curY = a.y + (b.y - a.y) * t
  }

  // 3) 진행 구간: 0..idx + (idx..curP)
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = colorPast
  ctx.setLineDash([])

  ctx.beginPath()
  let moved = false

  // 3-1) 0..idx까지 실선
  const lastIdx = Math.max(-1, Math.min(idx, n - 1))
  for (let i = 0; i <= lastIdx; i++) {
    const { sx, sy } = xf.worldToScreen(points[i].x, points[i].y)
    if (!moved) {
      ctx.moveTo(sx, sy)
      moved = true
    } else {
      ctx.lineTo(sx, sy)
    }
  }

  // 3-2) idx..curP 보간 구간 연장
  if (idx >= 0 && idx < n) {
    const { sx, sy } = xf.worldToScreen(curX, curY)
    if (!moved) {
      ctx.moveTo(sx, sy)
      moved = true
    } else {
      ctx.lineTo(sx, sy)
    }
  }
  ctx.stroke()

  // 4) 미진행 구간(점선): curP..end
  if (idx < n - 1) {
    ctx.strokeStyle = colorFuture
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    let moved2 = false

    // curP에서 시작
    let { sx: sx0, sy: sy0 } = xf.worldToScreen(curX, curY)
    ctx.moveTo(sx0, sy0)
    moved2 = true

    for (let i = Math.max(0, idx + 1); i < n; i++) {
      const { sx, sy } = xf.worldToScreen(points[i].x, points[i].y)
      if (!moved2) {
        ctx.moveTo(sx, sy)
        moved2 = true
      } else {
        ctx.lineTo(sx, sy)
      }
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 5) 현재 위치 마커(빨간 점)
  const curS = xf.worldToScreen(curX, curY)
  ctx.fillStyle = markerColor
  ctx.beginPath()
  ctx.arc(curS.sx, curS.sy, 4, 0, Math.PI * 2)
  ctx.fill()
}
/** 같은 변환으로 경로 그리기 */
export function drawPathWithTransform(canvas, points, xf, color = '#10B981') {
  if (!canvas || !points?.length) return
  const ctx = canvas.getContext('2d')
  const { dpr } = xf
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()

  let moved = false
  for (const p of points) {
    if (typeof p.x !== 'number' || typeof p.y !== 'number') continue
    const { sx, sy } = xf.worldToScreen(p.x, p.y)
    if (!moved) {
      ctx.moveTo(sx, sy)
      moved = true
    } else ctx.lineTo(sx, sy)
  }
  ctx.stroke()

  // 시작/끝 마커
  const first = points[0],
    last = points[points.length - 1]
  if (first) {
    const a = xf.worldToScreen(first.x, first.y)
    ctx.fillStyle = '#3B82F6'
    ctx.beginPath()
    ctx.arc(a.sx, a.sy, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  if (last) {
    const b = xf.worldToScreen(last.x, last.y)
    ctx.fillStyle = '#EF4444'
    ctx.beginPath()
    ctx.arc(b.sx, b.sy, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** 경계 계산(auto-fit용) */
export function computeBounds(points) {
  if (!points || points.length === 0) return null
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  for (const p of points) {
    if (typeof p.x === 'number' && typeof p.y === 'number') {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }
  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) return null
  const eps = 1e-3
  if (maxX - minX < eps) {
    minX -= 0.5
    maxX += 0.5
  }
  if (maxY - minY < eps) {
    minY -= 0.5
    maxY += 0.5
  }
  return { minX, maxX, minY, maxY }
}

/** 경계 기준 auto-fit 경로 그리기(그리드 미사용 시) */
export function drawPathOnCanvas(canvas, points, bounds) {
  if (!canvas || !points?.length || !bounds) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth || 100
  const h = canvas.clientHeight || 100

  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = '#F3F4F6'
  ctx.fillRect(0, 0, w, h)

  const pad = 12
  const worldW = bounds.maxX - bounds.minX
  const worldH = bounds.maxY - bounds.minY
  const scaleX = (w - pad * 2) / worldW
  const scaleY = (h - pad * 2) / worldH
  const scale = Math.min(scaleX, scaleY)
  const offsetX = pad - bounds.minX * scale

  ctx.lineWidth = 2
  ctx.strokeStyle = '#10B981'
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  let moved = false
  for (const p of points) {
    if (typeof p.x !== 'number' || typeof p.y !== 'number') continue
    const sx = p.x * scale + offsetX
    const sy = (bounds.maxY - p.y) * scale + pad // y invert + top padding
    if (!moved) {
      ctx.moveTo(sx, sy)
      moved = true
    } else ctx.lineTo(sx, sy)
  }
  ctx.stroke()

  const first = points[0],
    last = points[points.length - 1]
  if (first && typeof first.x === 'number' && typeof first.y === 'number') {
    const fx = first.x * scale + offsetX
    const fy = (bounds.maxY - first.y) * scale + pad
    ctx.fillStyle = '#3B82F6'
    ctx.beginPath()
    ctx.arc(fx, fy, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  if (last && typeof last.x === 'number' && typeof last.y === 'number') {
    const lx = last.x * scale + offsetX
    const ly = (bounds.maxY - last.y) * scale + pad
    ctx.fillStyle = '#EF4444'
    ctx.beginPath()
    ctx.arc(lx, ly, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

// (옵션) 보조 그리드
export function drawGrid(ctx, w, h) {
  ctx.save()
  ctx.strokeStyle = '#E5E7EB'
  ctx.lineWidth = 1
  for (let x = 0; x <= w; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y <= h; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.restore()
}
