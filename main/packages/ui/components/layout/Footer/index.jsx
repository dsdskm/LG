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
  white-space: normal;
  word-break: break-word;

  @media all and (max-width: 767px) {
    display: block;
    text-align: center;
    margin-top: 0.4rem;
    width: 100%;
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
                className={`typographyButton5 fnbLink ${pathname === path ? 'active' : ''}`}
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
