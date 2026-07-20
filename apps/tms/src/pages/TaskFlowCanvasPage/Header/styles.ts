import styled, { css } from 'styled-components'

export const HeaderRoot = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;

  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  background: linear-gradient(90deg, #5ba1c2 0%, #97d0eb 52.77%, #6caecc 92.03%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);

  padding: 12px 24px;
  gap: 20px;
`

export const Left = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  flex: 1;
`

export const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex-wrap: wrap;
`

export const OrganizationMeta = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
`

export const MetaItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

export const MetaLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: rgba(255, 255, 255, 0.72);
  flex-shrink: 0;
`

export const MetaValue = styled.span`
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  color: #ffffff;
  min-width: 0;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const MetaDivider = styled.span`
  width: 1px;
  height: 12px;
  background: rgba(255, 255, 255, 0.28);
  flex-shrink: 0;
`

export const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;

  border-radius: 9999px;
  padding: 4px 12px;

  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`

const baseButton = css`
  border: 0;
  cursor: pointer;
  user-select: none;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  font-size: 14px;
  font-weight: 600;

  transition: background 120ms ease, transform 80ms ease, opacity 120ms ease;

  &:active {
    transform: translateY(0.5px);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.4);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`

export const PrimaryButton = styled.button`
  ${baseButton};

  border-radius: 12px;
  padding: 8px 16px;

  background: #ffffff;
  color: #5f88a8;

  &:hover:not(:disabled) {
    background: #f8fafc;
  }
`

export const SecondaryButton = styled.button`
  ${baseButton};

  border-radius: 12px;
  padding: 8px 16px;

  border: 1px solid rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.26);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.55);
    outline-offset: 2px;
  }
`

export const IconButton = styled.button`
  ${baseButton};

  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 10px;

  border: 1px solid rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.26);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.55);
    outline-offset: 2px;
  }

  /* 더 이상 undo/redo 할 게 없으면 명확히 비활성으로 표시 */
  &:disabled {
    opacity: 0.35;
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.55);
  }
`

export const HeaderDivider = styled.span`
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.35);
  margin: 0 2px;
  flex-shrink: 0;
`

export const Description = styled.div`
  margin-top: 2px;
  font-size: 12px;
  line-height: 16px;
  color: rgba(255, 255, 255, 0.78);
  max-width: 720px;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`