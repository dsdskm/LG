import React from 'react'
import { render } from '@testing-library/react'
import Search from './index'

describe('Search 컴포넌트', () => {
  it('기본 렌더링 테스트', () => {
    const { getByPlaceholderText } = render(<Search placeholder="검색어 입력" />)
    expect(getByPlaceholderText('검색어 입력')).toBeInTheDocument()
  })
})
