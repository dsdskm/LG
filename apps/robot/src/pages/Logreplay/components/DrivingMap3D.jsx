// Logreplay/components/DrivingMap3D.jsx
import React, { memo, useMemo, useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { S } from '../styles'
// ─────────────────────────────────────────────
// 지도 DataTexture
// ─────────────────────────────────────────────
function buildGridTexture(gridData) {
  const { width, height, data } = gridData
  const rgba = new Uint8Array(width * height * 4)

  const DATA_TOPLEFT = true
  for (let y = 0; y < height; y++) {
    const sy = y
    const dy = DATA_TOPLEFT ? height - 1 - y : y
    for (let x = 0; x < width; x++) {
      const i = sy * width + x
      const di = dy * width + x
      const raw = data[i]

      let r, g, b, a

      if (raw === 0) {
        r = 235
        g = 235
        b = 235
        a = 255
      } else if (raw === 255) {
        r = 170
        g = 170
        b = 170
        a = 255
      } else {
        const t = raw / 254
        const lum = Math.round(50 - t * 19)
        r = lum
        g = lum + 10
        b = lum + 17
        a = 255
      }
      rgba[di * 4 + 0] = r
      rgba[di * 4 + 1] = g
      rgba[di * 4 + 2] = b
      rgba[di * 4 + 3] = a
    }
  }

  const tex = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat)
  tex.flipY = false // ✅ 픽셀 레벨에서 이미 fli
  tex.needsUpdate = true
  return tex
}

// ─────────────────────────────────────────────
// 코스트맵 팔레트 — render2d.js 와 동일 계열
// ─────────────────────────────────────────────
function buildCostPalette() {
  const pal = new Array(256).fill(null).map(() => [0, 0, 0, 0])

  // free(0): 아주 희미하게
  pal[0] = [0, 180, 200, 14]

  // unknown(255): 투명
  pal[255] = [0x80, 0x80, 0x80, 0]

  // 1~100: 시안 → 마젠타 gradient
  const c0 = { r: 0, g: 200, b: 220 }
  const c1 = { r: 235, g: 0, b: 235 }

  for (let v = 1; v <= 100; v++) {
    const t = v / 100
    const r = Math.round(c0.r * (1 - t) + c1.r * t)
    const g = Math.round(c0.g * (1 - t) + c1.g * t)
    const b = Math.round(c0.b * (1 - t) + c1.b * t)

    let a = 0
    if (v < 20) a = Math.round(10 + t * 40)
    else if (v < 60) a = Math.round(30 + (t - 0.2) * 120)
    else a = Math.round(80 + (t - 0.6) * 130)

    pal[v] = [r, g, b, a]
  }

  // 101~254: 100과 동일 처리
  for (let v = 101; v <= 254; v++) {
    pal[v] = pal[100]
  }

  return pal
}

const COST_PALETTE = buildCostPalette()

function buildCostmapTexture(grid) {
  const { width, height, data } = grid
  const rgba = new Uint8Array(width * height * 4)

  const DATA_TOPLEFT = true // 2D render2d.js와 동일 정책
  for (let y = 0; y < height; y++) {
    const sy = y
    const dy = DATA_TOPLEFT ? height - 1 - y : y // ✅ 픽셀 레벨 y-flip
    for (let x = 0; x < width; x++) {
      const i = sy * width + x // 소스 인덱스 (원본 row)
      const di = dy * width + x // 대상 인덱스 (flip된 row)
      let v = data[i]
      if (v > 100 && v !== 255) v = 100
      const [r, g, b, a] = COST_PALETTE[v] ?? [0, 0, 0, 0]

      rgba[di * 4 + 0] = r
      rgba[di * 4 + 1] = g
      rgba[di * 4 + 2] = b
      rgba[di * 4 + 3] = a
    }
  }

  const tex = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat)
  tex.flipY = false // ✅ 픽셀 레벨에서 이미 flip했으므로 텍스처 flip 불필요
  tex.needsUpdate = true
  return tex
}

// ─────────────────────────────────────────────
// 2D와 동일한 playback cutoff 계산
// render2d.js:
//   tSecCutoff = pts[0].tSec + clampedPlaySec
// ─────────────────────────────────────────────
function getPlaybackCutoffSec(pathPoints, currentTimestampMs) {
  const playSec = Math.max(0, (currentTimestampMs ?? 0) / 1000)

  if (!Array.isArray(pathPoints) || pathPoints.length < 2) {
    return playSec
  }

  const t0 = Number(pathPoints[0]?.tSec)
  const t1 = Number(pathPoints[pathPoints.length - 1]?.tSec)

  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 < t0) {
    return playSec
  }

  const duration = t1 - t0
  const clampedPlaySec = Math.min(playSec, duration)

  return t0 + clampedPlaySec
}

// ─────────────────────────────────────────────
// 2D와 동일하게 현재 pose 보간
// ─────────────────────────────────────────────
function getInterpolatedPoseAtTime(pathPoints, tSecCutoff) {
  if (!Array.isArray(pathPoints) || pathPoints.length === 0) return null
  if (pathPoints.length === 1) {
    const p = pathPoints[0]
    return {
      x: Number(p?.x) || 0,
      y: Number(p?.y) || 0,
      yaw: Number(p?.yaw) || 0
    }
  }

  let lo = 0
  let hi = pathPoints.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if ((pathPoints[mid]?.tSec ?? 0) <= tSecCutoff) lo = mid + 1
    else hi = mid
  }
  const idx = lo - 1

  let curX
  let curY
  let yaw = 0

  if (idx <= -1) {
    curX = Number(pathPoints[0]?.x) || 0
    curY = Number(pathPoints[0]?.y) || 0
    yaw = Number(pathPoints[0]?.yaw) || 0
  } else if (idx >= pathPoints.length - 1) {
    const p = pathPoints[pathPoints.length - 1]
    curX = Number(p?.x) || 0
    curY = Number(p?.y) || 0
    yaw = Number(p?.yaw) || 0
  } else {
    const a = pathPoints[idx]
    const b = pathPoints[idx + 1]
    const ta = Number(a?.tSec) || 0
    const tb = Number(b?.tSec) || 0
    const tt = (tSecCutoff - ta) / Math.max(1e-9, tb - ta)

    curX = (Number(a?.x) || 0) + ((Number(b?.x) || 0) - (Number(a?.x) || 0)) * tt
    curY = (Number(a?.y) || 0) + ((Number(b?.y) || 0) - (Number(a?.y) || 0)) * tt
    yaw = Number(pathPoints[Math.min(idx, pathPoints.length - 1)]?.yaw) || 0
  }

  return { x: curX, y: curY, yaw }
}

// ─────────────────────────────────────────────
// OccupancyGrid 메시
// ─────────────────────────────────────────────
function OccupancyGridMesh({ gridData }) {
  const textureRef = useRef(null)

  const texture = useMemo(() => {
    if (textureRef.current) {
      textureRef.current.dispose()
      textureRef.current = null
    }
    if (!gridData) return null

    const tex = buildGridTexture(gridData)
    textureRef.current = tex
    return tex
  }, [gridData])

  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose()
        textureRef.current = null
      }
    }
  }, [])

  const geometry = useMemo(() => {
    if (!gridData) return null
    const { width, height, resolution } = gridData
    return new THREE.PlaneGeometry(width * resolution, height * resolution)
  }, [gridData])

  const position = useMemo(() => {
    if (!gridData) return [0, 0, 0]
    const { width, height, resolution, origin } = gridData
    const cx = origin.x + (width * resolution) / 2
    const cy = origin.y + (height * resolution) / 2
    return [cx, 0, -cy]
  }, [gridData])

  if (!texture || !geometry) return null

  return (
    <mesh geometry={geometry} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial map={texture} transparent={false} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ─────────────────────────────────────────────
// 코스트맵 오버레이 (ROBUST PICK + MAP SNAP + DEBUG LOGS)
// ─────────────────────────────────────────────
function CostmapOverlay({ localCostmapFrames, playbackCutoffSec, pathPoints }) {
  const curT = playbackCutoffSec ?? 0

  // 2D와 유사한 정책값(원인 파악용으로 로그에 why가 같이 찍힘)
  const MAX_FRAME_DELTA_SEC = 0.9 // 과거 최신 허용 시차
  const HOLD_LAST_SEC = 15.0 // 프레임 공백 대응
  const FUTURE_WARMUP_SEC = 0.5 // 경계에서 가까운 미래 허용
  const RELAXED_PICK = true // nearest 허용
  const MAX_NEAREST_SEC = 30.0 // nearest 최대 허용

  // 2D의 map-local snap 정책 (frame_id=map인데 로컬 창이면 로봇 근처로 스냅)
  const ENABLE_SNAP_FOR_MAP_LCM = true
  const SNAP_ONLY_WHEN_SMALL_M = 6.0
  const SNAP_MAX_DIST_M = 3.0

  // 마지막으로 그린 프레임(hold-last 용)
  const lastRecRef = useRef(null)

  // frames 정렬 방어 (3D 기존 break 로직이 정렬 깨짐에 취약)
  const framesSorted = useMemo(() => {
    if (!Array.isArray(localCostmapFrames)) return []
    return localCostmapFrames.slice().sort((a, b) => (a?.tSec ?? 0) - (b?.tSec ?? 0))
  }, [localCostmapFrames])

  // 2D와 유사한 pose 보간 (이 파일에 이미 getInterpolatedPoseAtTime 있음)
  const poseNow = useMemo(() => {
    return getInterpolatedPoseAtTime(pathPoints, curT)
  }, [pathPoints, curT])

  function pickLocalCostmapFrame(frames, curT, lastRec) {
    if (!Array.isArray(frames) || frames.length === 0) return null

    // lower_bound: curT 이하 최댓값 인덱스
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
      const dtP = curT - (recP?.tSec ?? -Infinity)
      if (Number.isFinite(dtP) && dtP >= 0 && dtP <= MAX_FRAME_DELTA_SEC) {
        return { rec: recP, why: 'past' }
      }
    }

    // 2) 가까운 미래 워밍업
    if (futureIdx < frames.length) {
      const recF = frames[futureIdx]
      const dtF = (recF?.tSec ?? Infinity) - curT
      if (Number.isFinite(dtF) && dtF >= 0 && dtF <= FUTURE_WARMUP_SEC) {
        return { rec: recF, why: 'future-warmup' }
      }
    }

    // 3) hold-last
    if (lastRec) {
      const dtH = curT - (lastRec?.tSec ?? -Infinity)
      if (Number.isFinite(dtH) && dtH >= 0 && dtH <= HOLD_LAST_SEC) {
        return { rec: lastRec, why: 'hold-last' }
      }
    }

    // 4) relaxed nearest
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

  function maybeSnapMapLocal(grid, poseNow) {
    if (!ENABLE_SNAP_FOR_MAP_LCM) return null
    if (!grid || !poseNow) return null

    const w = grid.width | 0
    const h = grid.height | 0
    const res = Number(grid.resolution) || 0
    if (!(w > 0 && h > 0 && res > 0)) return null

    const worldW = w * res
    const worldH = h * res
    if (Math.min(worldW, worldH) > SNAP_ONLY_WHEN_SMALL_M) return null

    const ox = Number(grid.origin?.x) || 0
    const oy = Number(grid.origin?.y) || 0

    const cx = ox + worldW * 0.5
    const cy = oy + worldH * 0.5

    const dist = Math.hypot((poseNow.x ?? 0) - cx, (poseNow.y ?? 0) - cy)
    if (dist >= SNAP_MAX_DIST_M) {
      return {
        snapped: true,
        originX: (poseNow.x ?? 0) - worldW * 0.5,
        originY: (poseNow.y ?? 0) - worldH * 0.5,
        dist
      }
    }
    return { snapped: false, dist }
  }

  // ✅ 프레임 선택(robust)
  const pick = useMemo(() => {
    const out = pickLocalCostmapFrame(framesSorted, curT, lastRecRef.current)
    return out
  }, [framesSorted, curT])

  const currentFrame = pick?.rec ?? null
  const pickedWhy = pick?.why ?? 'none'

  // ✅ texture 생성 (기존 동일 방식 유지)
  const textureRef = useRef(null)
  const texture = useMemo(() => {
    if (textureRef.current) {
      textureRef.current.dispose()
      textureRef.current = null
    }
    if (!currentFrame?.grid) return null
    const tex = buildCostmapTexture(currentFrame.grid)
    textureRef.current = tex
    return tex
  }, [currentFrame])

  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose()
        textureRef.current = null
      }
    }
  }, [])

  // ✅ geometry / position 계산 (+ map-local snap 적용)
  const { geometry, position, dbg } = useMemo(() => {
    if (!currentFrame?.grid) return { geometry: null, position: [0, 0, 0], dbg: null }

    const g = currentFrame.grid
    const w = g.width | 0
    const h = g.height | 0
    const res = Number(g.resolution) || 0
    const worldW = w * res
    const worldH = h * res

    let ox = Number(g.origin?.x) || 0
    let oy = Number(g.origin?.y) || 0

    const fid = String(g.frame_id || '').toLowerCase()
    let snapInfo = null
    if (fid.includes('map')) {
      snapInfo = maybeSnapMapLocal(g, poseNow)
      if (snapInfo?.snapped) {
        ox = snapInfo.originX
        oy = snapInfo.originY
      }
    }

    const cx = ox + worldW * 0.5
    const cy = oy + worldH * 0.5

    const dist = poseNow ? Math.hypot((poseNow.x ?? 0) - cx, (poseNow.y ?? 0) - cy) : null

    return {
      geometry: new THREE.PlaneGeometry(worldW, worldH),
      position: [cx, 0.02, -cy],
      dbg: {
        playbackCutoffSec: curT,
        frameTSec: currentFrame.tSec,
        dt: (currentFrame.tSec ?? 0) - curT,
        pickedWhy,
        frame_id: g.frame_id,
        origin: g.origin,
        worldW,
        worldH,
        center: { cx, cy },
        poseNow,
        dist,
        snap: snapInfo
      }
    }
  }, [currentFrame, curT, pickedWhy, poseNow])

  // ✅ hold-last 캐시 업데이트 (2D와 같은 의도: hold-last인 경우는 갱신 안함)
  useEffect(() => {
    if (!currentFrame) return
    if (pickedWhy !== 'hold-last') {
      lastRecRef.current = currentFrame
    }
  }, [currentFrame, pickedWhy])

  // ✅ [ADD] costmap 윤곽선용 geometry (2D strokeRect 대응)
  const edgeGeometry = useMemo(() => {
    if (!geometry) return null
    return new THREE.EdgesGeometry(geometry)
  }, [geometry])

  if (!texture || !geometry) return null

  return (
    <group>
      {/* costmap fill (기존) */}
      <mesh geometry={geometry} position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial map={texture} transparent opacity={1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* ✅ [ADD] costmap outline (2D strokeRect와 동일한 의미) */}
      {edgeGeometry && (
        <lineSegments
          geometry={edgeGeometry}
          position={position}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={(ref) => ref?.computeLineDistances()}
        >
          <lineDashedMaterial
            color={0x00c8d4} // 2D와 동일 계열 시안
            transparent
            opacity={0.85}
            depthWrite={false}
            dashSize={0.25} // 월드 단위(m) 기준 dash 길이
            gapSize={0.25} // 월드 단위(m) 기준 gap
          />
        </lineSegments>
      )}
    </group>
  )
}
// ─────────────────────────────────────────────
// 경로선
// ─────────────────────────────────────────────
function PathLine({ pathPoints, playbackCutoffSec }) {
  const currentSec = playbackCutoffSec ?? 0

  const { pastGeometry, futureGeometry } = useMemo(() => {
    if (!Array.isArray(pathPoints) || pathPoints.length === 0) {
      return { pastGeometry: null, futureGeometry: null }
    }

    const pastPts = []
    const futurePts = []

    for (const pt of pathPoints) {
      const v = new THREE.Vector3(pt.x, 0.03, -pt.y)
      if ((pt.tSec ?? 0) <= currentSec) pastPts.push(v)
      else futurePts.push(v)
    }

    if (pastPts.length > 0 && futurePts.length > 0) {
      futurePts.unshift(pastPts[pastPts.length - 1].clone())
    }

    return {
      pastGeometry: pastPts.length >= 2 ? new THREE.BufferGeometry().setFromPoints(pastPts) : null,
      futureGeometry: futurePts.length >= 2 ? new THREE.BufferGeometry().setFromPoints(futurePts) : null
    }
  }, [pathPoints, currentSec])

  useEffect(() => {
    return () => {
      if (pastGeometry) pastGeometry.dispose()
      if (futureGeometry) futureGeometry.dispose()
    }
  }, [pastGeometry, futureGeometry])

  return (
    <>
      {pastGeometry && (
        <line geometry={pastGeometry}>
          <lineBasicMaterial color="#10B981" linewidth={2} />
        </line>
      )}
      {futureGeometry && (
        <line geometry={futureGeometry}>
          <lineBasicMaterial color="#9CA3AF" linewidth={1} />
        </line>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// Goal 데이터 shape 흡수
// ─────────────────────────────────────────────
function pickGoalPose(raw) {
  if (!raw || typeof raw !== 'object') return null

  // 1) { x, y, yaw, tSec }
  if (Number.isFinite(raw.x) && Number.isFinite(raw.y)) {
    return {
      x: raw.x,
      y: raw.y,
      yaw: Number.isFinite(raw.yaw) ? raw.yaw : null,
      tSec: Number.isFinite(raw.tSec) ? raw.tSec : null
    }
  }

  // 2) pose / goal / targetPose / target_pose
  const pose = raw.pose ?? raw.goal ?? raw.targetPose ?? raw.target_pose ?? null
  if (pose) {
    const pos = pose.position ?? pose.pose?.position ?? null
    const ori = pose.orientation ?? pose.pose?.orientation ?? null

    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      let yaw = null

      if (ori && Number.isFinite(ori.x) && Number.isFinite(ori.y) && Number.isFinite(ori.z) && Number.isFinite(ori.w)) {
        const siny = 2 * (ori.w * ori.z + ori.x * ori.y)
        const cosy = 1 - 2 * (ori.y * ori.y + ori.z * ori.z)
        yaw = Math.atan2(siny, cosy)
      }

      return {
        x: pos.x,
        y: pos.y,
        yaw,
        tSec: Number.isFinite(raw.tSec) ? raw.tSec : null
      }
    }
  }

  // 3) { position: {x,y} } 또는 { point: {x,y} }
  const pos = raw.position ?? raw.point ?? null
  if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
    return {
      x: pos.x,
      y: pos.y,
      yaw: Number.isFinite(raw.yaw) ? raw.yaw : null,
      tSec: Number.isFinite(raw.tSec) ? raw.tSec : null
    }
  }

  return null
}
// [ADD] 2D와 동일: goal ↔ path 시간축 쉬프트 자동 추정
function estimateGoalTimeShiftSec(goals, pathPoints) {
  if (!Array.isArray(goals) || goals.length === 0) return 0
  if (!Array.isArray(pathPoints) || pathPoints.length === 0) return 0

  const g0 = Number(goals[0]?.tSec)
  const p0 = Number(pathPoints[0]?.tSec)

  const dt0 = (Number.isFinite(g0) ? g0 : 0) - (Number.isFinite(p0) ? p0 : 0)
  // 2D 동일 조건: 5초 이상 차이 나면 쉬프트로 간주
  if (Number.isFinite(dt0) && Math.abs(dt0) > 5) return dt0
  return 0
}

// [ADD] 2D와 동일: DWA goal pick 로직 (그대로 이식)
function pickDwaGoalRecord(series, curT, lastRec, cfg) {
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

// [ADD] 3D용 기본 cfg (※ 2D의 DWA_CFG 값이 있으면 여기 값을 그대로 교체하면 100% 일치)
const DWA_PICK_CFG_DEFAULT = {
  HOLD_LAST_SEC: 3.0,
  NEAREST_SEC_BASE: 2.0,
  ALWAYS_NEAREST: false,
  // 아래 2개는 2D에서 frame 변환 쓸 때 필요(보통 frame_id가 map이면 영향 없음)
  APPLY_BASE_FRAME: true,
  APPLY_POSE_YAW: true
}
// ─────────────────────────────────────────────
// Goal 마커 (2D 범례 의도에 맞춘 cross 스타일)
// ─────────────────────────────────────────────

// [REPLACE] GoalMarker — 2D와 동일하게 마지막 goal 영구 유지
function GoalMarker({ dwaGoals, pathPoints, playbackCutoffSec, markerSize = 0.3, cfg = DWA_PICK_CFG_DEFAULT }) {
  const tSecCutoff = playbackCutoffSec ?? 0

  // ✅ 마지막 goal을 영구 유지하기 위한 ref
  const lastRecRef = useRef(null)

  const pickedPose = useMemo(() => {
    if (!Array.isArray(dwaGoals) || dwaGoals.length === 0) {
      // goals 배열 자체가 없으면 아무것도 표시 안 함
      return null
    }

    // ✅ 2D와 동일: goal ↔ path 시간축 쉬프트
    const goalTimeShiftSec = estimateGoalTimeShiftSec(dwaGoals, pathPoints)
    const curT_forGoal = tSecCutoff + goalTimeShiftSec

    // ✅ 2D와 동일: pick 시도
    const pick = pickDwaGoalRecord(dwaGoals, curT_forGoal, lastRecRef.current, cfg)

    let rec = null

    if (pick?.rec) {
      // ✅ 정상 pick
      rec = pick.rec
      // hold-last가 아닌 경우만 last 갱신 (2D와 동일)
      if (pick.why !== 'hold-last') {
        lastRecRef.current = rec
      }
    } else if (lastRecRef.current) {
      // ✅ 핵심 차이점:
      // pick 실패해도 마지막 goal을 계속 유지
      rec = lastRecRef.current
    } else {
      return null
    }

    const pose = pickGoalPose(rec)
    if (!pose) return null

    let gx = Number(pose.x) || 0
    let gy = Number(pose.y) || 0
    const fid = String(rec.frame_id || '').toLowerCase()

    // ✅ base/odom frame 처리 (2D와 동일한 방향)
    if (cfg.APPLY_BASE_FRAME && (fid.includes('base') || fid.includes('odom'))) {
      const poseForGoal = getInterpolatedPoseAtTime(pathPoints, curT_forGoal)
      if (poseForGoal) {
        if (cfg.APPLY_POSE_YAW) {
          const c = Math.cos(poseForGoal.yaw)
          const s = Math.sin(poseForGoal.yaw)
          const rx = c * gx - s * gy
          const ry = s * gx + c * gy
          gx = poseForGoal.x + rx
          gy = poseForGoal.y + ry
        } else {
          gx = poseForGoal.x + gx
          gy = poseForGoal.y + gy
        }
      }
    }

    return { x: gx, y: gy }
  }, [dwaGoals, pathPoints, tSecCutoff, cfg])

  const armLen = markerSize
  const armThick = Math.max(0.025, markerSize * 0.16)
  const armHeight = 0.02

  const barXGeo = useMemo(() => new THREE.BoxGeometry(armLen, armHeight, armThick), [armLen, armThick])
  const barZGeo = useMemo(() => new THREE.BoxGeometry(armThick, armHeight, armLen), [armLen, armThick])

  if (!pickedPose) return null

  return (
    <group position={[pickedPose.x, 0.07, -pickedPose.y]}>
      <mesh geometry={barXGeo}>
        <meshBasicMaterial color="#06B6D4" />
      </mesh>
      <mesh geometry={barZGeo}>
        <meshBasicMaterial color="#06B6D4" />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────
// 로봇 마커
// - ROS(x,y) → Three.js(x, 0, -y)
// - geometry 전방은 local -Z
// - yaw=0 → world +X가 되도록 rotY = yaw - π/2
// ─────────────────────────────────────────────
function RobotMarker({ pathPoints, playbackCutoffSec, markerSize = 0.4 }) {
  const pose = useMemo(() => {
    return getInterpolatedPoseAtTime(pathPoints, playbackCutoffSec ?? 0)
  }, [pathPoints, playbackCutoffSec])

  const geometry = useMemo(() => {
    const s = markerSize
    const vertices = new Float32Array([0, 0, -s, -s * 0.55, 0, s * 0.5, s * 0.55, 0, s * 0.5])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setIndex([0, 1, 2])
    geo.computeVertexNormals()
    return geo
  }, [markerSize])

  if (!pose) return null

  const rotY = pose.yaw - Math.PI / 2

  return (
    <group position={[pose.x, 0.05, -pose.y]} rotation={[0, rotY, 0]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#3B82F6" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────
// 카메라 초기화
// ─────────────────────────────────────────────
function SceneSetup({ gridData, controlsRef }) {
  const { camera } = useThree()
  const initialized = useRef(false)

  useEffect(() => {
    if (!gridData || initialized.current) return

    const { width, height, resolution, origin } = gridData
    const cx = origin.x + (width * resolution) / 2
    const cy = origin.y + (height * resolution) / 2
    const tx = cx
    const tz = -cy
    const span = Math.max(width, height) * resolution

    camera.up.set(0, 1, 0)
    camera.position.set(tx, span * 0.7, tz + span * 0.9)
    camera.lookAt(tx, 0, tz)
    camera.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.set(tx, 0, tz)
      controlsRef.current.update()
    }

    initialized.current = true
  }, [gridData, camera, controlsRef])

  return null
}
// [ADD] 탭 전환/가시성 변경 직후 0x0 리사이즈/렌더 누락 방지
function RefreshOnActive({ active, containerRef }) {
  const { gl, camera, invalidate } = useThree()

  useEffect(() => {
    if (!active) return
    const el = containerRef.current
    if (!el) return

    // 전환 직후 레이아웃 확정 타이밍 때문에 rAF로 1틱 늦춰서 측정/반영
    const raf = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return

      gl.setSize(r.width, r.height, false)
      camera.aspect = r.width / r.height
      camera.updateProjectionMatrix()

      // 한 프레임 강제 렌더
      invalidate()
    })

    return () => cancelAnimationFrame(raf)
  }, [active, containerRef, gl, camera, invalidate])

  return null
}
// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────
function DrivingMap3D({
  isActive = true,
  gridData,
  pathPoints,
  lidarScans,
  localCostmapFrames,
  dwaGoals,
  currentTimestampMs,
  t0EpochMs
}) {
  const containerRef = useRef(null)
  const glDomRef = useRef(null)
  const controlsRef = useRef()

  const hasGrid = !!gridData
  const hasPath = Array.isArray(pathPoints) && pathPoints.length > 0
  const hasCostmap = Array.isArray(localCostmapFrames) && localCostmapFrames.length > 0
  const hasGoal = Array.isArray(dwaGoals) && dwaGoals.length > 0

  const playbackCutoffSec = useMemo(() => {
    return getPlaybackCutoffSec(pathPoints, currentTimestampMs)
  }, [pathPoints, currentTimestampMs])

  const markerSize = useMemo(() => {
    if (!gridData) return 0.4
    const shortSide = Math.min(gridData.width, gridData.height) * gridData.resolution
    return Math.max(0.2, Math.min(0.8, shortSide * 0.04))
  }, [gridData])

  // ✅ wheel 전파 차단 handler (고정 레퍼런스)
  const stopWheel = useCallback((e) => {
    e.stopPropagation()
  }, [])

  // ✅ 3D 활성일 때만 container wheel 전파 차단 (비활성 시 2D 휠 방해 금지)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (isActive) el.addEventListener('wheel', stopWheel, { passive: true })
    return () => el.removeEventListener('wheel', stopWheel)
  }, [isActive, stopWheel])

  // ✅ 3D 활성일 때만 canvas(domElement) wheel 전파 차단
  useEffect(() => {
    const dom = glDomRef.current
    if (!dom) return
    if (isActive) dom.addEventListener('wheel', stopWheel, { passive: true })
    return () => dom.removeEventListener('wheel', stopWheel)
  }, [isActive, stopWheel])

  return (
    <div
      ref={containerRef}
      style={{
        ...S.map3DContainer,
        // (부모에서도 pointerEvents를 제어하지만, 여기서도 안전하게 한 번 더)
        pointerEvents: isActive ? 'auto' : 'none'
      }}
    >
      <Canvas
        camera={{ position: [0, 30, 20], up: [0, 1, 0], fov: 50 }}
        style={S.map3DCanvas}
        gl={{ antialias: true, alpha: false }}
        eventSource={containerRef}
        eventPrefix="client"
        onCreated={({ gl }) => {
          glDomRef.current = gl.domElement
        }}
      >
        <color attach="background" args={['#F3F4F6']} />
        <ambientLight intensity={0.8} />

        {/* ✅ 전환 직후 리사이즈/렌더 누락 방지 */}
        <RefreshOnActive active={isActive} containerRef={containerRef} />

        <SceneSetup gridData={gridData} controlsRef={controlsRef} />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          screenSpacePanning={true}
          minDistance={0.5}
          maxDistance={500}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
          }}
        />

        <gridHelper args={[50, 50, '#374151', '#374151']} />

        <OccupancyGridMesh gridData={gridData} />

        {hasCostmap && (
          <CostmapOverlay
            localCostmapFrames={localCostmapFrames}
            playbackCutoffSec={playbackCutoffSec}
            pathPoints={pathPoints}
          />
        )}

        {hasPath && <PathLine pathPoints={pathPoints} playbackCutoffSec={playbackCutoffSec} />}

        {hasPath && (
          <RobotMarker pathPoints={pathPoints} playbackCutoffSec={playbackCutoffSec} markerSize={markerSize} />
        )}

        {hasGoal && (
          <GoalMarker
            dwaGoals={dwaGoals}
            pathPoints={pathPoints}
            playbackCutoffSec={playbackCutoffSec}
            markerSize={Math.max(0.18, markerSize * 0.72)}
          />
        )}
      </Canvas>

      {!hasGrid && <div style={S.map3DHint}>지도 데이터 로딩 중…</div>}
      {/* {hasGrid && (
        <div
          style={S.map3DDebugInfo}
        >{`지도: ${gridData.width}×${gridData.height} | 해상도: ${gridData.resolution}m`}</div>
      )} */}
      <div style={S.map3DControlsHint}>좌클릭: 회전 &nbsp;|&nbsp; 우클릭: 이동 &nbsp;|&nbsp; 휠: 줌</div>
    </div>
  )
}

export default memo(DrivingMap3D)
