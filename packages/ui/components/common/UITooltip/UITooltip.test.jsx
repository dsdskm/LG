import React from 'react'
import { render } from '@testing-library/react'
import UITooltip from './index'
import { Tooltip } from 'react-tooltip'

jest.mock('react-tooltip', () => ({
  Tooltip: ({ render }) => {
    const fakeActiveAnchor = {
      getAttribute: (attr) => {
        if (attr === 'data-tooltip-title') return 'Test Title'
        if (attr === 'data-tooltip-desc') return 'Test Tooltip Content'
        return null
      }
    }
    return <div>{render({ activeAnchor: fakeActiveAnchor })}</div>
  }
}))

describe('UITooltip 컴포넌트', () => {
  it('Tooltip을 포함하여 렌더링되어야 함', () => {
    const { getAllByText, container } = render(
      <UITooltip id="test-tooltip">
        <span>Test Tooltip Content</span>
      </UITooltip>
    )

    const tooltipTexts = getAllByText('Test Tooltip Content')
    expect(tooltipTexts[0]).toBeInTheDocument()

    const tooltipDesc = container.querySelector('.tooltipDesc')
    expect(tooltipDesc).toHaveTextContent('Test Tooltip Content')
  })
})
