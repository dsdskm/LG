import React from 'react'
import { render } from '@testing-library/react'
import Table from './index'

describe('Table 컴포넌트', () => {
  it('데이터 없음 메시지가 보이는지 테스트', () => {
    const noDataMessage = '데이터가 없습니다'
    const { getByText } = render(<Table noData={noDataMessage} />)
    expect(getByText(noDataMessage)).toBeInTheDocument()
  })
})
