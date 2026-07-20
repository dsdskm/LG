import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Dropdown from './index'

describe('Dropdown Component', () => {
  const options = ['Option 1', 'Option 2', 'Option 3']

  test('드랍다운 컴포넌트 렌더링 확인', () => {
    render(<Dropdown label="Test Dropdown" options={options} defaultValue={options[0]} />)
    expect(screen.getByText('Test Dropdown')).toBeInTheDocument()
    expect(screen.getByRole('button').textContent).toBe('Option 1')
  })

  test('클릭 시 열리는지 확인', () => {
    render(<Dropdown label="Test Dropdown" options={options} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getAllByText('Option 1')[0]).toBeVisible()
  })

  //   test('can select an option', () => {
  //     const handleChange = jest.fn();
  //     render(
  //       <Dropdown
  //         label="Test Dropdown"
  //         options={options}
  //         onChange={handleChange}
  //       />
  //     );
  //     const button = screen.getByRole('button');
  //     act(() => {
  //       fireEvent.click(button);
  //     });
  //     const option = screen.getAllByText('Option 1')[0];
  //     act(() => {
  //       fireEvent.click(option);
  //     });
  //     expect(handleChange).toHaveBeenCalledWith('Option 1');
  //   });
})
