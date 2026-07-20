import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 8px;
  flex-wrap: wrap;
`

const Label = styled.span`
  font-size: 13px;
  color: var(--color-secondary-50, #848c9d);
  white-space: nowrap;
`

const Select = styled.select`
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-secondary-20, #dadde2);
  background: var(--color-neutral-10, #fff);
  color: var(--color-secondary-90, #262f44);
  font-size: 13px;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: #4a90d9;
  }
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-secondary-70, #555e72);
  cursor: pointer;
  user-select: none;
`

export default function FilterBar({ filters, values, onChange }) {
  const { t } = useTranslation('learn')
  return (
    <Bar>
      {filters.map((filter) => (
        <div key={filter.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Label>{filter.label}:</Label>
          {filter.type === 'select' && (
            <Select value={values[filter.key] || ''} onChange={(e) => onChange(filter.key, e.target.value)}>
              <option value="">{t('filterBar.allOption')}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
          {filter.type === 'checkbox' && (
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={!!values[filter.key]}
                onChange={(e) => onChange(filter.key, e.target.checked)}
              />
              {filter.checkLabel || filter.label}
            </CheckboxLabel>
          )}
        </div>
      ))}
    </Bar>
  )
}
