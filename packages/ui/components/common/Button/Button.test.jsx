import React from 'react'
import Button from './index'
import { expect } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

test('버튼이 올바르게 렌더링되는지 확인', () => {
  render(<Button>버튼</Button>)
  const buttonElement = screen.getByText(/버튼/i)
  expect(buttonElement).toBeInTheDocument
})

test('Click 이벤트를 정상적으로 호출하는지 확인', () => {
  const handleClick = jest.fn()
  render(<Button onClick={handleClick}>버튼</Button>)
  const buttonElement = screen.getByText(/버튼/i)
  fireEvent.click(buttonElement)
  expect(handleClick).toHaveBeenCalledTimes(1)
})

test('버튼 Style을 정상적으로 적용하는지 확인', () => {
  const { rerender } = render(
    <Button size="lg" theme="primary">
      Large Button
    </Button>
  )
  const buttonElement = screen.getByText(/large button/i)
  expect(buttonElement).toHaveStyle('padding: 1.4rem 1.6rem')
  expect(buttonElement).toHaveStyle('background: var(--color-primary-70)')

  rerender(
    <Button size="sm" theme="secondary">
      Small Button
    </Button>
  )
  const smallButtonElement = screen.getByText(/small button/i)
  expect(smallButtonElement).toHaveStyle('padding: 0.6rem 1.4rem')
  expect(smallButtonElement).toHaveStyle('background: var(--color-secondary-80)')
})

test('disabled 적용되는지 확인', () => {
  const handleClick = jest.fn()
  render(
    <Button onClick={handleClick} disabled>
      Click me
    </Button>
  )
  const buttonElement = screen.getByText(/click me/i)
  fireEvent.click(buttonElement)
  expect(handleClick).not.toHaveBeenCalled()
  expect(buttonElement).toBeDisabled()
})

test('className을 정상적으로 적용하는지 확인', () => {
  const { rerender } = render(<Button size="lg">Large Button</Button>)
  const buttonElement = screen.getByText(/large button/i)
  expect(buttonElement).toHaveClass('typographyButton3')

  rerender(<Button size="md">Medium Button</Button>)
  const mediumButtonElement = screen.getByText(/medium button/i)
  expect(mediumButtonElement).toHaveClass('typographyButton4')

  rerender(<Button size="sm">Small Button</Button>)
  const smallButtonElement = screen.getByText(/small button/i)
  expect(smallButtonElement).toHaveClass('typographyButton5')
})
