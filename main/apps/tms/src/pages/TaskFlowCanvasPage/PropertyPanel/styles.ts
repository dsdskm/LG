import styled, { css } from 'styled-components'
import { dashedBox } from '../styles.shared'

export { PanelRoot, Card } from '../styles.shared'

export const PanelHeader = styled.div`
  margin-bottom: 12px;
`

export const PanelKicker = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
`

export const EmptyState = styled.div`
  ${dashedBox}
  padding: 32px 16px;
  text-align: center;
`

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const CardTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

export const CardTopLeft = styled.div`
  min-width: 0;
  flex: 1;
`

export const CardTitle = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: 14px;
  font-weight: 800;
  color: #0f172a;

  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
`

export const controlBase = css`
  width: 100%;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;

  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;

  outline: none;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;

  &:focus {
    border-color: #94a3b8;
  }

  &:disabled {
    background: #f8fafc;
    color: #64748b;
    cursor: not-allowed;
  }
`

export const NumberInput = styled.input`
  ${controlBase}
`

export const Select = styled.select`
  ${controlBase}
`

export const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;

  font-size: 14px;
  font-weight: 600;
  color: #334155;
`

export const Checkbox = styled.input`
  width: 16px;
  height: 16px;
`
