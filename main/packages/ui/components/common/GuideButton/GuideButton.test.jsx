import React from 'react'
import { render } from '@testing-library/react'
import GuideButton from '@repo/ui/common/GuideButton'
import { BrowserRouter as Router } from 'react-router-dom'

describe('GuideButton 컴포넌트', () => {
  it('링크로 사용될 경우 a 태그로 렌더링되어야 함', () => {
    const { container } = render(
      <Router>
        <GuideButton href="/home">홈으로</GuideButton>
      </Router>
    )
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/home')
  })

  it('버튼으로 사용될 경우 button 태그로 렌더링되어야 함', () => {
    const { container } = render(<GuideButton>버튼</GuideButton>)
    const button = container.querySelector('button')
    expect(button).toBeInTheDocument()
  })
})
