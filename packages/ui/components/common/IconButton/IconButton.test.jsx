import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import IconButton from './index'
import Icon from '@repo/ui/common/Icon'

jest.mock('@repo/ui/common/Icon')

describe('IconButton 컴포넌트', () => {
  it('IconButton이 올바르게 렌더링되어야 함', () => {
    const { getByText } = render(<IconButton name="settings" />)
    expect(getByText('settings')).toBeInTheDocument()
  })

  it('클릭 시 올바른 동작을 수행해야 함', () => {
    const handleClick = jest.fn()
    const { getByRole } = render(<IconButton name="settings" onClick={handleClick} />)
    fireEvent.click(getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })

  it('다른 사이즈에 맞는 아이콘 사이즈를 렌더링해야 함', () => {
    render(<IconButton name="settings" size="lg" />)
    expect(Icon).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 32
      }),
      expect.anything()
    )
  })
})
