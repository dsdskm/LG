import styled from 'styled-components'
import { StyledFnb, StyledFooter } from './styles'
import { Button } from '@repo/ui'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const defaultRoutes = [
  { name: 'customerInquiry', path: '/customer-inquiry', prefix: '', as: 'Link' }
]

const CopyrightText = styled.span`
  display: flex;
  align-items: center;
  font-size: var(--font-size-button-5);
  line-height: var(--line-height-button-5);
  font-weight: 500;
  color: var(--t-footer-fg);
  white-space: nowrap;

  &::before {
    content: '';
    display: block;
    margin: 0 0.8rem;
    width: 0.1rem;
    height: 1.2rem;
    background: var(--alpha-black-10);
  }

  @media all and (max-width: 767px) {
    display: block;
    text-align: center;
    margin-top: 0.4rem;

    &::before { display: none; }
  }
`

const Footer = ({ routes = defaultRoutes }) => {
  const { t } = useTranslation('layout')
  const { pathname } = useLocation()

  return (
    <StyledFooter>
      <StyledFnb>
        <ul className="fnbList">
          {routes.map(({ name, path, as = 'Button' }) => (
            <li key={name} className="fnbItem">
              <Button
                type="button"
                theme="text"
                as={as}
                to={path}
                className={`typographyButton5 ${pathname === path ? 'active' : ''}`}
              >
                {t(`Footer.${name}`)}
              </Button>
            </li>
          ))}
        </ul>
        <CopyrightText>{t('Footer.copyright')}</CopyrightText>
      </StyledFnb>
    </StyledFooter>
  )
}

export default Footer
