import React from 'react'
import { render } from '@testing-library/react'
import { Pagination } from './index'

describe('Pagination 컴포넌트', () => {
  it('기본 렌더링 테스트', () => {
    const { getByText } = render(
      <Pagination
        currentPage={1}
        rowCount={100}
        rowsPerPage={10}
        paginationRowsPerPageOptions={[5, 10, 20]}
        onChangePage={() => {}}
        onChangeRowsPerPage={() => {}}
      />
    )
    expect(getByText('1')).toBeInTheDocument()
  })
})
