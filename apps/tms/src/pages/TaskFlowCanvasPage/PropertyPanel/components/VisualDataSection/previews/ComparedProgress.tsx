import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'
import PreviewProgressBar from './PreviewProgressBar'

interface ComparedProgressProps {
  nodeId: string
}

/**
 * 여러 콘텐츠의 진행바를 나란히 표시하는 경우(점검 뷰)용.
 * 값은 store 에서 읽고, 트랙 폭을 maxDuration 대비 비율로 그려 길이 차이를 보여준다.
 *
 * 단독 표시에는 쓰지 않는다 — maxDuration 을 구독하면 다른 콘텐츠의 길이 변화에도
 * 리렌더되고, 비교 대상이 없는 화면에서는 트랙 폭이 엉뚱하게 좁아진다.
 */
export default function ComparedProgress({ nodeId }: ComparedProgressProps) {
  const current = useContentTaskStore((s) => s.tasksById[nodeId]?.current ?? 0)
  const duration = useContentTaskStore((s) => s.tasksById[nodeId]?.duration ?? 0)
  const maxDuration = useContentTaskStore((s) => s.maxDuration)

  const trackWidth = maxDuration > 0 ? (duration / maxDuration) * 100 : 0

  return <PreviewProgressBar current={current} duration={duration} trackWidth={trackWidth} />
}
