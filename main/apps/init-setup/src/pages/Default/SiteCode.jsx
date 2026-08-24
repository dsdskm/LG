import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Section } from '@repo/ui'
import {
  StyledPageContent,
  PageHero,
  HeroText,
  HeroTitle,
  HeroDescription,
  SetupFormCard,
  SetupCardIntro,
  RadioLine,
  FormRow,
  FormLabel,
  FormInput,
  ActionButton,
  SecondaryActionButton,
  WizardButtonWrap,
  ErrorText
} from './styles'
import { saveSiteCode } from '@/apis/defaultSetup'

const DEFAULT_SITE_CODE = 'GRPBCCCC'
const SITE_CODE_RE = /^[A-Z0-9]{8}$/

const SiteCode = () => {
  const navigate = useNavigate()
  const [method, setMethod] = useState('manual')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const handleNext = async () => {
    const value = method === 'default' ? DEFAULT_SITE_CODE : code
    if (!SITE_CODE_RE.test(value)) {
      setErr('지점 코드는 영문 대문자 또는 숫자 8자리로 입력하세요.')
      return
    }

    setBusy(true)
    setErr('')
    try {
      await saveSiteCode({ method, code: value })
      navigate('/location')
    } catch (e) {
      setErr(`지점 정보 조회 실패: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <StyledPageContent>
      <Section>
        <PageHero>
          <HeroText>
            <HeroTitle>지점 코드</HeroTitle>
            <HeroDescription>관제에 등록된 지점 코드를 입력하거나 기본 지점을 선택합니다.</HeroDescription>
          </HeroText>
        </PageHero>

        <SetupFormCard>
          <SetupCardIntro>지점 코드를 입력하거나 기본 지점을 선택하세요.</SetupCardIntro>

          <RadioLine>
            <input
              type="radio"
              checked={method === 'manual'}
              onChange={() => setMethod('manual')}
            />
            직접 입력
          </RadioLine>

          <FormRow>
            <FormLabel>지점 코드</FormLabel>
            <FormInput
              value={code}
              maxLength={8}
              disabled={method !== 'manual'}
              onFocus={() => setMethod('manual')}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="영문 대문자 또는 숫자 8자리"
            />
          </FormRow>

          <div style={{ margin: '2.4rem 0', borderTop: '1px solid var(--color-neutral-20)', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '50%', top: 0, transform: 'translate(-50%, -50%)', padding: '0 .9rem', background: 'var(--color-neutral-10)', color: 'var(--color-neutral-50)', fontSize: '1.2rem', fontWeight: 700 }}>또는</span>
          </div>

          <RadioLine>
            <input
              type="radio"
              checked={method === 'default'}
              onChange={() => setMethod('default')}
            />
            기본 지점
          </RadioLine>

          {err && <ErrorText>{err}</ErrorText>}

          <WizardButtonWrap>
            <SecondaryActionButton type="button" onClick={() => navigate('/network')} disabled={busy}>
              이전
            </SecondaryActionButton>
            <ActionButton
              type="button"
              onClick={handleNext}
              disabled={busy || (method === 'manual' && !SITE_CODE_RE.test(code))}
            >
              {busy ? '조회 중...' : '다음'}
            </ActionButton>
          </WizardButtonWrap>
        </SetupFormCard>
      </Section>
    </StyledPageContent>
  )
}

export default SiteCode
