// components/RobotVisualization.jsx
import React, { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import URDFLoader from 'urdf-loader'

import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

import { pickNearestJointStateSample, applyJointStateToRobot } from './urdf/jointStateBinding'

/**
 * RobotVisualization (URDF + MCAP /joint_states)
 */

function fitCameraToBox(camera, controlsRef, box, padding = 1.6) {
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (!Number.isFinite(maxDim) || maxDim <= 0) return

  const fov = (camera.fov * Math.PI) / 180
  const dist = (maxDim / 2 / Math.tan(fov / 2)) * padding

  const dir = new THREE.Vector3(1, 0.8, 1).normalize()
  camera.position.copy(center.clone().add(dir.multiplyScalar(dist)))

  // ✅ 반드시 추가
  camera.lookAt(center)

  // ✅ near를 충분히 작게, far는 충분히 크게
  camera.near = 0.01
  camera.far = 1000
  camera.updateProjectionMatrix()

  if (controlsRef?.current) {
    controlsRef.current.target.copy(center)
    controlsRef.current.update()
  }
}

// 로봇 메시 영구 캐시(세션 단위) — 로그 전환/재진입 시 재다운로드/재파싱 방지.
// - 클론들이 geometry를 공유하므로 캐시 항목은 dispose하지 않고 계속 보관한다.
// - 새 로봇(다른 메시 경로)을 열면 새 키로 추가될 뿐, 기존 항목은 유지(메모리 ↔ 속도 트레이드오프).
const GLOBAL_MESH_CACHE = new Map() // key(요청 경로) -> THREE.Object3D 프로토타입
// 메시 머티리얼 1개를 세션 내내 공유(캐시된 메시가 참조하므로 dispose하지 않는다).
const SHARED_ROBOT_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xcfd6e6, roughness: 0.5, metalness: 0.1 })

// ───────────── STL 파싱 워커 풀(세션 영구) ─────────────
// 파싱을 메인 스레드 밖에서 병렬 처리 → UI 멈춤 제거 + 메시 동시 파싱으로 wall-clock 단축.
const STL_WORKER_POOL = []
const STL_WORKER_PENDING = new Map() // id -> { resolve, reject }
let _stlReqId = 0
let _stlPoolInit = false
let _stlRR = 0

function getStlWorkerPool() {
  if (_stlPoolInit) return STL_WORKER_POOL
  _stlPoolInit = true
  const n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1))
  for (let i = 0; i < n; i++) {
    let w = null
    try {
      w = new Worker(new URL('./urdf/stlParseWorker.js', import.meta.url), { type: 'module' })
    } catch {
      w = null
    }
    if (!w) continue
    w.onmessage = (e) => {
      const { id, ok, position, normal, index, error } = e.data || {}
      const p = STL_WORKER_PENDING.get(id)
      if (!p) return
      STL_WORKER_PENDING.delete(id)
      if (ok) p.resolve({ position, normal, index })
      else p.reject(new Error(error || 'stl worker parse failed'))
    }
    w.onerror = () => {} // 개별 메시 실패는 호출부에서 폴백 처리
    STL_WORKER_POOL.push(w)
  }
  return STL_WORKER_POOL
}

// ArrayBuffer를 워커로 transfer해 파싱 → 속성 배열 반환
function parseStlInWorker(arrayBuffer) {
  const pool = getStlWorkerPool()
  if (!pool.length) return Promise.reject(new Error('no stl worker'))
  const id = ++_stlReqId
  const w = pool[_stlRR++ % pool.length]
  return new Promise((resolve, reject) => {
    STL_WORKER_PENDING.set(id, { resolve, reject })
    w.postMessage({ id, buffer: arrayBuffer }, [arrayBuffer])
  })
}

// 워커가 돌려준 속성 배열로 BufferGeometry 재구성
function buildGeometryFromArrays({ position, normal, index }) {
  const geo = new THREE.BufferGeometry()
  if (position) geo.setAttribute('position', new THREE.BufferAttribute(position, 3))
  if (normal) geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  if (index) geo.setIndex(new THREE.BufferAttribute(index, 1))
  if (!normal) {
    try {
      geo.computeVertexNormals()
    } catch {}
  }
  return geo
}

function URDFRobot({ robotRef, controlsRef, robotDescription }) {
  const { scene, camera } = useThree()

  useEffect(() => {
    // ✅ baseURI 기반으로 계산 (서브패스 안전)
    const urdfUrl = new URL('urdf/hmc_v2_hand/hmc_v2_hand.urdf', document.baseURI).toString()
    const urdfRoot = new URL('urdf/hmc_v2_hand/', document.baseURI).toString()

    const manager = new THREE.LoadingManager()
    if (typeof manager.resolveURL !== 'function') manager.resolveURL = (url) => url

    const loader = new URDFLoader(manager)

    const piperRoot = new URL('urdf/ButlerModel_ver2_bracket/', document.baseURI).toString().replace(/\/$/, '')

    // 알려진 패키지는 기존과 동일하게 매핑(동작 불변),
    // 미등록 패키지(예: 새 MCAP의 cloid_description)는 public/urdf/<패키지명> 규약으로 폴백.
    // → object 매핑일 때 발생하던 "not found in provided package list" 에러 폭주도 제거됨.
    // - hmc_description: 신규 MCAP의 URDF가 쓰는 패키지명. 담당자 안내대로 기존 hmc_v2_hand 메시를 재사용.
    const KNOWN_PACKAGE_ROOTS = {
      piper_description: piperRoot,
      hmc_v2_hand_description: urdfRoot,
      hmc_description: urdfRoot
    }
    loader.packages = (targetPkg) => {
      if (KNOWN_PACKAGE_ROOTS[targetPkg]) return KNOWN_PACKAGE_ROOTS[targetPkg]
      // 폴백: public/urdf/<pkg> 아래에 메시가 있다고 가정
      return new URL(`urdf/${targetPkg}`, document.baseURI).toString()
    }

    // ✅ material 1개를 세션 내내 공유 (캐시된 메시가 참조 → effect마다 새로 만들지 않음)
    const sharedMat = SHARED_ROBOT_MATERIAL

    // mesh loaders
    const stl = new STLLoader(manager)
    const dae = new ColladaLoader(manager)
    const obj = new OBJLoader(manager)

    // ✅ mesh 캐시(세션 영구) + inflight(이번 로드 내 중복요청 합치기)
    // - meshCache: 모듈 레벨 영구 캐시 → 로그 전환/재진입 시 재다운로드 없이 즉시
    // - inflight: 같은 path가 동시에 여러 번 요청되면, 첫 1회 로딩에 콜백들을 묶어서 처리
    const meshCache = GLOBAL_MESH_CACHE // key(path) -> THREE.Object3D (prototype)
    const inflight = new Map() // key(path) -> Array<doneCb>

    const finishInflight = (key, objectOrNull) => {
      const cbs = inflight.get(key)
      inflight.delete(key)
      if (!cbs) return
      for (const cb of cbs) {
        try {
          if (objectOrNull) cb(objectOrNull.clone(true))
          else cb(null)
        } catch {
          try {
            cb(null)
          } catch {}
        }
      }
    }

    loader.loadMeshCb = (path, _manager, done) => {
      const key = String(path || '')
      const lower = key.toLowerCase()

      // ✅ 폴더명은 유지하고, 마지막 파일명만 소문자로 변환
      const fixedPath = key.replace(/[^/]+$/, (name) => name.toLowerCase())

      // ✅ cache / inflight key도 실제 요청 경로 기준으로 맞춤
      const requestKey = fixedPath

      // ✅ cache hit -> clone 반환
      const cached = meshCache.get(requestKey)
      if (cached) {
        done(cached.clone(true))
        return
      }

      // ✅ inflight hit -> 콜백만 등록하고 종료
      const inflightList = inflight.get(requestKey)
      if (inflightList) {
        inflightList.push(done)
        return
      }

      // ✅ 새 로드 시작
      inflight.set(requestKey, [done])

      if (lower.endsWith('.stl')) {
        const onGeo = (geo) => {
          // STL은 이미 normal 포함(바이너리=face normal) → 없을 때만 계산(시각 변화 없음)
          try {
            if (!geo.attributes?.normal) geo.computeVertexNormals()
          } catch {}
          const mesh = new THREE.Mesh(geo, sharedMat)
          meshCache.set(requestKey, mesh)
          finishInflight(requestKey, mesh)
        }

        // fetch → (워커 가능 시) 워커 병렬 파싱, 아니면 메인 스레드 폴백
        const loadFrom = async (url) => {
          const resp = await fetch(url)
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
          const buf = await resp.arrayBuffer()
          if (getStlWorkerPool().length) {
            const arrays = await parseStlInWorker(buf) // buf는 워커로 transfer됨
            onGeo(buildGeometryFromArrays(arrays))
          } else {
            onGeo(stl.parse(buf)) // 워커 미지원 환경 폴백(메인 파싱)
          }
        }

        // ✅ 1차: 원본 경로(URDF 참조 그대로) → 2차: 소문자 폴백(대소문자 불일치 대비)
        loadFrom(key).catch(() => {
          if (fixedPath !== key) {
            loadFrom(fixedPath).catch((err) => {
              console.error('[URDF] STL load failed:', key, err?.message || err)
              finishInflight(requestKey, null)
            })
          } else {
            console.error('[URDF] STL load failed:', key)
            finishInflight(requestKey, null)
          }
        })

        return
      }

      if (lower.endsWith('.dae')) {
        dae.load(
          fixedPath,
          (collada) => {
            const root = collada?.scene
            if (!root) {
              finishInflight(requestKey, null)
              return
            }

            // ✅ material 통일(가능한 범위에서)
            try {
              root.traverse((n) => {
                if (n && n.isMesh) n.material = sharedMat
              })
            } catch {}

            meshCache.set(requestKey, root)
            finishInflight(requestKey, root)
          },
          undefined,
          (err) => {
            console.error('[URDF] DAE load failed:', fixedPath, err)
            finishInflight(requestKey, null)
          }
        )
        return
      }

      if (lower.endsWith('.obj')) {
        obj.load(
          fixedPath,
          (o) => {
            if (!o) {
              finishInflight(requestKey, null)
              return
            }
            try {
              o.traverse((n) => {
                if (n && n.isMesh) n.material = sharedMat
              })
            } catch {}

            meshCache.set(requestKey, o)
            finishInflight(requestKey, o)
          },
          undefined,
          (err) => {
            console.error('[URDF] OBJ load failed:', fixedPath, err)
            finishInflight(requestKey, null)
          }
        )
        return
      }

      console.warn('[URDF] Unsupported mesh type:', fixedPath)
      finishInflight(requestKey, null)
    }

    let disposed = false

    if (!robotDescription) return

    const blob = new Blob([robotDescription], { type: 'text/xml' })
    const blobUrl = URL.createObjectURL(blob)

    loader.load(
      blobUrl,
      (robot) => {
        if (disposed) return

        scene.add(robot)
        robotRef.current = robot

        // ROS(Z-up) → three.js(Y-up)
        robot.rotation.x = -Math.PI / 2
        robot.updateMatrixWorld(true)

        // ✅ 조건 없이 항상 스케일 정규화 (목표 높이 2.5 기준)
        const box1 = new THREE.Box3().setFromObject(robot)
        const size1 = box1.getSize(new THREE.Vector3())
        const maxDim1 = Math.max(size1.x, size1.y, size1.z)

        if (Number.isFinite(maxDim1) && maxDim1 > 0) {
          const s = 2.5 / maxDim1
          robot.scale.setScalar(s)
          robot.updateMatrixWorld(true)
        }

        // 스케일 적용 후 다시 box 계산
        const box2 = new THREE.Box3().setFromObject(robot)
        fitCameraToBox(camera, controlsRef, box2, 1.8)
      },
      undefined,
      (err) => console.error('[URDF] load failed:', err)
    )

    return () => {
      disposed = true

      // 로딩 중에 inflight로 묶인 콜백은 모두 null 처리 (안전)
      try {
        for (const [key, list] of inflight.entries()) {
          for (const cb of list) {
            try {
              cb(null)
            } catch {}
          }
          inflight.delete(key)
        }
      } catch {}

      if (robotRef.current) {
        try {
          scene.remove(robotRef.current)
        } catch {}
        // ✅ 영구 캐시: robot 메시들은 캐시된 geometry를 공유하므로 dispose하지 않는다.
        //    (dispose하면 캐시가 깨져 다음 로드 시 다시 받아야 함). scene에서 제거만.
        robotRef.current = null
      }
      // meshCache(GLOBAL_MESH_CACHE)와 sharedMat(SHARED_ROBOT_MATERIAL)은 세션 영구라 유지.
    }
  }, [scene, camera, robotRef, controlsRef, robotDescription])

  return null
}

export default function RobotVisualization({ currentTime, mcapSummary }) {
  const robotRef = useRef(null)
  const controlsRef = useRef(null)

  // 정밀 윈도우(현재 시점 ±BACK/FWD초). 재생/느린 시크/드래그 정착 시 정확한 포즈용.
  const windowSamples = mcapSummary?.samples?.['/joint_states'] || null
  // 전체 타임라인 다운샘플(~400포인트). 빠른 드래그로 정밀 윈도우를 벗어난 순간에도
  // 로봇이 연속적으로 움직이도록 폴백 소스로 사용(거칠지만 끊기지 않음).
  const chartSamples = mcapSummary?.chartTimelineSamples || null
  const timeRange = mcapSummary?.timeRange || null

  const lastAppliedRef = useRef({ idx: -1 })

  useEffect(() => {
    const robot = robotRef.current
    if (!robot) return
    if (!Number.isFinite(currentTime)) return

    // 소스 선택: 정밀 윈도우가 currentTime을 커버하면 우선(정확). 벗어나면 전체 타임라인으로 폴백.
    // - 빠른 드래그: 윈도우 리로드(80ms 디바운스+비동기)가 못 따라오는 구간 → chartSamples로 스크럽 유지
    // - 드래그 정착/재생: 윈도우가 currentTime을 덮게 되면 정밀 포즈로 자동 복귀
    const coversTime = (samples, t) => {
      if (!Array.isArray(samples) || samples.length === 0) return false
      const first = samples[0]?.tSec
      const last = samples[samples.length - 1]?.tSec
      if (!Number.isFinite(first) || !Number.isFinite(last)) return false
      return t >= first - 0.05 && t <= last + 0.05
    }

    const jointSamples = coversTime(windowSamples, currentTime)
      ? windowSamples
      : Array.isArray(chartSamples) && chartSamples.length
        ? chartSamples
        : windowSamples

    if (!Array.isArray(jointSamples) || jointSamples.length === 0) return

    const picked = pickNearestJointStateSample(jointSamples, currentTime, timeRange)
    if (!picked) return

    // 같은 index는 스킵 (현재는 유지/미적용 상태)
    // if (picked.index === lastAppliedRef.current.idx) return
    // lastAppliedRef.current.idx = picked.index

    // 이름 변환 필요하면 여기에
    const nameTransform = null

    applyJointStateToRobot(robot, picked.sample?.msg ?? picked.sample, {
      nameTransform
    })
  }, [currentTime, windowSamples, chartSamples, timeRange])

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 360 }}>
      <Canvas
        camera={{ position: [3, 2.5, 3], fov: 50, near: 0.01, far: 1000 }}
        style={{ width: '100%', height: '100%', background: '#0B1929' }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 6, 4]} intensity={1.2} />
        <pointLight position={[-2, 3, -2]} intensity={0.25} />

        <URDFRobot
          robotRef={robotRef}
          controlsRef={controlsRef}
          robotDescription={mcapSummary?.mcapRobotDescription || null}
        />

        <Grid position={[0, 0, 0]} args={[4, 4]} cellSize={0.2} sectionSize={1} fadeDistance={5} />

        <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  )
}
