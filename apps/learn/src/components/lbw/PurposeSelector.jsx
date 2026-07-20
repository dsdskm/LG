import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`

const Option = styled.div`
  padding: 16px;
  border-radius: 10px;
  border: 2px solid ${({ $selected }) => ($selected ? '#FF6B6B' : 'var(--color-secondary-20, #dadde2)')};
  background: ${({ $selected }) => ($selected ? 'rgba(255,107,107,0.08)' : 'var(--color-neutral-10, #fff)')};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #ff6b6b;
  }
`

const OptionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
  margin-bottom: 4px;
`

const OptionDesc = styled.div`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
`

const PURPOSE_KEYS = ['pre-training', 'simple-task', 'motion-extract', 'augmentation-seed']

export default function PurposeSelector({ selected, onToggle }) {
  const { t } = useTranslation('learn')
  return (
    <Grid>
      {PURPOSE_KEYS.map((key) => (
        <Option key={key} $selected={selected.includes(key)} onClick={() => onToggle(key)}>
          <OptionTitle>{t(`lbwPurposes.${key}.title`)}</OptionTitle>
          <OptionDesc>{t(`lbwPurposes.${key}.desc`)}</OptionDesc>
        </Option>
      ))}
    </Grid>
  )
}
