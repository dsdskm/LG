import React from 'react'
import { render } from '@testing-library/react'
import TextFieldInfo from './index'

describe('TextFieldInfo 컴포넌트', () => {
  it('메시지와 카운터가 적절히 표시되어야 함', () => {
    const { getByText } = render(
      <TextFieldInfo message="Test error" count currentLength={10} maxLength={20} isError={true} />
    )
    expect(getByText('Test error')).toBeInTheDocument()
    expect(getByText('10/20')).toBeInTheDocument()
  })
})
