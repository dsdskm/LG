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
  nodeId: string | undefined
}

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

function Robot({ urdfUrl, motionData, nodeId }: RobotProps) {
  const robot = useUrdfRobot(urdfUrl)
  const robotRef = useRef<URDFRobot>(null!)
  const timeRef = useRef(0)

  const play = usePreviewPlayback(nodeId)
  const duration = motionData?.frames[motionData?.frames.length - 1].t ?? 1

  useEffect(() => {
    timeRef.current = 0
    play.resetProgress()
  }, [nodeId, play])

  useFrame((_, delta) => {
    if (!motionData || motionData.frames.length === 0) return

    if (timeRef.current > duration) {
      play.setCompleted()
    } else {
      play.setPlaying()
      play.pushCurrent(timeRef.current)
    }
    timeRef.current = timeRef.current + delta
    const joints = sampleFrame(motionData.frames, timeRef.current)
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
          const t = getDuration(parsed)
          play.setDuration(t)
          setMotion(parsed)
        }
      })
      .catch((err) => console.error('모션 파일 다운로드/파싱 실패', err))

    return () => {
      cancelled = true
    }
  }, [contentUrl])

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
                <Robot urdfUrl={`${URDF_BASE}/model/cloid_v1_hand.urdf`} motionData={motion} nodeId={nodeId} />
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
