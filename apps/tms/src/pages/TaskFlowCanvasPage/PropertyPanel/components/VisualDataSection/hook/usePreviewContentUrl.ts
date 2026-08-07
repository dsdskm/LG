import { useEffect, useMemo, useState } from 'react'
import { useDownloadContentUrl } from '@/api/contentApis'
import { DownloadContentUrlResponse } from '@/types/api/content'
import { PreviewNodeLike } from '../previews/types.preview'

/** node.data.contentValue(JSON) 에서 첫 번째 fileContents id 를 뽑는다. 없으면 -1. */
function parseContentId(node?: PreviewNodeLike): number {
  try {
    const jsonStr = node?.data?.contentValue
    if (!jsonStr) return -1

    const data: Record<string, any> = JSON.parse(jsonStr)
    const contentArray = data['fileContents']

    if (Array.isArray(contentArray)) {
      return contentArray[0]['id']
    }
    return -1
  } catch (e) {
    console.log('parsing error', e)
    return -1
  }
}

/**
 * preview 컴포넌트가 node 로부터 contentId 를 파싱하고 다운로드 URL 을 받아오는
 * 반복 로직을 묶은 hook.
 */
export function usePreviewContentUrl(node?: PreviewNodeLike, onError?: (error: unknown) => void) {
  const [url, setUrl] = useState('')
  const { mutate, isSuccess } = useDownloadContentUrl()

  const contentId = useMemo(() => parseContentId(node), [node])

  useEffect(() => {
    if (contentId === -1) return

    mutate(
      { fileContentId: contentId },
      {
        onSuccess: (data) => {
          const response = data as DownloadContentUrlResponse
          if (response.results) {
            setUrl(response.results)
          }
        },
        onError: (error) => {
          console.error('get url failure', error)
          onError?.(error)
        }
      }
    )
  }, [contentId])

  return { url, contentId, isSuccess }
}
