import React from 'react'
import { render } from '@testing-library/react'
import Toast from './index'

describe('Toast 컴포넌트', () => {
  it('Toast가 렌더링되어야 함', () => {
    const { container } = render(<Toast />)
    expect(container.firstChild).toBeTruthy()
  })
})
