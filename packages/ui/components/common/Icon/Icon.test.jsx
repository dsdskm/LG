import React from 'react'
import { render } from '@testing-library/react'
import Icon from '@repo/ui/common/Icon'

describe('Icon 컴포넌트', () => {
  it('SVG 아이콘으로 정확히 렌더링되어야 함', () => {
    const { container } = render(<Icon name="close" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
  })

  it('특정 색상으로 아이콘 렌더링 테스트', () => {
    const { container } = render(<Icon name="close" color="red" />)
    const path = container.querySelector('path')
    expect(path).toHaveAttribute('fill', 'red')
  })
})
