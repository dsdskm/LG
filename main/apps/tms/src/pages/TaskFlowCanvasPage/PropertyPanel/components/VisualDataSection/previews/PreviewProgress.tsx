import { PreviewContainer, PreviewProgressFill, PreviewProgressTitle, PreviewProgressTrack } from '../styles'
import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'

interface PreviewProgressProps {
  nodeId: string | undefined
}

function PreviewProgress({ nodeId }: PreviewProgressProps) {
  const current = useContentTaskStore((s) => (nodeId ? (s.tasksById[nodeId]?.current ?? 0) : 0))
  const duration = useContentTaskStore((s) => (nodeId ? (s.tasksById[nodeId]?.duration ?? 0) : 0))
  const maxDuration = useContentTaskStore((s) => s.maxDuration)

  const trackWidth = maxDuration > 0 ? (duration / maxDuration) * 100 : 0
  const fillPercent = duration > 0 ? (current / duration) * 100 : 0

  return (
    <PreviewContainer>
      <PreviewProgressTitle>
        {current.toFixed(2)}s / {duration.toFixed(2)}s
      </PreviewProgressTitle>
      <PreviewProgressTrack $trackWidth={trackWidth}>
        <PreviewProgressFill $fillPercent={fillPercent} />
      </PreviewProgressTrack>
    </PreviewContainer>
  )
}

export default PreviewProgress
