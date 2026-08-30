import styled, { css } from 'styled-components'

export const FuncCardButton = styled.button`
  display: flex;
  flex-direction: column;
  min-height: 250px;
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

export const FuncCardHeader = styled.div`
  padding: 16px 16px 10px;
  border-bottom: 1px solid #eef2f7;
`

export const FuncTitleWrap = styled.div`
  min-width: 0;
`

export const FuncTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  line-height: 1.25;
  font-weight: 700;
  color: #111827;
`

export const FuncSubText = styled.div`
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: #6b7280;
`

export const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 10px 16px 0;
`

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  height: 24px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;

  ${({ $kind }) => {
    if ($kind === 'tag') {
      return css`
        background: #fff7ed;
        color: #c2410c;
      `
    }

    if ($kind === 'action') {
      return css`
        background: #dbeafe;
        color: #1d4ed8;
      `
    }

    if ($kind === 'owner') {
      return css`
        background: #ecfdf5;
        color: #047857;
      `
    }

    return css`
      background: #eef2f7;
      color: #475569;
    `
  }}
`

export const CardBody = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px 16px 16px;
  flex: 1;
`

export const InfoBlock = styled.div`
  display: grid;
  gap: 6px;
`

export const InfoLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`

export const InfoValue = styled.div`
  min-height: 40px;
  padding: 10px 12px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  background: #fafcff;
  font-size: 13px;
  line-height: 1.5;
  color: #334155;
  word-break: break-word;
`

export const EmptyStateSmall = styled.div`
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
`
