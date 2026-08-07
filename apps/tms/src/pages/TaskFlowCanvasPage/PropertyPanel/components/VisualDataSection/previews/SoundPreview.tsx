import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PreviewProps } from './types.preview'
import { AudioControlButton, AudioControlGroup, MediaFallbackText, MediaStage, PreviewCard } from './styles.preview'
import PreviewProgress from './PreviewProgress'
import PreviewHeader from './PreviewHeader'
import { usePreviewPlayback } from '../hook/usePreviewPlayback'
import { usePreviewContentUrl } from '../hook/usePreviewContentUrl'

export default function SoundPreview({ node, nodeId }: PreviewProps) {
  const play = usePreviewPlayback(nodeId)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [contentOpen, setContentOpen] = useState(true)

  const { t } = useTranslation('tms')

  const { url: mediaUrl, isSuccess } = usePreviewContentUrl(node)

  // nodeId 가 바뀌면 <audio> 가 remount(key)되어 ref 도 새 엘리먼트를 가리키므로,
  // 같은 콘텐츠라도 재생을 다시 시작시켜야 한다.
  useEffect(() => {
    if (mediaUrl && audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn('autoplay blocked', err)
      })
    }
  }, [mediaUrl, nodeId])

  if (!node || !node.data) {
    return <></>
  }

  const data = node.data

  const isButtonDisabled = !isSuccess || !mediaUrl

  return (
    <>
      <PreviewHeader label={data.label} open={contentOpen} onToggle={() => setContentOpen((prev) => !prev)} />
      <PreviewCard $hidden={!contentOpen}>
        <MediaStage>
          <MediaFallbackText>{data.contentName}</MediaFallbackText>
        </MediaStage>

        <AudioControlGroup>
          <AudioControlButton
            disabled={isButtonDisabled}
            type="button"
            onClick={() => {
              void audioRef.current?.play()
            }}
            title={t('canvas.sound.play')}
          >
            ▶
          </AudioControlButton>

          <AudioControlButton
            disabled={isButtonDisabled}
            type="button"
            onClick={() => {
              audioRef.current?.pause()
            }}
            title={t('canvas.sound.pause')}
          >
            ❚❚
          </AudioControlButton>

          <AudioControlButton
            disabled={isButtonDisabled}
            type="button"
            onClick={() => {
              if (!audioRef.current) return
              audioRef.current.pause()
              audioRef.current.currentTime = 0
            }}
            title={t('canvas.sound.stop')}
          >
            ■
          </AudioControlButton>
        </AudioControlGroup>

        <audio
          // FacePreview 와 동일한 이유로 nodeId 를 key 에 섞는다(같은 콘텐츠 연속 재생).
          key={`${mediaUrl}-${nodeId}`}
          ref={audioRef}
          src={mediaUrl || undefined}
          preload="auto"
          onLoadedMetadata={(e) => play.setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => play.pushCurrent(e.currentTarget.currentTime)}
          onPlay={play.setPlaying}
          onEnded={play.setCompleted}
        />
      </PreviewCard>
      {nodeId && <PreviewProgress nodeId={nodeId} />}
    </>
  )
}
