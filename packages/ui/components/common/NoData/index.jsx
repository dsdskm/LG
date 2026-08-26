import Icon from '../Icon'
import { StyledNoData } from './styles'
import React from 'react'

const NoData = ({ children }) => {
  // 문자열이 아닌 children(엘리먼트·undefined)은 쪼개지 않고 그대로 넘긴다 —
  // 메시지를 안 넘긴 호출부가 있어 예전에는 undefined.split 으로 화면이 통째로 죽었다.
  const parseMessageToJSX = (htmlString) => {
    if (typeof htmlString !== 'string') return htmlString ?? null
    const parts = htmlString.split('<br />')
    return parts.map((text, index) => (
      <React.Fragment key={index}>
        {text}
        {index !== parts.length - 1 && <br />}
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
