import Icon from '../Icon'
import { StyledNoData } from './styles'
import React from 'react'

const NoData = ({ children }) => {
  const parseMessageToJSX = (htmlString) => {
    return htmlString.split('<br />').map((text, index) => (
      <React.Fragment key={index}>
        {text}
        {index !== htmlString.split('<br />').length - 1 && <br />}
      </React.Fragment>
    ))
  }
  return (
    <StyledNoData>
      <Icon name="caution" size={36} />
      <p>{parseMessageToJSX(children)}</p>
    </StyledNoData>
  )
}

export default NoData
