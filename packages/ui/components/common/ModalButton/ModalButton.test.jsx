import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import ModalButton from './index'

describe('모달 버튼 컴포넌트 테스트', () => {
  it('버튼 렌더링 텍스트 확인', () => {
    const { getByText } = render(<ModalButton>Click Me</ModalButton>)
    expect(getByText('Click Me')).toBeInTheDocument()
  })

  it('클릭 테스트', () => {
    const handleClick = jest.fn()
    const { getByText } = render(<ModalButton onClick={handleClick}>Click Me</ModalButton>)
    fireEvent.click(getByText('Click Me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
