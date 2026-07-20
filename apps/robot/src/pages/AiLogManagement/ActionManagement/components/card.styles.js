import styled, { css } from 'styled-components'

export const ActionCardButton = styled.button`
  display: flex;
  flex-direction: column;
  min-height: 230px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
  }
`

export const ActionCardHeader = styled.div`
  padding: 16px 16px 10px;
  border-bottom: 1px solid #eef2f7;
`

export const ActionTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  line-height: 1.25;
  font-weight: 700;
  color: #111827;
`

export const ActionMeta = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
`

export const ActionBadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 10px 16px 0;
`

export const ActionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  height: 24px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;

  ${({ $kind }) => {
    if ($kind === 'configured')
      return css`
        background: #ecfdf5;
        color: #047857;
      `
    if ($kind === 'empty')
      return css`
        background: #fff7ed;
        color: #c2410c;
      `
    if ($kind === 'primary')
      return css`
        background: #dbeafe;
        color: #1d4ed8;
      `
    return css`
      background: #eef2f7;
      color: #475569;
    `
  }}
`

export const ActionBody = styled.div`
  display: grid;
  gap: 8px;
  padding: 12px 16px 16px;
  flex: 1;
`

export const ActionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.02em;
`

export const ActionHint = styled.div`
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
`
