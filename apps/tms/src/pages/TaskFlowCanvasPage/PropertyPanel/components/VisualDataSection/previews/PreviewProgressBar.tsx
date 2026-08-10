import { PreviewContainer, PreviewProgressFill, PreviewProgressTitle, PreviewProgressTrack } from '../styles'

interface PreviewProgressBarProps {
  current: number
  duration: number
  /**
   * 트랙 자체의 폭(%). 여러 콘텐츠를 나란히 비교할 때 길이 차이를 트랙 폭으로 표현한다.
   * 단독 표시(비교 대상 없음)면 100.
   */
  trackWidth?: number
}

/**
 * 진행바 표시 전용 컴포넌트. store 를 참조하지 않는다.
 * 값의 출처(로컬 state / store)는 상위에서 결정한다.
 */
export default function PreviewProgressBar({ current, duration, trackWidth = 100 }: PreviewProgressBarProps) {
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
