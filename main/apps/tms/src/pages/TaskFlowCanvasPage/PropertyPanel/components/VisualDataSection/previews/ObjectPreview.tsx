import { useEffect } from 'react'
import { MediaFallbackText, MediaStage, PreviewCard, PreviewHeaderTitle } from './styles.preview'
import { PreviewProps } from './types.preview'
import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'

export default function ObjectPreview({ node, nodeId }: PreviewProps) {
  const updatePlayStatus = useContentTaskStore((state) => state.updatePlayStatus)

  //fixme: temporary logic
  useEffect(() => {
    if (nodeId) {
      updatePlayStatus(nodeId, 'COMPLETED')
    }
  }, [nodeId])

  if (!node || !node.data) {
    return <></>
  }
  const data = node.data
  //fixme: temporary logic

  return (
    <PreviewCard>
      <PreviewHeaderTitle title={data.label}>{data.label}</PreviewHeaderTitle>

      <MediaStage>
        <MediaFallbackText>{data.contentName}</MediaFallbackText>
      </MediaStage>
    </PreviewCard>
  )
}
