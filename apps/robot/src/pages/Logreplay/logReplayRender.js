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
  const onResizeRef = useRef(null)

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
      onResizeRef.current = onResize
      window.addEventListener('resize', onResize)

      const renderLoop = () => {
        renderer.render(scene, camera)
        threeRafRef.current = requestAnimationFrame(renderLoop)
      }
      renderLoop()
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
        if (onResizeRef.current) {
          window.removeEventListener('resize', onResizeRef.current)
          onResizeRef.current = null
        }
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

/** "/pattern/flags" 형태를 정규식으로 파싱. 슬래시 형태가 아니거나 유효하지 않으면 null.
 *  하이라이트(LogsSection)와 필터(useLogReplayData)가 같은 파싱 규칙을 쓰도록 공유. */
export function parseSlashRegex(raw) {
  const m = String(raw ?? '').match(/^\/(.+)\/([a-z]*)$/i)
  if (!m) return null
  try {
    return new RegExp(m[1], m[2])
  } catch {
    return null
  }
}

/** 로그 검색 키워드 → 매칭 함수.
 *  "/pattern/flags" 형태면 정규식, 아니면 대소문자 무시 부분일치로 동작.
 *  키워드가 비어있으면 null. */
export function compileKeywordMatcher(raw) {
  const kw = String(raw ?? '').trim()
  if (!kw) return null

  const rgx = parseSlashRegex(kw)
  if (rgx) {
    return (text) => {
      // g/y 플래그의 lastIndex 상태가 재사용 시 결과를 오염시키는 것을 방지
      rgx.lastIndex = 0
      return rgx.test(String(text ?? ''))
    }
  }

  const lower = kw.toLowerCase()
  return (text) => String(text ?? '').toLowerCase().includes(lower)
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
