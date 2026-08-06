import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Center, OrbitControls } from '@react-three/drei'
import URDFLoader, { URDFRobot } from 'urdf-loader'
import { PreviewCard } from './styles.preview'
import { PreviewProps } from './types.preview'
import { parseMotionYaml } from '@/utils/motionParser'
import { MotionData } from '@/types/motion'
import { MotionCollision } from './MotionCollision'
import PreviewProgress from './PreviewProgress'
import PreviewHeader from './PreviewHeader'
import { usePreviewPlayback } from '../hook/usePreviewPlayback'
import { usePreviewContentUrl } from '../hook/usePreviewContentUrl'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'
const URDF_BASE = '/tms/urdf/cloid_description_1k'

function useUrdfRobot(url: string) {
  const LoaderClass = URDFLoader as any as new (...args: any[]) => any
  return useLoader(LoaderClass, url, (loader) => {
    loader.packages = { cloid_description: URDF_BASE }
    // 충돌 감지를 위해 collision geometry 를 반드시 파싱하도록 설정 (기본값 false)
    loader.parseCollision = true

    const gltfLoader = new GLTFLoader(loader.manager)
    // meshopt 압축된 GLB(EXT_meshopt_compression) 를 디코딩. 압축 안 된 파일엔 영향 없음.
    gltfLoader.setMeshoptDecoder(MeshoptDecoder)

    loader.loadMeshCb = (path: string, _manager: any, onComplete: (mesh: any, err?: any) => void) => {
      // /tms/.../meshes/omnihand/thumb_dip.STL
      // -> /tms/.../meshes-glb/omnihand/thumb_dip.glb
      const glbPath = path.replace('/meshes/', '/meshes-glb/').replace(/\.stl$/i, '.glb')

      gltfLoader.load(
        glbPath,
        (gltf) => onComplete(gltf.scene),
        undefined,
        (err) => {
          console.error('GLB 로드 실패:', glbPath, err)
          onComplete(null, err)
        }
      )
    }
  })
}

interface RobotProps {
  urdfUrl: string
  motionData: MotionData | undefined
  /**
   * 재생 시작 시각(performance.now() 기준, 0 이면 시작 전). 소유자는 MotionPreview.
   * 경과 시간을 값으로 넘기지 않고 시작 시각만 공유한다 → Robot 이 렌더 프레임마다
   * 직접 경과 시간을 계산하므로 화면 갱신 주기와 완전히 동기된다.
   */
  startedAtRef: { current: number }
}

// store 보고(진행바)·완료 판정 주기(ms). 3D 렌더 주기와는 무관하다.
// pushCurrent 는 0.05초 throttle 이 걸려 있어 이 정도면 충분하다.
const PLAY_TICK_MS = 33

function sampleFrame(frames: MotionData['frames'], t: number): Record<string, number> {
  // 가장 단순한 버전: 매번 처음부터 찾음 (최적화 없음)
  let i = 0
  while (i < frames.length - 1 && frames[i + 1].t < t) i++
  const a = frames[i]
  const b = frames[Math.min(i + 1, frames.length - 1)]
  if (a === b) return a.joints

  const alpha = (t - a.t) / (b.t - a.t)
  const joints: Record<string, number> = {}
  for (const name in a.joints) {
    joints[name] = a.joints[name] * (1 - alpha) + b.joints[name] * alpha
  }
  return joints
}

// 3D 렌더만 담당한다. 재생 시계 진행과 store 보고는 MotionPreview 가 가진다.
// (카드를 접으면 Canvas 가 0x0 이 되어 r3f 가 root 를 만들지 않고 useFrame 이 멈추기 때문)
function Robot({ urdfUrl, motionData, startedAtRef }: RobotProps) {
  const robot = useUrdfRobot(urdfUrl)
  const robotRef = useRef<URDFRobot>(null!)

  useFrame(() => {
    if (!motionData || motionData.frames.length === 0) return
    if (startedAtRef.current === 0) return

    // 렌더 프레임마다 경과 시간을 직접 계산한다.
    // 33ms 시계가 누적한 값을 읽으면 30Hz 로만 포즈가 바뀌어 계단 현상이 생긴다.
    const elapsed = (performance.now() - startedAtRef.current) / 1000
    const joints = sampleFrame(motionData.frames, elapsed)
    Object.entries(joints).forEach(([key, value]) => {
      // 새 포맷은 URDF 실제 관절 이름을 그대로 사용하므로 이름 매핑 없이 주입.
      // mimic 관절(*_dip, thumb_pip 등)은 URDFLoader 가 자동으로 따라 움직인다.
      robotRef.current?.joints[key]?.setJointValue(value)
    })
  })

  return (
    <>
      <primitive ref={robotRef} object={robot} />
      <MotionCollision urdfModel={robot} />
    </>
  )
}

function getDuration(data: MotionData) {
  if (data.frames.length < 1) {
    return 0
  } else {
    return data.frames[data.frames.length - 1].t - data.frames[0].t
  }
}
export default function MotionPreview({ node, nodeId }: PreviewProps) {
  const [contentOpen, setContentOpen] = useState(true)
  const [motion, setMotion] = useState<MotionData>()
  // 재생 시작 시각(performance.now(), 0 이면 시작 전). 진행 시간은 모두 이 값에서 파생한다.
  const startedAtRef = useRef(0)

  const { url: contentUrl } = usePreviewContentUrl(node)
  const play = usePreviewPlayback(nodeId)

  // 다운로드 링크에서 trajectory 파일 텍스트를 받아 파싱한다.
  useEffect(() => {
    if (!contentUrl) return
    let cancelled = false

    fetch(contentUrl)
      .then((res) => res.text())
      .then((text) => {
        if (cancelled) return
        const parsed = parseMotionYaml(text)
        if (parsed) {
          // duration 등록은 아래 재생 시계 이펙트가 담당한다(nodeId 가 바뀔 때도 다시 등록되도록).
          setMotion(parsed)
        }
      })
      .catch((err) => console.error('모션 파일 다운로드/파싱 실패', err))

    return () => {
      cancelled = true
    }
  }, [contentUrl])

  // 재생 시계. 3D 렌더 루프(useFrame)와 분리해 둔다.
  //  - 카드를 접으면 Canvas 가 0x0 이 되어 r3f 가 root 를 만들지 않아 useFrame 이 멈춘다.
  //    시계가 거기 있으면 playStatus 가 READY 에 머물러 실행이 이 노드에서 멈춘다.
  //  - nodeId 가 바뀌면(같은 콘텐츠를 쓰는 다음 태스크) 처음부터 다시 재생한다.
  useEffect(() => {
    startedAtRef.current = 0
    play.resetProgress()
    if (!motion || motion.frames.length === 0) return

    // duration(store) 은 프레임 구간 길이, 완료 판정은 마지막 프레임 시각 기준(기존 동작 유지).
    play.setDuration(getDuration(motion))
    const endTime = motion.frames[motion.frames.length - 1].t

    const startedAt = performance.now()
    startedAtRef.current = startedAt

    const timerId = window.setInterval(() => {
      // Robot 의 렌더 루프와 같은 원점에서 계산하므로 화면과 진행바가 어긋나지 않는다.
      const elapsed = (performance.now() - startedAt) / 1000

      if (elapsed > endTime) {
        play.pushCurrent(endTime)
        play.setCompleted()
        window.clearInterval(timerId)
        return
      }
      play.setPlaying()
      play.pushCurrent(elapsed)
    }, PLAY_TICK_MS)

    return () => window.clearInterval(timerId)
  }, [nodeId, motion, play])

  if (!node || !node.data) {
    return <></>
  }

  const data = node.data

  return (
    <>
      <PreviewHeader label={data.label} open={contentOpen} onToggle={() => setContentOpen((prev) => !prev)} />
      <PreviewCard $hidden={!contentOpen}>
        <Canvas camera={{ position: [0, 0, 5], fov: 25, zoom: 1.25 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 3, 3]} />
          <Suspense fallback={null}>
            <Center>
              <group rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
                <Robot
                  urdfUrl={`${URDF_BASE}/model/cloid_v1_hand.urdf`}
                  motionData={motion}
                  startedAtRef={startedAtRef}
                />
              </group>
            </Center>
          </Suspense>
          <OrbitControls target={[0, 0, 0]} />
        </Canvas>
      </PreviewCard>
      {nodeId && <PreviewProgress nodeId={nodeId} />}
    </>
  )
}
