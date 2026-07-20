import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import Modal from './index'

describe('모달 컴포넌트 테스트', () => {
  it('isOpen 테스트', () => {
    const { getByText } = render(<Modal isOpen={true} title="Test Modal" closeButton={true} onClose={() => {}} />)
    expect(getByText('Test Modal')).toBeInTheDocument()
  })

  it('false일때 안나타나는지 테스트', () => {
    const { queryByText } = render(<Modal isOpen={false} title="Test Modal" closeButton={true} onClose={() => {}} />)
    expect(queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('클로즈버튼 클릭 시 닫히는지 확인', () => {
    const onClose = jest.fn()
    const { getByLabelText } = render(<Modal isOpen={true} title="Test Modal" closeButton={true} onClose={onClose} />)
    fireEvent.click(getByLabelText('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
