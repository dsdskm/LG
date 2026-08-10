import { useEffect, useMemo, useRef, useState } from 'react'

export type PreviewProgressValue = {
  current: number
  duration: number
}

// 모듈 상수로 두어 리셋 시 참조가 같으면 React 가 리렌더를 건너뛰게 한다.
const EMPTY_PROGRESS: PreviewProgressValue = { current: 0, duration: 0 }

/**
 * 노드가 없는 화면(팔레트 선택 등)에서 진행값 리셋 기준으로 쓸 키.
 * store 키가 아니라 "같은 대상인가"를 판별하는 값이므로 노드 id 체계와 겹쳐도 무해하지만,
 * 읽을 때 혼동하지 않도록 프리픽스를 붙인다. contentId 가 없으면(-1) undefined.
 */
export function contentKeyOf(contentId: number | undefined): string | undefined {
  if (contentId === undefined || contentId < 0) return undefined
  return `content:${contentId}`
}

/**
 * 진행값을 컴포넌트 로컬 state 로만 들고 있는 hook. store 를 참조하지 않는다.
 * 속성 패널처럼 진행바를 단독으로 표시하는 화면에서 쓴다.
 *
 * usePreviewPlayback 과 같은 인터페이스를 제공하므로 preview 의 미디어 이벤트 핸들러는
 * 어느 쪽을 쓰든 그대로 둘 수 있다. 재생 상태(setPlaying/setCompleted)는 이 화면에서
 * 소비하는 쪽이 없으므로 no-op 이다(실행 판정은 점검 모드 전용).
 *
 * @param resetKey 이 값이 바뀌면 진행값을 처음으로 되돌린다(보통 선택된 노드 id).
 */
export function usePreviewProgress(resetKey?: string) {
  const [progress, setProgress] = useState<PreviewProgressValue>(EMPTY_PROGRESS)
  const lastPushRef = useRef(0)

  useEffect(() => {
    lastPushRef.current = 0
    setProgress(EMPTY_PROGRESS)
  }, [resetKey])

  // 참조를 고정한다. dep 에 이 객체를 쓰는 이펙트(MotionPreview 재생 시계)가 있다.
  const play = useMemo(
    () => ({
      setPlaying: () => {},
      setCompleted: () => {},
      setDuration: (duration: number) =>
        setProgress((prev) => (prev.duration === duration ? prev : { ...prev, duration })),
      /** 0.05초 throttle 내장. 프레임/timeupdate 마다 호출해도 안전하다. */
      pushCurrent: (current: number) => {
        if (current - lastPushRef.current >= 0.05) {
          setProgress((prev) => ({ ...prev, current }))
          lastPushRef.current = current
        }
      },
      resetProgress: () => {
        lastPushRef.current = 0
        setProgress(EMPTY_PROGRESS)
      }
    }),
    []
  )

  return { play, progress }
}
