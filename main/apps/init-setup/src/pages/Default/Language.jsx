import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Section } from '@repo/ui'
import i18n from '@/i18n'
import {
  StyledPageContent,
  PageHero,
  HeroText,
  HeroTitle,
  HeroDescription,
  SetupFormCard,
  SetupCardIntro,
  LanguageList,
  LanguageOption,
  LanguageRadio,
  LanguageBadge,
  LanguageText,
  LanguageName,
  LanguageSubName,
  ActionButton,
  WizardButtonWrapSingle
} from './styles'

const LANGUAGE_OPTIONS = [
  { id: 'ko-KR', badge: 'KR', name: '한국어', subName: '한국어' },
  { id: 'en-US', badge: 'EN', name: 'English', subName: '영어' }
]

const Language = () => {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(() => {
    const current = i18n.resolvedLanguage || i18n.language
    return current === 'en-US' || current?.startsWith('en') ? 'en-US' : 'ko-KR'
  })

  const handleNext = async () => {
    await i18n.changeLanguage(selected)
    window.localStorage.setItem('i18nextLng', selected)
    navigate('/network')
  }

  return (
    <StyledPageContent>
      <Section>
        <PageHero>
          <HeroText>
            <HeroTitle>언어 설정</HeroTitle>
            <HeroDescription>초기 설정에서 사용할 언어를 선택하세요.</HeroDescription>
          </HeroText>
        </PageHero>

        <SetupFormCard>
          <SetupCardIntro>언어를 선택하세요.</SetupCardIntro>

          <LanguageList>
            {LANGUAGE_OPTIONS.map((language) => {
              const active = selected === language.id
              return (
                <LanguageOption
                  key={language.id}
                  type="button"
                  $active={active}
                  onClick={() => setSelected(language.id)}
                  aria-pressed={active}
                >
                  <LanguageRadio $active={active} aria-hidden="true" />
                  <LanguageBadge $active={active}>{language.badge}</LanguageBadge>
                  <LanguageText>
                    <LanguageName>{language.name}</LanguageName>
                    <LanguageSubName>{language.subName}</LanguageSubName>
                  </LanguageText>
                </LanguageOption>
              )
            })}
          </LanguageList>

          <WizardButtonWrapSingle>
            <ActionButton type="button" onClick={handleNext}>
              다음
            </ActionButton>
          </WizardButtonWrapSingle>
        </SetupFormCard>
      </Section>
    </StyledPageContent>
  )
}

export default Language
