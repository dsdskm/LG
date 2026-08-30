import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Calendar from './index.jsx'
import { addDays } from 'date-fns'
import { act } from 'react-dom/test-utils'

test('Calendar 렌더링 확인', () => {
  render(<Calendar startDate={new Date()} endDate={addDays(new Date(), 7)} onChangeStartDate={() => {}} />)
  const inputElement = screen.getByRole('textbox')
  expect(inputElement).toBeInTheDocument()
})

test('Calendar가 정상적으로 열리는지 확인', async () => {
  render(
    <>
      <Calendar startDate={new Date()} endDate={addDays(new Date(), 7)} onChangeStartDate={() => {}} />
      <div className="outside" style={{ width: '100px', height: '100px' }}>
        outside
      </div>
    </>
  )
  const inputElement = screen.getByRole('textbox')
  const outside = screen.getByText('outside')

  await act(async () => {
    fireEvent.click(inputElement)
  })

  let calendarElement = await screen.findByText(new Date().getDate().toString())
  expect(calendarElement).toBeInTheDocument()
})

test('비활성화 상태에서 동작하는지 확인', () => {
  const handleChangeStartDate = jest.fn()
  render(
    <Calendar
      startDate={new Date()}
      endDate={addDays(new Date(), 7)}
      onChangeStartDate={handleChangeStartDate}
      disabled={true}
    />
  )

  const inputElement = screen.getByRole('textbox')
  fireEvent.click(inputElement)

  expect(handleChangeStartDate).not.toHaveBeenCalled()
})
