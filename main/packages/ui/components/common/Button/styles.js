import styled, { css } from 'styled-components'
import { Link, NavLink } from 'react-router-dom'
import { buttonStyle } from '@repo/ui/styles'

const buttonStyles = css`
  ${buttonStyle};

  ${({ $size }) => {
    switch ($size) {
      case 'lg':
        return `
          padding: 1.4rem 1.6rem;
          gap: 0.4rem;
          border-radius: var(--radius-md);
          @media all and (max-width: 640px) {
            padding: 1.2rem 1.4rem;  
          }
        `
      case 'sm':
        return `
          padding: 0.6rem 1.4rem;
          gap: 0.4rem;
          border-radius: var(--radius-xs);
          
          @media all and (max-width: 640px) {
            padding: 0.9rem 1rem;  
          }
        `
      case 'md':
      default:
        return `
          padding: 0.9rem 1.6rem;
          gap: 0.2rem;
          border-radius: var(--radius-sm);
          
          @media all and (max-width: 640px) {
            padding: 0.9rem 1.2rem;  
          }
        `
    }
  }};

  ${({ $theme }) => {
    switch ($theme) {
      case 'secondary':
        return `
          background: var(--color-secondary-80);
          color: var(--color-neutral-10);
          border: 1px solid transparent;
          
          &:hover:not(:disabled) {
            text-decoration: underline;
            background: var(--color-secondary-90);
          }
          &:active:not(:disabled) {
            text-decoration: none;
            background: var(--color-secondary-100);
          }
        `
      case 'tertiary':
        return `
          background: var(--color-neutral-10);
          color: var(--color-neutral-80);
          border: 1px solid var(--color-secondary-20);
          
          &:hover:not(:disabled) {
            text-decoration: underline;
            background: var(--color-secondary-10);
          }
          &:active:not(:disabled) {
            text-decoration: none;
            background: var(--color-secondary-20);
          }
        `
      case 'light':
        return `
          background: var(--color-secondary-10);
          color: var(--color-neutral-70);
          border: 1px solid transparent;
          
          &:hover:not(:disabled) {
            text-decoration: underline;
            background: var(--color-secondary-20);
          }
          &:active:not(:disabled) {
            text-decoration: none;
            background: var(--color-secondary-30);
          }
        `
      case 'dark':
        return `
          background: var(--alpha-black-30);
          color: var(--color-neutral-10);
          border: 1px solid transparent;
          
          &:hover:not(:disabled) {
            text-decoration: underline;
            background: var(--alpha-black-50);
          }
          &:active:not(:disabled) {
            text-decoration: none;
            background: var(--alpha-black-70);
          }
        `
      case 'text':
        return `
          color: var(--color-neutral-80);
          border: 1px solid transparent;
          
          &:hover:not(:disabled),
          &:active:not(:disabled) {
            text-decoration: underline;
          }
        `
      case 'delete':
        return `
          background: var(--alpha-error-10);
          color: var(--color-error-70);
          border: 1px solid transparent;
          
          &:hover:not(:disabled) {
            text-decoration: underline;
            background: var(--alpha-error-30);
          }
          &:active:not(:disabled) {
            text-decoration: none;
            background: var(--alpha-error-60);
          }
        `
      case 'link':
        return `
          color: var(--color-neutral-80);
          text-decoration: underline;
          border: 1px solid transparent;
          
          &:hover:not(:disabled) {
            font-weight: bold;
            // background: var(--color-secondary-20);
          }
          &:active:not(:disabled) {
            font-weight: bold;
            // background: var(--color-secondary-30);
          }
        `
      case 'primary':
      default:
        return `
          background: var(--color-primary-70);
          color: var(--color-neutral-10);
          border: 1px solid transparent;
          
          &:hover:not(:disabled) {
            text-decoration: underline;
            background: var(--color-primary-80);
          }
          &:active:not(:disabled) {
            text-decoration: none;
            background: var(--color-primary-90);
          }
        `
    }
  }}
`

export const StyledButton = styled.button`
  ${buttonStyles}
`

export const StyledAnchor = styled.a`
  ${buttonStyles};
`

export const StyledLink = styled(Link)`
  ${buttonStyles};
`

export const StyledNavLink = styled(NavLink)`
  ${buttonStyles};
`
