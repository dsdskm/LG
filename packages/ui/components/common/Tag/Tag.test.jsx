import React from 'react'
import { render } from '@testing-library/react'
import Tag from './index'

describe('Tag 컴포넌트', () => {
  it('테마에 따라 태그가 렌더링되어야 함', () => {
    const { getByText } = render(<Tag theme="light">Test Tag</Tag>)
    const tag = getByText('Test Tag')
    expect(tag).toBeInTheDocument()
  })
})
