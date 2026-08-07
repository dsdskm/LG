import { useEffect, useMemo, useRef } from 'react'
import { useContentTaskStore } from '@/pages/TaskFlowCanvasPage/store/useContentTaskStore'

/**
 * preview 컴포넌트가 미디어 재생 상태(재생/완료/길이/진행)를 store 에 반영할 때
 * 반복되던 로직을 하나로 묶은 hook.
 * current 값은 0.05초 단위로만 store 에 반영해 progress bar 리렌더 빈도를 제한한다.
 */
export function usePreviewPlayback(nodeId: string | undefined) {
  const updatePlayStatus = useContentTaskStore((state) => state.updatePlayStatus)
  const updateDuration = useContentTaskStore((state) => state.updateDuration)
  const updateCurrent = useContentTaskStore((state) => state.updateCurrent)
  const lastPushRef = useRef(0)

  // preview 는 언마운트 없이 nodeId prop 만 바뀌므로(컨텐츠 전환), throttle 기준값을
  // 리셋하지 않으면 이전 컨텐츠의 마지막 위치 때문에 새 컨텐츠의 current 갱신이 막힌다.
  useEffect(() => {
    lastPushRef.current = 0
  }, [nodeId])

  return useMemo(
    () => ({
      setPlaying: () => updatePlayStatus(nodeId, 'PLAYING'),
      setCompleted: () => updatePlayStatus(nodeId, 'COMPLETED'),
      setDuration: (duration: number) => updateDuration(nodeId, duration),
      /** 0.05초 throttle 내장. 프레임/timeupdate 마다 호출해도 안전하다. */
      pushCurrent: (current: number) => {
        if (current - lastPushRef.current >= 0.05) {
          updateCurrent(nodeId, current)
          lastPushRef.current = current
        }
      },
      resetProgress: () => {
        lastPushRef.current = 0
      }
    }),
    [nodeId, updatePlayStatus, updateDuration, updateCurrent]
  )
}
