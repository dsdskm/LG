import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Checkbox from './index' // 경로는 실제 경로에 맞게 조정하세요.

test('체크박스 정상적', () => {
  render(<Checkbox label="Test Checkbox" />)
  expect(screen.getByText('Test Checkbox')).toBeInTheDocument()
})

test('체크박스 체크 상태 체크', () => {
  render(<Checkbox label="Test Checkbox" />)
  const checkbox = screen.getByLabelText('Test Checkbox')
  expect(checkbox.checked).toBeFalsy()
  fireEvent.click(checkbox)
  expect(checkbox.checked).toBeTruthy()
})
