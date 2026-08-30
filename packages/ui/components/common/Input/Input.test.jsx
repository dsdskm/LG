import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import Input from './index'

describe('Input 컴포넌트', () => {
  it('레이블이 존재할 경우 렌더링되어야 함', () => {
    const { getByText } = render(<Input label="Username" />)
    expect(getByText('Username')).toBeInTheDocument()
  })

  it('변경 이벤트 핸들러가 올바르게 호출되어야 함', () => {
    const handleChange = jest.fn()
    const { getByPlaceholderText } = render(<Input onChange={handleChange} placeholder="여기에 입력" />)
    fireEvent.change(getByPlaceholderText('여기에 입력'), { target: { value: 'text changed' } })
    expect(handleChange).toHaveBeenCalledWith(expect.anything())
  })

  it('패스워드 입력 필드가 password 타입으로 렌더링되어야 함', () => {
    const { getByPlaceholderText } = render(<Input type="password" placeholder="Password" />)
    expect(getByPlaceholderText('Password')).toHaveAttribute('type', 'password')
  })
})
