import { useRef, useEffect } from 'react'
import styled from 'styled-components'

const Inner = styled.span`
  display: inline-block;
  white-space: nowrap;
  will-change: transform;
`

// 부모(고정/제한 폭, overflow: hidden) 컨테이너를 넘칠 때만 한 방향으로 스크롤하고
// 끝에서 잠깐 멈춘 뒤 처음으로 리셋(반복). 넘치지 않으면 정지.
// ⚠️ 정확한 측정을 위해 부모는 padding 없이 폭이 제한된 요소여야 함.
export default function MarqueeText({ children }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el?.parentElement) return
    let anim
    // 레이아웃/폰트 확정 후 측정 (초기 측정이 0이 나오는 문제 방지)
    const raf = requestAnimationFrame(() => {
      const over = el.scrollWidth - el.parentElement.clientWidth
      if (over <= 1) return
      const end = `translateX(${-over}px)`
      anim = el.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: 0.12 },
          { transform: end, offset: 0.88 },
          { transform: end, offset: 1 }
        ],
        { duration: Math.max(3000, over * 90), iterations: Infinity, easing: 'ease-in-out' }
      )
    })
    return () => {
      cancelAnimationFrame(raf)
      anim?.cancel()
    }
  }, [children])
  return <Inner ref={ref}>{children}</Inner>
}
