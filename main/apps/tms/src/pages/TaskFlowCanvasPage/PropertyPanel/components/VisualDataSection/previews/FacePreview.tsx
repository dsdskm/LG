import { useState } from 'react'
import { MediaFallbackText, MediaStage, PreviewCard } from './styles.preview'
import { PreviewProps } from './types.preview'
import PreviewProgress from './PreviewProgress'
import PreviewHeader from './PreviewHeader'
import { usePreviewPlayback } from '../hook/usePreviewPlayback'
import { usePreviewContentUrl } from '../hook/usePreviewContentUrl'

export default function FacePreview({ node, nodeId }: PreviewProps) {
  const play = usePreviewPlayback(nodeId)
  const [contentOpen, setContentOpen] = useState(true)

  const { url: mediaUrl } = usePreviewContentUrl(node, () => play.setCompleted())

  if (!node || !node.data) {
    return <></>
  }
  const data = node.data
  return (
    <>
      <PreviewHeader label={data.label} open={contentOpen} onToggle={() => setContentOpen((prev) => !prev)} />
      <PreviewCard $hidden={!contentOpen}>
        <MediaStage>
          {mediaUrl ? (
            <video
              key={mediaUrl}
              autoPlay
              muted
              playsInline
              width="100%"
              style={{ maxWidth: '800px' }}
              preload="auto"
              onCanPlay={(e) => {
                // 처음부터 화면 밖에 있으면 브라우저가 autoPlay 시작을 미루므로,
                // 재생 준비가 되면 직접 play()를 호출해 화면 밖에서도 시작시킨다.
                // (muted 영상의 programmatic play()는 뷰포트와 무관하게 허용된다.)
                const video = e.currentTarget
                if (video.paused && !video.ended) {
                  void video.play().catch(() => {})
                }
              }}
              onPlay={play.setPlaying}
              onLoadedMetadata={(e) => play.setDuration(e.currentTarget.duration)}
              onTimeUpdate={(e) => play.pushCurrent(e.currentTarget.currentTime)}
              onPause={(e) => {
                // 스크롤 등으로 화면 밖에 나가면 브라우저가 재생을 일시정지시키므로,
                // 영상이 끝난 게 아니라면 다시 재생을 강제한다.
                const video = e.currentTarget
                if (!video.ended) {
                  void video.play().catch(() => {})
                }
              }}
              onEnded={play.setCompleted}
            >
              <source src={mediaUrl} type="video/webm" />
            </video>
          ) : (
            <MediaFallbackText>{data.contentName}</MediaFallbackText>
          )}
        </MediaStage>
      </PreviewCard>
      {nodeId && <PreviewProgress nodeId={nodeId} />}
    </>
  )
}
