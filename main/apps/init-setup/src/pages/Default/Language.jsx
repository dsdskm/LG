import React, { useCallback, useEffect, useState } from 'react'
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
  WizardButtonWrapSingle,
  ErrorText
} from './styles'
import { list as listLanguages, update as updateLanguage } from '@/apis/languageApis'
import { advanceSetupProgress, SETUP_STEPS } from '@/utils/setupProgress'

// 목록 자체는 BE 언어 마스터(languages)에서 받아오고, 뱃지/부가 표기만 코드별로 보완한다.
// 미등록 코드는 언어 서브태그(ko-KR -> KO)를 뱃지로 쓰고 부가 표기는 코드를 그대로 노출한다.
const LANGUAGE_DISPLAY = {
  'ko-KR': { badge: 'KR', subName: '한국어' },
  'en-US': { badge: 'EN', subName: '영어' }
}

const toOption = (lang) => {
  const display = LANGUAGE_DISPLAY[lang.code] ?? {}
  return {
    id: lang.id,
    code: lang.code,
    name: lang.name || lang.code,
    badge: display.badge ?? lang.code.split('-')[0].toUpperCase(),
    subName: display.subName ?? lang.code
  }
}

// i18n 현재 언어에 가장 가까운 코드를 고른다 (정확 일치 -> 언어 서브태그 일치 -> 첫 항목).
const pickInitialCode = (options) => {
  const current = i18n.resolvedLanguage || i18n.language || ''
  const exact = options.find((option) => option.code === current)
  if (exact) return exact.code
  const base = current.split('-')[0]
  const partial = base && options.find((option) => option.code.split('-')[0] === base)
  return partial?.code ?? options[0]?.code ?? ''
}

const Language = () => {
  const navigate = useNavigate()
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const res = await listLanguages()
      const next = (res?.data ?? []).map(toOption)
      setOptions(next)
      // 이미 사용 가능(enabled)으로 저장된 언어가 있으면 그것을 우선 선택한다.
      const savedCode = (res?.data ?? []).find((lang) => lang.enabled)?.code
      setSelected(savedCode ?? pickInitialCode(next))
    } catch (e) {
      setErr(`언어 목록 조회 실패: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleNext = async () => {
    setBusy(true)
    setErr('')
    try {
      // 선택한 언어만 사용 가능(enabled=true), 나머지는 false 로 내린다.
      for (const option of options) {
        await updateLanguage(option.id, { enabled: option.code === selected })
      }

      await i18n.changeLanguage(selected)
      window.localStorage.setItem('i18nextLng', selected)
      // 이 단계를 끝냈으므로 '작업 중인 단계' 를 다음 화면(네트워크)으로 옮긴다.
      await advanceSetupProgress(SETUP_STEPS.NETWORK)
      navigate('/network')
    } catch (e) {
      setErr(`언어 설정 저장 실패: ${e.message}`)
    } finally {
      setBusy(false)
    }
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
          <SetupCardIntro>{loading ? '언어 목록을 불러오는 중...' : '언어를 선택하세요.'}</SetupCardIntro>

          <LanguageList>
            {options.map((language) => {
              const active = selected === language.code
              return (
                <LanguageOption
                  key={language.id}
                  type="button"
                  $active={active}
                  onClick={() => setSelected(language.code)}
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

          {err && <ErrorText>{err}</ErrorText>}

          <WizardButtonWrapSingle>
            <ActionButton type="button" onClick={handleNext} disabled={busy || loading || !selected}>
              {busy ? '저장 중...' : '다음'}
            </ActionButton>
          </WizardButtonWrapSingle>
        </SetupFormCard>
      </Section>
    </StyledPageContent>
  )
}

export default Language
