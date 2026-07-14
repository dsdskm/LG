import styled, { css } from 'styled-components'

export const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
`

export const TabBar = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 4px;
  width: 100%;
  margin-bottom: 0;
  border-bottom: 1px solid #e5e7eb;
`

export const TabButton = styled.button`
  position: relative;
  height: 40px;
  padding: 0 16px;
  border: none;
  background: transparent;
  color: ${({ $active }) => ($active ? '#2563eb' : '#4b5563')};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: #2563eb;
  }

  ${({ $active }) =>
    $active
      ? css`
          &::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            bottom: -1px;
            height: 2px;
            background: #2563eb;
            border-radius: 999px;
          }
        `
      : ''}
`

export const TabContent = styled.div`
  width: 100%;
  min-width: 0;
`

export const TabPanelContainer = styled.div`
  width: 100%;
  min-width: 0;
  padding: 16px 0 0;
`

export const TabPanelInner = styled.div`
  width: 100%;
  min-width: 0;
`

export const PlaceholderPanel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  color: #6b7280;
  font-size: 14px;
`
