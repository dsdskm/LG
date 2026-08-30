import { StyledHeaderButton } from '@repo/ui/components/layout/Header/styles'
import { StyledLanguageSelect } from './styles'
import SvgLanguage from '../../../assets/svgs/language.svg'
import Icon from '../../common/Icon'
import useToggle from '@repo/hooks/useToggle'
import languageOptions from './data'
import { Suspense, useRef } from 'react'
import useClickOutSide from '@repo/hooks/useClickOutSide'
import { useTranslation } from 'react-i18next'

const LanguageSelect = () => {
  const languageRef = useRef(null)
  const { t, i18n } = useTranslation('layout')
  const { state: isLanguageOpen, toggle: toggleLanguage, off: closeLanguage } = useToggle()

  useClickOutSide(languageRef, closeLanguage)

  const handleLanguageChange = (key) => {
    i18n.changeLanguage(key).then(() => {
      closeLanguage()
    })
  }

  return (
    <StyledLanguageSelect ref={languageRef} className="languageSelect">
      <StyledHeaderButton type="button" className="language" onClick={toggleLanguage}>
        <i className="icon">
          <SvgLanguage />
        </i>
      </StyledHeaderButton>
      {isLanguageOpen && (
        <div className="languageOption">
          <ul className="languageList">
            <Suspense fallback={<div>{t('loading')}</div>}>
              {languageOptions.map(({ key, name, icon: Component }) => (
                <li key={key} className="languageItem">
                  <button type="button" className="selectButton" onClick={() => handleLanguageChange(key)}>
                    <Component />
                    <span className="label">{name}</span>
                    {i18n.language === key && <Icon name="check" size={20} />}
                  </button>
                </li>
              ))}
            </Suspense>
          </ul>
        </div>
      )}
    </StyledLanguageSelect>
  )
}

export default LanguageSelect
