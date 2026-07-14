import React from 'react'
import { Icon } from '@repo/ui'
import {
  ArticleStateItem,
  DivStateHeader,
  H4StateText,
  DivStateCount,
  StrongStateNumber,
  SpanStateUnit,
  SpanSubText
} from './styles'

const StateStatusCard = ({
  dataValue,
  icon,
  iconType = 'outlined',
  iconColor = '#2c2d38',
  label,
  count = 0,
  unit = '',
  subText,
  onClick,
  background = '#ffffff'
}) => {
  return (
    <ArticleStateItem data-value={dataValue} onClick={onClick} background={background}>
      <DivStateHeader>
        {icon && <Icon name={icon} type={iconType} size={20} color={iconColor} />}
        <H4StateText>{label}</H4StateText>
      </DivStateHeader>
      <DivStateCount>
        <StrongStateNumber>
          {count}
          {unit && <SpanStateUnit>{unit}</SpanStateUnit>}
        </StrongStateNumber>
        {subText && <SpanSubText>{subText}</SpanSubText>}
      </DivStateCount>
    </ArticleStateItem>
  )
}

export default StateStatusCard
