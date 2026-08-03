import { useEffect, useMemo, useState } from 'react'
import { MediaFallbackText, MediaStage, PreviewCard, PreviewHeaderTitle } from './styles.preview'
import { PreviewProps } from './types.preview'
import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'
import { useDownloadContentUrl } from '@/api/contentApis'
import { DownloadContentUrlResponse } from '@/types/api/content'

export default function FacePreview({ node, nodeId }: PreviewProps) {
  const updatePlayStatus = useContentTaskStore((state) => state.updatePlayStatus)
  const [mediaUrl, setMediaUrl] = useState('')

  const { mutate } = useDownloadContentUrl()

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
            updatePlayStatus(nodeId, 'COMPLETED')
            //dismissPopup()
          }
        }
      )
    }
  }, [contentId])

  if (!node || !node.data) {
    return <></>
  }
  const data = node.data
  return (
    <PreviewCard>
      <PreviewHeaderTitle title={data.label}>{data.label}</PreviewHeaderTitle>
      <MediaStage>
        {mediaUrl ? (
          <video
            key={mediaUrl}
            autoPlay
            muted
            controls
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
            onPlay={() => updatePlayStatus(nodeId, 'PLAYING')}
            onPause={(e) => {
              // 스크롤 등으로 화면 밖에 나가면 브라우저가 재생을 일시정지시키므로,
              // 영상이 끝난 게 아니라면 다시 재생을 강제한다.
              const video = e.currentTarget
              if (!video.ended) {
                void video.play().catch(() => {})
              }
            }}
            onEnded={() => updatePlayStatus(nodeId, 'COMPLETED')}
          >
            <source src={mediaUrl} type="video/webm" />
          </video>
        ) : (
          <MediaFallbackText>{data.contentName}</MediaFallbackText>
        )}
      </MediaStage>
    </PreviewCard>
  )
}
