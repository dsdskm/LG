import React, { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { Modal, ModalButton } from '@repo/ui'
import SiteMap from './SiteMap'
import { parseMultigrid, worldToSvgPixel } from '@/utils/mapUtils'
import { getLocalizedName } from '@/utils/robotUtils'
import poiMarkerSvg from '@/assets/icons/figma/marker.svg?url'

// ─── coordinate helpers ───────────────────────────────────────────────────────
// MULTIGRID parsing + world→SVG pixel conversion live in mapUtils so the 2D
// SiteMap and this 3D view share the exact same transform (timv.js pipeline).

function parseSvgSize(svgText) {
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const root = doc.documentElement
    const vb = root.getAttribute('viewBox')
    if (vb) {
      const p = vb.trim().split(/[\s,]+/)
      if (p.length >= 4) return { width: +p[2], height: +p[3] }
    }
    const w = +root.getAttribute('width')
    const h = +root.getAttribute('height')
    if (w && h) return { width: w, height: h }
  } catch (e) {}
  return null
}

// ─── colors ───────────────────────────────────────────────────────────────────

const STATE_COLORS = {
  OPERATION: '#22A56C',
  STANDBY: '#777772',
  WAIT: '#777772',
  CHARGE: '#965BE3',
  LEARNING: '#3194CB',
  ERROR: '#A34F4E',
  OFFLINE: '#AD7744'
}
const stateColor = (s) => STATE_COLORS[s] ?? '#777772'

// ─── 3D 로봇 아이콘 (구체 + 림 글로우) ──────────────────────────────────────

function RobotSphereIcon({ state, radius }) {
  const color = STATE_COLORS[state] ?? '#777772'
  return (
    <group>
      {/* 메인 구체 — MeshStandardMaterial 로 조명에 반응해 입체감 생성 */}
      <mesh>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial color={color} roughness={0.18} metalness={0.08} />
      </mesh>
      {/* 흰색 림 — BackSide 를 이용해 구체 가장자리에 테두리를 표현 */}
      <mesh>
        <sphereGeometry args={[radius * 1.06, 48, 48]} />
        <meshBasicMaterial color="#ffffff" side={THREE.BackSide} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ─── HTML markers (same look as 2D SiteMap, rendered as 3D billboards) ──────────

/* 마커 앵커 = 컨테이너 바닥 중앙 → 화살표 끝이 POI 3D 좌표에 정확히 닿음.
   Figma: 그림자(drop-shadow)는 라벨+마커 전체를 감싸는 이 컨테이너 1개에만 적용. */
const HtmlPoiMarker = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -100%);
  filter: drop-shadow(0px 2px 4px rgba(17, 17, 17, 0.2));
`

// marker.svg 는 라벨 하단에 붙는 작은 커넥터(꼬리표) 모양 — Figma 원본 크기 11×4.085px 그대로.
// height: auto 로 렌더링해야 object-fit 레터박싱 없이 이미지 하단 = 뾰족점이 정확히 일치.
const HtmlPoiIcon = styled.img`
  width: 11px;
  height: auto;
  display: block;
  pointer-events: none;
  -webkit-user-drag: none;
`

// const HtmlPoiDot = styled.div`
//   width: 20px;
//   height: 20px;
//   border-radius: 50%;
//   background: ${({ $isCharging }) => ($isCharging ? '#16a34a' : '#f59e0b')};
//   border: 2px solid #fff;
//   box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
// `

// 라벨-마커 연결부는 poiMarkerSvg(HtmlPoiIcon)가 담당하므로 별도 화살표 불필요.
// Figma: 배경 rgba(255,255,255,0.8) + 레이어 opacity 80% 이 별도로 곱해짐
// (배경 실효 알파 0.64, 텍스트 알파 0.8) — 두 값을 그대로 반영.
const HtmlPoiLabel = styled.div`
  font-size: 12px;
  color: #484848;
  white-space: nowrap;
  font-weight: 600;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.8);
  opacity: 0.8;
  padding: 4px 8px;
  border-radius: 4px;
`

// ─── 3D mesh data from SVG paths ──────────────────────────────────────────────

const WALL_HEIGHT = 30 // SVG units to extrude wall/boundary strokes upward (legacy fallback)
const WALL_STROKE_MIN = 3 // strokes >= this width are treated as 3D walls/boundaries
const LAYER_STEP = 0.05 // per-layer lift to avoid flat-on-flat z-fighting

// data-unit → meters. 3D 높이(data-height/data-base)는 이 단위로 해석한 뒤
// 지도 축척(pxPerMeter)으로 지도 좌표계 단위로 환산한다.
const UNIT_TO_METERS = { mm: 0.001, cm: 0.01, m: 1 }

// Build a vertical wall along a 2D polyline, from z=zBottom(바닥) to z=zTop(윗면).
// Only the boundary line gets height — the enclosed area stays open floor.
function buildWallGeometry(points, zBottom, zTop) {
  const pos = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6) continue
    // quad (a,b) from z=zBottom to z=zTop → two triangles
    pos.push(a.x, a.y, zBottom, b.x, b.y, zBottom, b.x, b.y, zTop)
    pos.push(a.x, a.y, zBottom, b.x, b.y, zTop, a.x, a.y, zTop)
  }
  if (!pos.length) return null
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  return geo
}

// Read a data-* attribute from the original SVG DOM node SVGLoader kept.
function getNodeAttr(path, name) {
  const node = path?.userData?.node
  if (node && typeof node.getAttribute === 'function') {
    return node.getAttribute(name)
  }
  return null
}

function useSvgMeshData(svgText, pxPerMeter) {
  const data = useMemo(() => {
    const empty = { floors: [], walls: [], lines: [] }
    if (!svgText) return empty
    try {
      const loader = new SVGLoader()
      const { paths } = loader.parse(svgText)
      const floors = []
      const walls = []
      const lines = []
      let order = 0

      // data-height/data-base 값(data-unit 단위)을 지도 좌표계 단위로 환산.
      // 축척(pxPerMeter)을 알 수 없으면(레거시) 값을 그대로 사용.
      const toWorldZ = (v, unit) => {
        if (!Number.isFinite(v)) return 0
        if (pxPerMeter && pxPerMeter > 0) {
          const meters = v * (UNIT_TO_METERS[unit] ?? UNIT_TO_METERS.mm)
          return meters * pxPerMeter
        }
        return v
      }

      // Height-annotated mode: if the SVG provides data-height on any element,
      // height comes from that attribute and we skip the stroke-width heuristic.
      const heightAnnotated = paths.some((p) => {
        const h = parseFloat(getNodeAttr(p, 'data-height'))
        return Number.isFinite(h) && h > 0
      })

      for (const path of paths) {
        const style = path.userData?.style ?? {}
        const fill = style.fill
        const stroke = style.stroke
        const hasFill = fill && fill !== 'none'
        const hasStroke = stroke && stroke !== 'none'
        const strokeW = parseFloat(style.strokeWidth ?? '1') || 1

        // 높이 판정: data-height(윗면) / data-base(바닥) / data-unit(단위)
        const dataHeight = parseFloat(getNodeAttr(path, 'data-height'))
        const dataBase = parseFloat(getNodeAttr(path, 'data-base'))
        const dataUnit = (getNodeAttr(path, 'data-unit') || 'mm').trim().toLowerCase()
        const hasHeight = Number.isFinite(dataHeight) && dataHeight > 0

        // 드롭섀도우 복제본: 같은 벽을 transform(translate)로 살짝 옮겨 그린 2D 그림자.
        // 3D에서는 원본과 같은 높이로 압출되어 겹치는 중복 볼륨 → z-fighting 유발하므로
        // 압출 대상에서 제외한다(원본 벽만 3D로 세운다).
        const nodeTransform = getNodeAttr(path, 'transform')
        if (hasHeight && nodeTransform && /translate/i.test(nodeTransform)) continue

        // Any element with data-height gets extruded (base~top). Otherwise, only
        // legacy SVGs (no data-height anywhere) fall back to the stroke-width heuristic.
        const isWall = hasHeight || (!heightAnnotated && hasStroke && strokeW >= WALL_STROKE_MIN)

        // 바닥(zBottom)~윗면(zTop)을 지도 좌표계 단위로 환산
        const zBottom = hasHeight ? toWorldZ(Number.isFinite(dataBase) ? dataBase : 0, dataUnit) : 0
        const zTop = hasHeight ? toWorldZ(dataHeight, dataUnit) : WALL_HEIGHT
        const wallHeight = Math.max(0, zTop - zBottom)

        if (isWall) {
          // 3D element — apply Z from data-base(바닥) to data-height(윗면).
          if (hasFill) {
            // filled footprint → solid extruded volume (base~top)
            for (const shape of SVGLoader.createShapes(path)) {
              const geo = new THREE.ExtrudeGeometry(shape, { depth: wallHeight, bevelEnabled: false })
              if (zBottom) geo.translate(0, 0, zBottom)
              walls.push({ geo, color: hasFill ? fill : stroke })
            }
          } else if (hasStroke) {
            // stroke line → vertical wall along the polyline (base~top)
            for (const sub of path.subPaths) {
              const geo = buildWallGeometry(sub.getPoints(), zBottom, zTop)
              if (geo) walls.push({ geo, color: stroke })
            }
          }
          continue
        }

        // Non-wall → treated as floor (z = 0)
        // Filled regions → flat colored floor (rooms, furniture, base floor)
        if (hasFill) {
          for (const shape of SVGLoader.createShapes(path)) {
            const geo = new THREE.ShapeGeometry(shape)
            geo.translate(0, 0, order * LAYER_STEP) // paint-order stacking
            floors.push({
              geo,
              color: fill,
              opacity: parseFloat(style.fillOpacity ?? '1')
            })
            order++
          }
        }

        // Strokes → flat detail lines on the floor
        if (hasStroke) {
          for (const sub of path.subPaths) {
            const geo = SVGLoader.pointsToStroke(sub.getPoints(), { ...style, strokeWidth: strokeW })
            if (geo) {
              geo.translate(0, 0, order * LAYER_STEP)
              lines.push({
                geo,
                color: stroke,
                opacity: parseFloat(style.strokeOpacity ?? '1')
              })
              order++
            }
          }
        }
      }
      return { floors, walls, lines }
    } catch (e) {
      console.error('SVGLoader parse error:', e)
      return empty
    }
  }, [svgText, pxPerMeter])

  // Dispose geometries when svgText changes
  useEffect(() => {
    return () => {
      data.floors.forEach((d) => d.geo.dispose())
      data.walls.forEach((d) => d.geo.dispose())
      data.lines.forEach((d) => d.geo.dispose())
    }
  }, [data])

  return data
}

// ─── scene components ─────────────────────────────────────────────────────────

// SVG path group.
// scale.y = -1  →  flip SVG Y-down to Y-up
// rotation.x = -PI/2  →  lay XY plane flat onto XZ plane
// Net mapping: local (x, y, z) → world (x, z, y)
//   → flat shapes at local z=0 lie on the ground (world y=0)
//   → wall geometry extruded into local +z rises along world +y ✓
function SvgMeshGroup({ svgText, pxPerMeter }) {
  const { floors, walls, lines } = useSvgMeshData(svgText, pxPerMeter)
  if (!floors.length && !walls.length && !lines.length) return null
  const nf = floors.length
  return (
    <group scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* filled regions → flat colored floor.
          coplanar z-fighting 제거: depthWrite off + renderOrder 페인터순서 +
          polygonOffset(깊이버퍼 상대 바이어스, 좌표 스케일 무관)로 레이어를 단계적으로 분리.
          벽과의 가림은 depthTest로 유지. */}
      {floors.map((d, i) => (
        <mesh key={`f${i}`} geometry={d.geo} renderOrder={i}>
          <meshBasicMaterial
            color={d.color}
            transparent={d.opacity < 0.99}
            opacity={d.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-(i + 1)}
          />
        </mesh>
      ))}
      {/* thin strokes → flat detail lines (바닥보다 항상 앞) */}
      {lines.map((d, i) => (
        <mesh key={`l${i}`} geometry={d.geo} renderOrder={1000 + i}>
          <meshBasicMaterial
            color={d.color}
            transparent={d.opacity < 0.99}
            opacity={d.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-(nf + i + 1)}
          />
        </mesh>
      ))}
      {/* filled/stroke → extruded 3D volumes·walls.
          같은 높이로 겹친 얇은 색상 블록의 면 z-fighting 방지: renderOrder 순서대로
          polygonOffset을 단계적으로 부여(겹친 면은 나중 것이 이김). */}
      {walls.map((d, i) => (
        <mesh key={`w${i}`} geometry={d.geo} renderOrder={2000 + i} castShadow>
          <meshLambertMaterial
            color={d.color}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-(i + 1)}
          />
        </mesh>
      ))}
    </group>
  )
}

// PNG map as textured floor plane (for non-SVG maps)
function PngFloor({ pngUrl, navi }) {
  const [tex, setTex] = useState(null)
  const [imgSize, setImgSize] = useState(null)
  const texRef = useRef(null)

  useEffect(() => {
    if (!pngUrl) return
    const loader = new THREE.TextureLoader()
    loader.load(pngUrl, (t) => {
      texRef.current = t
      setImgSize({ w: t.image.width, h: t.image.height })
      setTex(t)
    })
    return () => {
      texRef.current?.dispose()
      texRef.current = null
    }
  }, [pngUrl])

  if (!tex || !imgSize || !navi) return null

  const res = navi.resolution
  const [ox, oy] = navi.origin
  const cx = ox + (imgSize.w * res) / 2
  const cy = oy + (imgSize.h * res) / 2

  return (
    <mesh position={[cx, 0, -cy]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[imgSize.w * res, imgSize.h * res]} />
      {/* toneMapped=false → ACES 톤매핑이 흰색(자유 영역)을 회색으로 낮추지 않도록 원색 유지 */}
      <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}

// 로봇 마커 기준 높이(미터). 맵 축척 변환 후 최소 크기 보장에 사용.
const ROBOT_ICON_FALLBACK_H = 1.5

// Robot marker for 3D: 상태별 구체 아이콘 + 라벨
function RobotPin({ position, color, name, state, ringRadius, worldHeight, yaw = 0, clickable, onClick }) {
  useEffect(
    () => () => {
      document.body.style.cursor = 'auto'
    },
    []
  )

  const setCursor = (v) => {
    if (clickable) document.body.style.cursor = v
  }
  const handleClick = (e) => {
    if (!clickable || !onClick) return
    e.stopPropagation()
    onClick()
  }

  const hitH = worldHeight || ringRadius * 3

  return (
    <group position={position}>
      {/* invisible hit volume — reliable click target over the whole robot */}
      {clickable && (
        <mesh
          position={[0, hitH / 2, 0]}
          onClick={handleClick}
          onPointerOver={() => setCursor('pointer')}
          onPointerOut={() => setCursor('auto')}
        >
          <cylinderGeometry args={[ringRadius * 1.15, ringRadius * 1.15, hitH, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* 상태별 구체 아이콘 — 조명을 받아 입체적으로 보임 */}
      <group position={[0, ringRadius, 0]}>
        <RobotSphereIcon state={state} radius={ringRadius} />
      </group>

      {/* label anchored at the ring's near edge (world space) */}
      <Html position={[0, 0, ringRadius]} zIndexRange={[100, 0]} style={{ pointerEvents: clickable ? 'auto' : 'none' }}>
        <div
          onClick={onClick}
          style={{
            transform: 'translate(-50%, 2px)',
            padding: '4px 8px',
            borderRadius: 6,
            background: color,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: clickable ? 'pointer' : 'default',
            border: '1.5px solid rgba(255,255,255,0.85)',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
          }}
        >
          {name} / {state}
        </div>
      </Html>
    </group>
  )
}

// POI marker — identical visual to the 2D SiteMap
function PoiPin({ position, isCharging, label, clickable, onClick }) {
  return (
    <Html position={position} zIndexRange={[100, 0]} style={{ pointerEvents: clickable ? 'auto' : 'none' }}>
      <HtmlPoiMarker>
        <HtmlPoiLabel
          onClick={clickable ? onClick : undefined}
          style={{
            pointerEvents: clickable ? 'auto' : 'none', // styled의 pointer-events:none 을 덮어씀
            cursor: clickable ? 'pointer' : 'default'
          }}
        >
          {label}
        </HtmlPoiLabel>
        <HtmlPoiIcon src={poiMarkerSvg} alt={label} draggable={false} />
      </HtmlPoiMarker>
    </Html>
  )
}

// Position the camera for the current view mode (2D top-down / 3D angled).
function CameraRig({ mode, controlsRef, fitKey }) {
  const { camera, size, scene } = useThree()
  // fitKey/크기/모드가 바뀌면 재fit 하도록 무장 해제. 맵 콘텐츠(특히 PNG는 텍스처를
  // 비동기 로드)가 준비될 때까지 useFrame에서 매 프레임 재시도 후 한 번만 fit한다.
  const fittedRef = useRef(false)
  useEffect(() => {
    fittedRef.current = false
  }, [mode, size.width, size.height, fitKey])

  useFrame(() => {
    if (fittedRef.current) return
    // 맵 지오메트리(바닥/벽)의 실제 월드 바운딩 박스로 fit → SVG/PNG·단위·원점과
    // 무관하게 정확. 맵 밖에 위치한 로봇/POI는 제외해야 맵이 렌더 영역에 꽉 참.
    scene.updateMatrixWorld(true)
    const mapObj = scene.getObjectByName('map-content')
    if (!mapObj) return
    const box = new THREE.Box3().setFromObject(mapObj)
    if (box.isEmpty()) return
    const center = new THREE.Vector3()
    box.getCenter(center)

    // 시점 방향(중심 → 카메라). 2D=정수직 하향, 3D=비스듬한 각도
    const dir =
      mode === '2D' ? new THREE.Vector3(0, 1, 0.0001).normalize() : new THREE.Vector3(0, 0.8, 0.55).normalize()

    // 카메라 화면 기준축(right/up) 구성 → 박스를 이 축에 투영해 실제 화면 점유폭 계산
    const forward = dir.clone().negate() // 카메라가 바라보는 방향(-dir)
    const worldUp = new THREE.Vector3(0, 1, 0)
    let right = new THREE.Vector3().crossVectors(worldUp, forward)
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0) // 정수직 뷰 방지
    right.normalize()
    const up = new THREE.Vector3().crossVectors(forward, right).normalize()

    // 박스 8개 코너를 right/up/forward 축에 투영한 반폭(hw)·반높이(hh)·반깊이(hd)
    let hw = 0
    let hh = 0
    let hd = 0
    for (const xi of [box.min.x, box.max.x]) {
      for (const yi of [box.min.y, box.max.y]) {
        for (const zi of [box.min.z, box.max.z]) {
          const p = new THREE.Vector3(xi, yi, zi).sub(center)
          hw = Math.max(hw, Math.abs(p.dot(right)))
          hh = Math.max(hh, Math.abs(p.dot(up)))
          hd = Math.max(hd, Math.abs(p.dot(forward)))
        }
      }
    }
    if (!Number.isFinite(hw) || (hw === 0 && hh === 0)) return

    // 렌더 영역 종횡비 + 카메라 수직/수평 화각으로 박스가 딱 들어오는 거리 계산
    const aspect = size.width / Math.max(size.height, 1)
    const vFov = (camera.fov * Math.PI) / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
    // FILL < 1 → 렌더 영역을 꽉 채우도록 카메라를 더 당김(상하 가장자리 약간 크롭 허용).
    // 값을 낮출수록 더 크게(더 많이 크롭). 1.0 = 크롭 없음.
    const FILL = 0.82
    const dist = (Math.max(hh / Math.tan(vFov / 2), hw / Math.tan(hFov / 2)) + hd) * FILL

    camera.near = Math.max(dist / 1000, 0.01)
    camera.far = dist * 10

    // 기울어진 3D 뷰에서 가까운 변(화면 아래)이 크게 보여 콘텐츠가 아래로 쏠린다.
    // 카메라·타깃을 화면-세로(-up)로 패닝해 맵 이미지를 위로 올리고 위쪽 여백을 줄인다.
    const V_SHIFT = 0.1 // hh 대비 위로 이동 비율(클수록 맵이 위로, 낮출수록 아래로)
    const aim = center.clone().add(up.clone().multiplyScalar(-hh * V_SHIFT))

    camera.position.copy(aim.clone().add(dir.clone().multiplyScalar(dist)))
    camera.lookAt(aim)
    camera.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.copy(aim)
      controlsRef.current.enableRotate = mode === '3D'
      controlsRef.current.minDistance = Math.max(hh, hw) * 0.1
      controlsRef.current.maxDistance = dist * 4
      controlsRef.current.update()
    }

    fittedRef.current = true // 최초 1회만 fit (이후 사용자 줌/팬 유지)
  })

  return null
}

// ─── styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: ${({ $fullscreen }) => ($fullscreen ? 'fixed' : 'relative')};
  inset: ${({ $fullscreen }) => ($fullscreen ? '0' : 'auto')};
  width: 100%;
  height: ${({ $fullscreen, $height }) => ($fullscreen ? '100vh' : $height || '500px')};
  z-index: ${({ $fullscreen }) => ($fullscreen ? 1000 : 'auto')};
  background: #ffffff;
`

const ControlsHint = styled.div`
  position: absolute;
  bottom: 10px;
  left: 12px;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  font-size: 11px;
  color: rgba(0, 0, 0, 0.6);
  pointer-events: none;
  user-select: none;
  z-index: 2;
`

const TopRightTools = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
`

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  color: #374151;

  &:hover {
    background: #ffffff;
  }
`

const RotateBadge = styled.div`
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 12px;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.92);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  z-index: 3;
`

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  pointer-events: none;
`

const ViewToggle = styled.div`
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 2px;
  /* 전체화면 아이콘 버튼(32px)과 높이 일치 */
  height: 32px;
  box-sizing: border-box;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
`

const ViewToggleButton = styled.button`
  border: none;
  cursor: pointer;
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#ffffff' : '#374151')};
  background: ${({ $active }) => ($active ? '#3b82f6' : 'transparent')};
  transition: background 0.15s;

  &:hover {
    background: ${({ $active }) => ($active ? '#3b82f6' : 'rgba(0, 0, 0, 0.06)')};
  }
`

// expand / compress icons (inline so we don't depend on the icon set)
const ExpandIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
)
const CompressIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
)

const isTouchDevice = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

// Guide text per view-mode and device (i18n).
const guideText = (t, mode, touch) => {
  if (mode === '2D') {
    return t(touch ? 'map.guide2dTouch' : 'map.guide2dMouse')
  }
  return t(touch ? 'map.guide3dTouch' : 'map.guide3dMouse')
}

// ─── main component ───────────────────────────────────────────────────────────

// 대시보드/TV 대시보드가 공유하는 2D/3D 뷰 설정 localStorage 키.
// 대시보드에서 고른 값을 저장하면 TV 대시보드가 같은 값을 읽어 그대로 표시한다.
export const DASHBOARD_MAP_VIEW_KEY = 'robot.dashboardMapViewMode'

const SiteMap3D = ({
  mapData,
  robotDatas = [],
  mapServer,
  clickRobot = false,
  clickPoi = false, // ← 추가: POI 클릭 활성화
  onMovePoi = null, // ← 추가: '이동' 확정 시 실행할 콜백(poi)
  height = '500px',
  only2D = false,
  mapApplyControl = null,
  viewModeKey = null, // 지정 시 2D/3D 선택을 localStorage에 저장·복원 (대시보드↔TV 공유)
  showControls = true // false면 2D/3D 토글·전체화면 버튼 숨김 (TV 대시보드)
}) => {
  const { t, i18n } = useTranslation('robot')
  const [svgText, setSvgText] = useState(null)
  const [svgSize, setSvgSize] = useState(null)
  const [multigrid, setMultigrid] = useState(null)
  const [pngUrl, setPngUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState(() => {
    if (viewModeKey && typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(viewModeKey)
      if (saved === '2D' || saved === '3D') return saved
    }
    return '2D'
  })
  const [dragging, setDragging] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const [rotateMode, setRotateMode] = useState(false)
  const [poiToMove, setPoiToMove] = useState(null)
  const blobRef = useRef(null)
  const controlsRef = useRef()
  const canvasWrapRef = useRef(null)
  const longPressRef = useRef({ timer: null, startX: 0, startY: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    setIsTouch(isTouchDevice())
  }, [])

  // viewModeKey가 있으면 2D/3D 선택을 localStorage에 저장 (대시보드가 고른 값 유지)
  useEffect(() => {
    if (viewModeKey && typeof window !== 'undefined') {
      window.localStorage.setItem(viewModeKey, viewMode)
    }
  }, [viewMode, viewModeKey])

  // 다른 탭/화면(예: 대시보드)에서 값이 바뀌면 반영 → TV 대시보드가 실시간으로 따라감
  useEffect(() => {
    if (!viewModeKey || typeof window === 'undefined') return
    const onStorage = (e) => {
      if (e.key === viewModeKey && (e.newValue === '2D' || e.newValue === '3D')) {
        setViewMode(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [viewModeKey])

  // Exit fullscreen with Esc
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // 3D + touch: long-press (2s, mostly still) enters rotate mode; exit by tapping
  // the badge. While on, one finger rotates; two fingers still zoom/pan.
  useEffect(() => {
    if (viewMode !== '3D' || !isTouch) return
    const el = canvasWrapRef.current
    if (!el) return

    const MOVE_TOL = 12
    const clearTimer = () => {
      if (longPressRef.current.timer) {
        clearTimeout(longPressRef.current.timer)
        longPressRef.current.timer = null
      }
    }

    const onStart = (e) => {
      if (e.touches.length !== 1) {
        clearTimer()
        return
      }
      const t = e.touches[0]
      longPressRef.current.startX = t.clientX
      longPressRef.current.startY = t.clientY
      clearTimer()
      longPressRef.current.timer = setTimeout(() => setRotateMode(true), 2000)
    }
    const onMove = (e) => {
      const t = e.touches[0]
      if (!t) return
      if (
        Math.abs(t.clientX - longPressRef.current.startX) > MOVE_TOL ||
        Math.abs(t.clientY - longPressRef.current.startY) > MOVE_TOL
      ) {
        clearTimer()
      }
    }
    const onEnd = () => {
      clearTimer()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      clearTimer()
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
      setRotateMode(false)
    }
  }, [viewMode, isTouch])

  // Reset 3D geometry source when the map changes.
  useEffect(() => {
    setSvgText(null)
    setSvgSize(null)
    setMultigrid(null)
    setPngUrl(null)
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
    }
  }, [mapData])

  // Lazily load the 3D geometry source only when the 3D view is used.
  useEffect(() => {
    if (viewMode !== '3D' || !mapData?.url) return
    if (svgText || pngUrl) return
    let canceled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(mapData.url)
        if (!res.ok || canceled) return

        if (mapData.type === 'svg') {
          const text = await res.text()
          if (canceled) return
          setSvgText(text)
          setSvgSize(parseSvgSize(text))
          setMultigrid(parseMultigrid(text))
        } else {
          const blob = await res.blob()
          if (canceled) return
          if (blobRef.current) URL.revokeObjectURL(blobRef.current)
          blobRef.current = URL.createObjectURL(blob)
          setPngUrl(blobRef.current)
        }
      } catch (e) {
        console.error('SiteMap3D load error:', e)
      } finally {
        if (!canceled) setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [viewMode, mapData, svgText, pngUrl])

  // Revoke any object URL on unmount.
  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current)
    }
  }, [])

  const navi = mapServer?.navi
  const isSvg = !!svgText

  // Scene dimensions for camera setup
  const { cx, cz, span } = useMemo(() => {
    if (isSvg && svgSize) {
      const w = svgSize.width
      const h = svgSize.height
      return { cx: w / 2, cz: h / 2, span: Math.max(w, h) }
    }
    if (navi?.origin) {
      const [ox, oy] = navi.origin
      return { cx: ox, cz: -oy, span: 200 }
    }
    return { cx: 0, cz: 0, span: 200 }
  }, [isSvg, svgSize, navi])

  // Robot marker positions (+ world-space heading from ROS theta)
  const robots = useMemo(() => {
    if (!navi?.resolution || !navi?.origin) return []
    // map ROS (x,y) → world (x, z); reused for the heading sample point so the
    // yaw is correct under any MULTIGRID rotation/flip.
    const toWorld = (wx, wy) => {
      if (isSvg) {
        const p = worldToSvgPixel(wx, wy, navi, multigrid, svgSize?.height)
        return [p.x, p.y]
      }
      return [wx, -wy]
    }
    return robotDatas
      .filter((r) => r?.x != null && r?.y != null)
      .map((r) => {
        const rx = Number(r.x)
        const ry = Number(r.y)
        const [x, z] = toWorld(rx, ry)
        let yaw = 0
        if (r.theta != null && Number.isFinite(Number(r.theta))) {
          const t = Number(r.theta)
          // sample a point 1 m ahead in ROS frame, transform, derive world yaw.
          const [fx, fz] = toWorld(rx + Math.cos(t), ry + Math.sin(t))
          // rotation about world +Y by φ maps +X → (cosφ, 0, -sinφ)
          yaw = Math.atan2(-(fz - z), fx - x)
        }
        return { ...r, pos: [x, 0, z], yaw }
      })
  }, [robotDatas, navi, multigrid, isSvg, svgSize])

  // POI marker positions
  const pois = useMemo(() => {
    if (!navi?.resolution || !navi?.origin) return []
    return (mapServer?.poi?.pois ?? []).map((poi) => {
      let x, z
      if (isSvg) {
        const p = worldToSvgPixel(poi.x, poi.y, navi, multigrid, svgSize?.height)
        x = p.x
        z = p.y
      } else {
        x = poi.x
        z = -poi.y
      }
      return { ...poi, pos: [x, 0, z] }
    })
  }, [mapServer, navi, multigrid, isSvg, svgSize])

  // 지도 좌표계 단위 / 실제 미터 비율. SVG 모드는 (MULTIGRID scale)/resolution,
  // PNG 모드는 이미 미터 단위이므로 1. 로봇 모델 크기와 3D 높이(mm 등) 환산에 공용.
  const pxPerMeter = useMemo(() => {
    const res = navi?.resolution
    if (!res) return null
    if (!isSvg) return 1
    return (multigrid ? Math.hypot(multigrid.matrix[0], multigrid.matrix[1]) : 1) / res
  }, [navi, isSvg, multigrid])

  // Robot marker sizing: 1.5m 기준 높이를 맵 좌표계 단위로 변환.
  // 맵이 크더라도 span 의 3% 이상으로 유지해 항상 보이도록 보정.
  const { ringRadius, worldHeight } = useMemo(() => {
    const pxPerM = pxPerMeter || 1
    const targetH = Math.max(ROBOT_ICON_FALLBACK_H * pxPerM, span * 0.03)
    return {
      ringRadius: Math.max(targetH * 0.4, span * 0.02),
      worldHeight: targetH
    }
  }, [pxPerMeter, span])

  const content = (
    <Wrapper $fullscreen={fullscreen} $height={height}>
      {(showControls || mapApplyControl) && (
        <TopRightTools>
          {!only2D && showControls && (
            <ViewToggle>
              <ViewToggleButton $active={viewMode === '2D'} onClick={() => setViewMode('2D')}>
                2D
              </ViewToggleButton>
              <ViewToggleButton $active={viewMode === '3D'} onClick={() => setViewMode('3D')}>
                3D
              </ViewToggleButton>
            </ViewToggle>
          )}
          {mapApplyControl && (
            <ViewToggle>
              <ViewToggleButton $active={mapApplyControl.applied} onClick={() => mapApplyControl.onChange(true)}>
                사용자
              </ViewToggleButton>
              <ViewToggleButton $active={!mapApplyControl.applied} onClick={() => mapApplyControl.onChange(false)}>
                원본
              </ViewToggleButton>
            </ViewToggle>
          )}
          {showControls && (
            <IconButton
              onClick={() => setFullscreen((v) => !v)}
              title={fullscreen ? t('map.exitFullscreen') : t('map.fullscreen')}
              aria-label={fullscreen ? t('map.exitFullscreen') : t('map.fullscreen')}
            >
              {fullscreen ? <CompressIcon /> : <ExpandIcon />}
            </IconButton>
          )}
        </TopRightTools>
      )}

      {viewMode === '2D' ? (
        // 2D: reuse the crisp vector SVG renderer (true colors, canvas-fit, HTML markers)
        <SiteMap
          mapData={mapData}
          robotDatas={robotDatas}
          mapServer={mapServer}
          clickRobot={clickRobot}
          clickPoi={clickPoi && !fullscreen}
          onPoiClick={setPoiToMove}
          height={fullscreen ? '100%' : height}
        />
      ) : (
        <div ref={canvasWrapRef} style={{ position: 'absolute', inset: 0 }}>
          {loading && <LoadingOverlay>{t('map.loading')}</LoadingOverlay>}
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [cx, span * 0.8, cz + span * 0.55], up: [0, 1, 0], fov: 50 }}
            gl={{ antialias: true, logarithmicDepthBuffer: true }}
            style={{ width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'grab' }}
            resize={{ offsetSize: true }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <color attach="background" args={['#ffffff']} />
            <ambientLight intensity={0.6} />
            <hemisphereLight args={['#ffffff', '#c8cdd8', 0.7]} />
            <directionalLight position={[40, 120, 60]} intensity={0.85} />
            <directionalLight position={[-50, 60, -40]} intensity={0.3} />

            <CameraRig mode={viewMode} controlsRef={controlsRef} fitKey={isSvg ? svgText : pngUrl} />

            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.1}
              screenSpacePanning
              minDistance={1}
              maxDistance={span * 8}
              onStart={() => setDragging(true)}
              onEnd={() => setDragging(false)}
              mouseButtons={{
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE
              }}
              touches={{
                ONE: rotateMode ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN,
                TWO: THREE.TOUCH.DOLLY_PAN
              }}
            />

            {/* 맵 지오메트리(바닥/벽)만 fit 대상 → 맵 밖 로봇 때문에 축소되지 않도록 named group으로 감쌈 */}
            <group name="map-content">
              {isSvg ? (
                <SvgMeshGroup svgText={svgText} pxPerMeter={pxPerMeter} />
              ) : (
                <PngFloor pngUrl={pngUrl} navi={navi} />
              )}
            </group>

            {robots.map((r) => (
              <RobotPin
                key={r.deviceId}
                position={r.pos}
                color={stateColor(r.robotState)}
                name={r.deviceName}
                state={r.robotState}
                ringRadius={ringRadius}
                worldHeight={worldHeight}
                yaw={r.yaw}
                clickable={clickRobot}
                onClick={clickRobot ? () => navigate('/robot/management/detail?deviceId=' + r.deviceId) : undefined}
              />
            ))}

            {pois.map((poi) => (
              <PoiPin
                key={poi.poiId}
                position={poi.pos}
                isCharging={poi.type === 'CHARGING'}
                label={getLocalizedName(poi.name, i18n.language)}
                clickable={clickPoi && !fullscreen && poi.type !== 'CHARGING'}
                onClick={() => setPoiToMove(poi)}
              />
            ))}
          </Canvas>
        </div>
      )}

      {viewMode === '3D' && rotateMode && (
        <RotateBadge onClick={() => setRotateMode(false)}>{t('map.rotateMode')}</RotateBadge>
      )}
      <ControlsHint>{guideText(t, viewMode, isTouch)}</ControlsHint>

      {poiToMove && (
        <Modal
          isOpen={!!poiToMove}
          size="xs"
          onClose={() => setPoiToMove(null)}
          renderButtonComponent={
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <ModalButton variant="outlined" theme="default" onClick={() => setPoiToMove(null)}>
                {t('cancel')}
              </ModalButton>
              <ModalButton
                variant="contained"
                theme="primary"
                disabled={poiToMove.type === 'CHARGING'} // ← CHARGING이면 '이동' 비활성화
                onClick={() => {
                  onMovePoi?.(poiToMove)
                  setPoiToMove(null)
                }}
              >
                이동
              </ModalButton>
            </div>
          }
        >
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p className="typographyBody2">
              {`장소 이동을 실행하겠습니까? (목적지 : ${getLocalizedName(poiToMove.name, i18n.language)})`}
            </p>
          </div>
        </Modal>
      )}
    </Wrapper>
  )

  // In fullscreen, portal to <body> so the map escapes the app's content
  // stacking context (.scrollArea z-index:80) and overlays the header.
  return fullscreen ? createPortal(content, document.body) : content
}

export default SiteMap3D
