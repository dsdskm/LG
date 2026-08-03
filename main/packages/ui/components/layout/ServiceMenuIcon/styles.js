import styled from 'styled-components'

export const StyledNavButton = styled.button`
  position: relative;
  background: ${({ $isActive }) => ($isActive ? 'var(--t-menu-active-bg)' : 'transparent')};
  border: none;
  cursor: pointer;
  padding: 0.6rem 1.4rem;
  border-radius: 100px;
  color: var(--color-neutral-10);
  font-weight: ${({ $isActive }) => ($isActive ? 600 : 500)};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  white-space: nowrap;
  flex-shrink: 0;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  &:hover {
    color: var(--color-neutral-10);
    background: ${({ $isActive }) => ($isActive ? 'var(--t-menu-active-hover-bg)' : 'var(--t-menu-hover-bg)')};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
    background: var(--t-menu-active-hover-bg);
  }
`

import Dropdown from '../../common/Dropdown'

export const HeaderMobileDropdown = styled(Dropdown)`
  .select {
    & > .selectButton {
      background: var(--t-menu-active-bg);
      border: none;
      color: var(--color-neutral-10);
      border-radius: 100px;
      height: 3.6rem;
      padding: 0 1.6rem;
      font-weight: 600;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      outline: none !important;

      &:hover:not(:disabled) {
        background: var(--t-menu-active-hover-bg);
        text-decoration: none;
      }
    }
  }

`
