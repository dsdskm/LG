import styled from 'styled-components'

export const StyledNavButton = styled.button`
  position: relative;
  background: ${({ $isActive }) => ($isActive ? 'rgba(255, 255, 255, 0.25)' : 'transparent')};
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
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  &:hover {
    color: var(--color-neutral-10);
    background: ${({ $isActive }) => ($isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)')};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
    background: rgba(255, 255, 255, 0.25);
  }
`

import Dropdown from '../../common/Dropdown'

export const HeaderMobileDropdown = styled(Dropdown)`
  .select {
    & > .selectButton {
      background: rgba(255, 255, 255, 0.25);
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
        background: rgba(255, 255, 255, 0.35);
        text-decoration: none;
      }
    }
  }
`
