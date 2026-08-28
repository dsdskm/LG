import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PreviewProps } from './types.preview'
import {
  AudioControlButton,
  AudioControlGroup,
  MediaFallbackText,
  MediaStage,
  MediaStatusText,
  PreviewCard
} from './styles.preview'
import ComparedProgress from './ComparedProgress'
import PreviewProgressBar from './PreviewProgressBar'
import PreviewHeader from './PreviewHeader'
import { usePreviewPlayback } from '../hook/usePreviewPlayback'
import { contentKeyOf, usePreviewProgress } from '../hook/usePreviewProgress'
import { usePreviewContentUrl } from '../hook/usePreviewContentUrl'

export default function SoundPreview({ node, nodeId, standaloneProgress }: PreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [contentOpen, setContentOpen] = useState(true)

  const { t } = useTranslation('tms')

  const { url: mediaUrl, contentId, status: contentStatus } = usePreviewContentUrl(node)

  // standaloneProgress = 속성 패널/팔레트 렌더. 그때는 store 를 거치지 않고 로컬 진행값만 쓴다.
  // 점검 모드 렌더에서는 store 로 보고해야 실행기가 완료 판정을 할 수 있다.
  const storePlay = usePreviewPlayback(nodeId)
  // 로컬 진행값의 리셋 기준. 노드가 없는 팔레트 선택에서는 콘텐츠 id 로 대체한다.
  const { play: localPlay, progress } = usePreviewProgress(nodeId ?? contentKeyOf(contentId))
  const play = standaloneProgress ? localPlay : storePlay

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

  // 재생할 수 없는 상태는 콘솔이 아니라 화면에 알린다.
  // (mutation 의 isSuccess 대신 status 를 쓴다 — mutation 상태는 대상이 바뀌어도 리셋되지 않는다)
  const statusMessage =
    contentStatus === 'empty'
      ? t('canvas.preview.noContent')
      : contentStatus === 'error'
        ? t('canvas.preview.contentNotFound')
        : contentStatus === 'loading'
          ? t('canvas.preview.loading')
          : null

  const isButtonDisabled = contentStatus !== 'ready' || !mediaUrl

  return (
    <>
      <PreviewHeader label={data.label} open={contentOpen} onToggle={() => setContentOpen((prev) => !prev)} />
      <PreviewCard $hidden={!contentOpen}>
        <MediaStage>
          {statusMessage ? (
            <MediaStatusText $tone={contentStatus === 'error' ? 'error' : 'muted'}>{statusMessage}</MediaStatusText>
          ) : (
            <MediaFallbackText>{data.contentName}</MediaFallbackText>
          )}
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
      {standaloneProgress ? (
        // 단독 표시: store 를 거치지 않고 로컬 진행값으로 그린다.
        <PreviewProgressBar current={progress.current} duration={progress.duration} />
      ) : (
        nodeId && <ComparedProgress nodeId={nodeId} />
      )}
    </>
  )
}
