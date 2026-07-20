import React from 'react'
import { render } from '@testing-library/react'
import Nodata from './index'

describe('Nodata 컴포넌트', () => {
  it('렌더링 테스트 확인', () => {
    const { getByText } = render(<Nodata>데이터가 없습니다</Nodata>)
    expect(getByText('데이터가 없습니다')).toBeInTheDocument()
  })
})
