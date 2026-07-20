import FacePreview from './previews/FacePreview'
import MotionPreview from './previews/MotionPreview'
import ObjectPreview from './previews/ObjectPreview'
import PoiPreview from './previews/PoiPreview'
import SoundPreview from './previews/SoundPreview'
import { VisualDataSectionProps } from './types'

export default function VisualDataSection({
  selectedData
}: VisualDataSectionProps) {
  if (!selectedData) {
    return <></>
  }

  console.log(`VisualDataSection selectedData`, selectedData)
  const contentTypeName = selectedData.contentTypeName ?? ""
  const taskType = selectedData.taskType ?? ""

  if (taskType === "ACTION" && contentTypeName) {
    const previewNode = { data: selectedData }
    if (contentTypeName === "POI") {
      return <PoiPreview node={previewNode} />
    }

    if (contentTypeName === "MOTION") {
      return <MotionPreview node={previewNode} />
    }

    if (contentTypeName === "TTS") {
      return <SoundPreview node={previewNode} />
    }

    if (contentTypeName === "BGM") {
      return <SoundPreview node={previewNode} />
    }

    if (contentTypeName.startsWith("FACE:")) {
      return <FacePreview node={previewNode} />
    }

    if (contentTypeName === "OBJECT") {
      return <ObjectPreview node={previewNode} />
    }
  }
  return <></>
}

export { default as ContentInfoSection } from './sections/ContentInfoSection'
