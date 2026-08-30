import { CONTENT_TYPE } from '@/common/contentTypes'
import FacePreview from './previews/FacePreview'
import MotionPreview from './previews/MotionPreview'
import ObjectPreview from './previews/ObjectPreview'
import PoiPreview from './previews/PoiPreview'
import SoundPreview from './previews/SoundPreview'
import { VisualDataSectionProps } from './types'

export default function VisualDataSection({ viewMode, selectedData, nodeId }: VisualDataSectionProps) {
  if (!selectedData) {
    return <></>
  }

  const contentTypeName = selectedData.contentTypeName ?? ''
  const taskType = selectedData.taskType ?? ''

  // 속성 패널/팔레트 모두 진행바를 표시한다(standaloneProgress).
  // 이 화면의 진행값은 store 를 거치지 않으므로 nodeId 는 store 키가 아니라 "진행값 리셋 기준"이다.
  // 팔레트 선택처럼 노드가 없으면 preview 가 콘텐츠 id 를 기준으로 대체한다.
  const progressNodeId = viewMode === 'node' ? nodeId : undefined

  if (taskType === 'ACTION' && contentTypeName) {
    const previewNode = { data: selectedData }
    if (contentTypeName === CONTENT_TYPE.POI) {
      return <PoiPreview node={previewNode} />
    }

    if (contentTypeName === CONTENT_TYPE.MOTION) {
      return <MotionPreview node={previewNode} nodeId={progressNodeId} standaloneProgress />
    }

    if (contentTypeName === CONTENT_TYPE.TTS) {
      return <SoundPreview node={previewNode} nodeId={progressNodeId} standaloneProgress />
    }

    if (contentTypeName === CONTENT_TYPE.BGM) {
      return <SoundPreview node={previewNode} nodeId={progressNodeId} standaloneProgress />
    }

    if (contentTypeName === CONTENT_TYPE.FACE_IMAGE || contentTypeName === CONTENT_TYPE.FACE_VIDEO) {
      return <FacePreview node={previewNode} nodeId={progressNodeId} standaloneProgress />
    }

    if (contentTypeName === CONTENT_TYPE.OBJECT) {
      return <ObjectPreview node={previewNode} />
    }
  }
  return <></>
}

export { default as ContentInfoSection } from './sections/ContentInfoSection'
