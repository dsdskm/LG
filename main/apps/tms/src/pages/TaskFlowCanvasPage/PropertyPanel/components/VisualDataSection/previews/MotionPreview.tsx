import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Center, OrbitControls } from '@react-three/drei'
import URDFLoader, { URDFRobot } from 'urdf-loader'
import { PreviewCard } from './styles.preview'
import { PreviewProps } from './types.preview'
import { parseMotionYaml } from '@/utils/motionParser'
import { MotionData } from '@/types/motion'
import { MotionCollision } from './MotionCollision'
import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'
import { useDownloadContentUrl } from '@/api/contentApis'
import { DownloadContentUrlResponse } from '@/types/api/content'
const URDF_BASE = '/tms/urdf/cloid_description_1k'

function useUrdfRobot(url: string) {
  const LoaderClass = URDFLoader as any as new (...args: any[]) => any
  return useLoader(LoaderClass, url, (loader) => {
    loader.packages = { cloid_description: URDF_BASE }
    // 충돌 감지를 위해 collision geometry 를 반드시 파싱하도록 설정 (기본값 false)
    loader.parseCollision = true
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

  const updatePlayStatus = useContentTaskStore((state) => state.updatePlayStatus)

  const duration = motionData?.frames[motionData?.frames.length - 1].t ?? 1

  useEffect(() => {
    timeRef.current = 0
  }, [nodeId])

  useFrame((_, delta) => {
    if (!motionData || motionData.frames.length === 0) return

    if (timeRef.current > duration) {
      updatePlayStatus(nodeId, 'COMPLETED')
    } else {
      updatePlayStatus(nodeId, 'PLAYING')
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

export default function MotionPreview({ node, nodeId }: PreviewProps) {
  const [contentUrl, setContentUrl] = useState('')
  const [motion, setMotion] = useState<MotionData>()

  const { mutate } = useDownloadContentUrl()

  const contentId = useMemo(() => {
    try {
      let jsonStr = node?.data?.contentValue
      if (!jsonStr) {
        return -1
      }
      let result = -1
      const data: Record<string, any> = JSON.parse(jsonStr)
      const contentArray = data['fileContents']

      if (Array.isArray(contentArray)) {
        result = contentArray[0]['id']
      }

      return result
    } catch (e) {
      console.log('parsing error', e)
      return -1
    }
  }, [node])

  useEffect(() => {
    if (contentId !== -1) {
      mutate(
        { fileContentId: contentId },
        {
          onSuccess: (data) => {
            console.log('get url success', data)
            const response = data as DownloadContentUrlResponse
            if (response.results) {
              setContentUrl(response.results)
            }
            //dismissPopup()
          },
          onError: (error) => {
            console.error('get url failure', error)
            //dismissPopup()
          }
        }
      )
    }
  }, [contentId])

  // 다운로드 링크에서 trajectory 파일 텍스트를 받아 파싱한다.
  useEffect(() => {
    if (!contentUrl) return
    let cancelled = false

    fetch(contentUrl)
      .then((res) => res.text())
      .then((text) => {
        if (cancelled) return
        const parsed = parseMotionYaml(text)
        if (parsed) setMotion(parsed)
      })
      .catch((err) => console.error('모션 파일 다운로드/파싱 실패', err))

    return () => {
      cancelled = true
    }
  }, [contentUrl])

  if (!node || !node.data) {
    return <></>
  }

  return (
    <PreviewCard>
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
  )
}
