import React from 'react'
import { render } from '@testing-library/react'
import Textarea from './index'

describe('Textarea 컴포넌트', () => {
  it('기본 렌더링 테스트', () => {
    const placeholderText = '내용을 입력하세요'
    const { getByPlaceholderText } = render(<Textarea placeholder={placeholderText} />)
    expect(getByPlaceholderText(placeholderText)).toBeInTheDocument()
  })
})
