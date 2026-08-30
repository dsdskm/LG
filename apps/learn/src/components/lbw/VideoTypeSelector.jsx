import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
`

const Option = styled.div`
  padding: 20px 16px;
  border-radius: 12px;
  border: 2px solid ${({ $selected }) => ($selected ? '#FF6B6B' : 'var(--color-secondary-20, #dadde2)')};
  background: ${({ $selected }) => ($selected ? 'rgba(255,107,107,0.08)' : 'var(--color-neutral-10, #fff)')};
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;

  &:hover {
    border-color: #ff6b6b;
  }
`

const OptionIcon = styled.div`
  font-size: 28px;
  margin-bottom: 10px;
`

const OptionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
  margin-bottom: 6px;
`

const OptionDesc = styled.div`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
  line-height: 1.4;
`

const VIDEO_TYPE_KEYS = [
  { value: 'ego', icon: '👁️' },
  { value: 'exo', icon: '📷' },
  { value: 'mixed', icon: '🎬' }
]

export default function VideoTypeSelector({ selected, onSelect }) {
  const { t } = useTranslation('learn')
  return (
    <Grid>
      {VIDEO_TYPE_KEYS.map((type) => (
        <Option key={type.value} $selected={selected === type.value} onClick={() => onSelect(type.value)}>
          <OptionIcon>{type.icon}</OptionIcon>
          <OptionTitle>{t(`videoTypes.${type.value}.title`)}</OptionTitle>
          <OptionDesc>{t(`videoTypes.${type.value}.desc`)}</OptionDesc>
        </Option>
      ))}
    </Grid>
  )
}
