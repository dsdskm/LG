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
 * 콘텐츠 URL 을 받아오는 과정의 상태.
 *  - empty: 노드에 콘텐츠(fileContents)가 없음
 *  - loading: 다운로드 URL 발급 요청 중
 *  - ready: URL 확보
 *  - error: 발급 실패(삭제된 콘텐츠라 404 등)
 *
 * useDownloadContentUrl(mutation) 의 isError 를 쓰지 않는 이유: mutation 상태는 대상이 바뀌어도
 * 리셋되지 않아 이전 노드의 실패가 그대로 남는다. 그래서 대상별로 여기서 직접 관리한다.
 */
export type PreviewContentStatus = 'empty' | 'loading' | 'ready' | 'error'

/**
 * preview 컴포넌트가 node 로부터 contentId 를 파싱하고 다운로드 URL 을 받아오는
 * 반복 로직을 묶은 hook.
 */
export function usePreviewContentUrl(node?: PreviewNodeLike, onError?: (error: unknown) => void) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<PreviewContentStatus>('empty')
  const { mutate, isSuccess } = useDownloadContentUrl()

  const contentId = useMemo(() => parseContentId(node), [node])

  useEffect(() => {
    // 대상이 바뀌면 이전 URL 을 먼저 비운다.
    // 비우지 않으면 새 URL 이 도착할 때까지(요청이 실패하면 끝까지) 이전 값이 남아,
    // 다른 노드를 선택했는데 앞 노드의 소리·영상이 재생되거나 재생 버튼이 열려 있게 된다.
    setUrl('')

    if (contentId === -1) {
      setStatus('empty')
      return
    }

    setStatus('loading')

    // mutate 는 취소 개념이 없어서, 노드를 빠르게 바꾸면 이전 요청의 응답이 나중에 도착해
    // 새 대상의 URL 을 덮어쓸 수 있다(A→B 로 옮겼는데 B 화면에 A 콘텐츠). 여기서 무효화한다.
    let cancelled = false

    mutate(
      { fileContentId: contentId },
      {
        onSuccess: (data) => {
          if (cancelled) return
          const response = data as DownloadContentUrlResponse
          if (response.results) {
            setUrl(response.results)
            setStatus('ready')
          } else {
            // 200 이지만 URL 이 비어 있는 경우도 실패로 다룬다.
            setStatus('error')
          }
        },
        onError: (error) => {
          if (cancelled) return
          setStatus('error')
          console.error('get url failure', error)
          onError?.(error)
        }
      }
    )

    return () => {
      cancelled = true
    }
  }, [contentId])

  return { url, contentId, isSuccess, status }
}
