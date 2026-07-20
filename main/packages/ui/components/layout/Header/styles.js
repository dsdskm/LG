import styled from 'styled-components'
import { mobileHeaderButtonStyle } from '@repo/ui/styles'

export const StyledHeader = styled.header`
  background: var(--t-header-bg);

  .container,
  .containerHeader {
    padding: 0 2.4rem;
    height: 100%;

    &,
    .content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      &.left {
        gap: 1.4rem;
      }

      &.right {
        gap: 1.6rem;
      }
    }
  }

  .logo {
    padding-top: 0.4rem;

    /* 브랜드 로고는 테마 공통으로 항상 흰색 */
    & svg path {
      fill: var(--color-neutral-10);
    }
  }

  @media all and (max-width: 767px) {
    .containerHeader {
      padding: 0 0.5rem 0 0;

      .content.left {
        gap: 0rem;
      }
    }

    .logout {
      font-size: 12px;
    }
  }
`

export const StyledHeaderButton = styled.button`
  & .icon {
    border-radius: var(--radius-xs);
    display: inline-flex;
    padding: 0.6rem;

    &:hover {
      background: var(--alpha-black-20);
    }

    &:active {
      background: var(--alpha-black-40);
    }
  }

  &.hideOnMobile {
    @media all and (max-width: 767px) {
      display: inline-flex;
      align-items: center;
      justify-content: center;

      width: 44px;
      height: 44px;
      padding: 0;
      flex-shrink: 0;

      & svg {
        width: 24px;
        height: 24px;
      }
    }
  }

  &.language {
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.2rem;
    color: var(--color-neutral-10);

    /* 언어 지구본 아이콘은 테마 공통으로 항상 흰색 라인아트 */
    & .icon svg circle,
    & .icon svg path {
      stroke: var(--color-neutral-10);
    }

    & .icon svg circle {
      fill: none;
    }
  }

  @media all and (max-width: 767px) {
    &.notification {
      ${mobileHeaderButtonStyle};
      bottom: 2.4rem;
    }

    & .icon {
      border-radius: 50%;
      background: var(--alpha-black-30);

      &:hover {
        background: var(--alpha-black-45);
      }

      &:active {
        background: var(--alpha-black-55);
      }
    }
  }
`

export const StyledProfileContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;

  & > button {
    background: var(--t-account-bg);
    color: var(--color-neutral-10);
    border-radius: var(--radius-sm);

    &:hover:not(:disabled) {
      text-decoration: none;
      background: var(--t-account-hover-bg);
    }

    &:active:not(:disabled) {
      background: var(--t-account-active-bg);
    }
  }
`

export const StyledProfileDropdown = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 0.8rem);
  min-width: 12rem;
  background: var(--color-neutral-10);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-03);
  padding: 0.4rem 0;
  z-index: 50;

  & > button {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 1rem 1.6rem;
    color: var(--color-neutral-80);
    background: transparent;
    font-size: 1.4rem;
    font-weight: 500;
    gap: 0.8rem;

    &:hover {
      background: var(--color-secondary-15);
    }
  }
`

export const StyledAiAssistantCard = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;

  min-height: 3.8rem;
  padding: 0 1.2rem;

  border: 0;
  border-radius: 1rem;
  background: var(--color-neutral-60);
  color: #ffffff;

  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;

  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease,
    opacity 0.15s ease;

  &:hover {
    opacity: 0.94;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
    opacity: 0.9;
  }

  @media all and (max-width: 767px) {
    min-height: 3.6rem;
    padding: 0 1rem;
    font-size: 1.2rem;
    gap: 0.6rem;
  }
`

export const StyledAiAssistantLabel = styled.span`
  color: #ffffff;
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;

  @media all and (max-width: 767px) {
    display: none;
  }
`

export const StyledThemeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 3.2rem;
  padding: 0 1rem;
  border: 1px solid var(--alpha-white-30);
  border-radius: var(--radius-sm);
  background: var(--alpha-white-10);
  color: var(--color-neutral-10);
  font-size: 1.2rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--alpha-white-20);
  }

  @media all and (max-width: 767px) {
    display: none;
  }
`
