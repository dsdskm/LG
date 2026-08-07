import { CONTENT_TYPE } from '@/common/contentTypes'
import FacePreview from './previews/FacePreview'
import MotionPreview from './previews/MotionPreview'
import ObjectPreview from './previews/ObjectPreview'
import PoiPreview from './previews/PoiPreview'
import SoundPreview from './previews/SoundPreview'
import { VisualDataSectionProps } from './types'
import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'

export default function VisualDataSection({ selectedData }: VisualDataSectionProps) {
  if (!selectedData) {
    return <></>
  }

  const addContentTask = useContentTaskStore((state) => state.addContentTask)

  console.log(`VisualDataSection selectedData`, selectedData)
  const contentTypeName = selectedData.contentTypeName ?? ''
  const taskType = selectedData.taskType ?? ''

  if (taskType === 'ACTION' && contentTypeName) {
    const previewNode = { data: selectedData }
    if (contentTypeName === CONTENT_TYPE.POI) {
      return <PoiPreview node={previewNode} />
    }

    if (contentTypeName === CONTENT_TYPE.MOTION) {
      addContentTask({
        nodeId: String(selectedData.contentId ?? ''),
        playStatus: 'READY',
        duration: 0,
        current: 0
      })

      return <MotionPreview node={previewNode} />
    }

    if (contentTypeName === CONTENT_TYPE.TTS) {
      return <SoundPreview node={previewNode} />
    }

    if (contentTypeName === CONTENT_TYPE.BGM) {
      return <SoundPreview node={previewNode} />
    }

    if (contentTypeName === CONTENT_TYPE.FACE_IMAGE || contentTypeName === CONTENT_TYPE.FACE_VIDEO) {
      return <FacePreview node={previewNode} />
    }

    if (contentTypeName === CONTENT_TYPE.OBJECT) {
      return <ObjectPreview node={previewNode} />
    }
  }
  return <></>
}

export { default as ContentInfoSection } from './sections/ContentInfoSection'
