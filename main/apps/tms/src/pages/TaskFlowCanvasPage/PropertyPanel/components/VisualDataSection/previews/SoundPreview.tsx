import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PreviewProps } from './types.preview'
import {
  AudioControlButton,
  AudioControlGroup,
  MediaFallbackText,
  MediaStage,
  PreviewCard,
  PreviewHeaderTitle
} from './styles.preview'
import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'
import { useDownloadContentUrl } from '@/api/contentApis'
import { DownloadContentUrlResponse } from '@/types/api/content'
export default function SoundPreview({ node, nodeId }: PreviewProps) {
  const updatePlayStatus = useContentTaskStore((state) => state.updatePlayStatus)

  const [mediaUrl, setMediaUrl] = useState('')

  const { t } = useTranslation('tms')

  const { mutate, isSuccess } = useDownloadContentUrl()

  const contentId = useMemo(() => {
    try {
      let jsonStr = node?.data?.contentValue
      if (!jsonStr) {
        return -1
      }
      let result = -1
      const data: Record<string, any> = JSON.parse(jsonStr)
      const contentArray = data['fileContents']

      if (Array.isArray(contentArray)) {
        result = contentArray[0]['id']
      }

      return result
    } catch (e) {
      console.log('parsing error', e)
      return -1
    }
  }, [node])

  useEffect(() => {
    if (contentId !== -1) {
      mutate(
        { fileContentId: contentId },
        {
          onSuccess: (data) => {
            console.log('get url success', data)
            const response = data as DownloadContentUrlResponse
            if (response.results) {
              setMediaUrl(response.results)
            }
            //dismissPopup()
          },
          onError: (error) => {
            console.error('get url failure', error)
            //dismissPopup()
          }
        }
      )
    }
  }, [contentId])

  useEffect(() => {
    if (mediaUrl && audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn('autoplay blocked', err)
      })
    }
  }, [mediaUrl])

  if (!node || !node.data) {
    return <></>
  }

  const data = node.data
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const isButtonDisabled = !isSuccess || !mediaUrl

  return (
    <PreviewCard>
      <PreviewHeaderTitle title={data.label}>{data.label}</PreviewHeaderTitle>
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
        ref={audioRef}
        src={mediaUrl || undefined}
        preload="auto"
        onPlay={() => {
          updatePlayStatus(nodeId, 'PLAYING')
        }}
        onEnded={() => {
          updatePlayStatus(nodeId, 'COMPLETED')
          console.log('COMPLETED')
        }}
      />
    </PreviewCard>
  )
}
