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
  TermsList,
  TermRow,
  TermCheckButton,
  TermCheckMark,
  TermLabel,
  TermArrowButton,
  TermsDetailHeader,
  TermsBackButton,
  TermsDetailTitle,
  TermsDetailBody,
  ActionButton,
  SecondaryActionButton,
  WizardButtonWrap,
  ErrorText
} from './styles'
import { completeInitialSetup } from '@/utils/setupProgress'

const TERMS = [
  { id: 'service', title: '(필수) 서비스 이용 약관' },
  { id: 'software', title: '(필수) 소프트웨어 사용권 계약' }
]

const Terms = () => {
  const navigate = useNavigate()
  const [checked, setChecked] = useState({ service: false, software: false })
  const [detailId, setDetailId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const allChecked = TERMS.every(({ id }) => checked[id])
  const detail = TERMS.find(({ id }) => id === detailId)

  const toggle = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const openDetail = (id) => {
    setDetailId(id)
  }

  const closeDetailAndAgree = () => {
    if (detailId) {
      setChecked((prev) => ({ ...prev, [detailId]: true }))
    }
    setDetailId(null)
  }

  const handleComplete = async () => {
    if (!allChecked || busy) return

    setBusy(true)
    setErr('')
    try {
      // 약관 동의가 초기 설정(1~6단계)의 마지막이다 — status 를 'completed' 로 올려 헤더에서
      // 초기 설정 탭이 사라지게 하고(App.jsx setupCompleted), 작업 단계는 맵 스캔으로 옮긴다.
      // 같은 값이 단계 순서 잠금도 풀기 때문에 이후에는 맵 스캔·시맨틱을 건너뛰고 업로드로도
      // 들어갈 수 있다(routes.jsx getSetupProgress).
      await completeInitialSetup()
      // '/map' 은 화면이 없는 부모 경로라 맵 설정 첫 화면으로 리다이렉트된다(router/routes.jsx mapIndex).
      navigate('/map', { replace: true })
      window.location.reload()
    } catch (error) {
      setErr(`초기 설정 완료 처리 실패: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <StyledPageContent>
      <Section>
        <PageHero>
          <HeroText>
            <HeroTitle>서비스 이용약관</HeroTitle>
            <HeroDescription>서비스 이용에 필요한 약관을 확인하고 동의하세요.</HeroDescription>
          </HeroText>
        </PageHero>

        <SetupFormCard>
          {detail ? (
            <>
              <TermsDetailHeader>
                <TermsBackButton type="button" onClick={closeDetailAndAgree} aria-label="약관 목록으로 돌아가기">
                  ←
                </TermsBackButton>
                <TermsDetailTitle>{detail.title}</TermsDetailTitle>
              </TermsDetailHeader>
              <TermsDetailBody aria-label={`${detail.title} 상세 내용`} />
            </>
          ) : (
            <>
              <SetupCardIntro>이용 약관 및 정책을 확인하세요.</SetupCardIntro>

              <TermsList>
                {TERMS.map((term) => (
                  <TermRow key={term.id}>
                    <TermCheckButton
                      type="button"
                      $checked={checked[term.id]}
                      onClick={() => toggle(term.id)}
                      aria-label={`${term.title} ${checked[term.id] ? '동의 취소' : '동의'}`}
                      aria-pressed={checked[term.id]}
                    >
                      {checked[term.id] && <TermCheckMark>✓</TermCheckMark>}
                    </TermCheckButton>
                    <TermLabel>{term.title}</TermLabel>
                    <TermArrowButton
                      type="button"
                      onClick={() => openDetail(term.id)}
                      aria-label={`${term.title} 상세 보기`}
                    >
                      ›
                    </TermArrowButton>
                  </TermRow>
                ))}
              </TermsList>

              {err && <ErrorText>{err}</ErrorText>}

              <WizardButtonWrap>
                <SecondaryActionButton type="button" onClick={() => navigate('/robot-info')} disabled={busy}>
                  이전
                </SecondaryActionButton>
                <ActionButton type="button" onClick={handleComplete} disabled={!allChecked || busy}>
                  {busy ? '완료 처리 중...' : '완료'}
                </ActionButton>
              </WizardButtonWrap>
            </>
          )}
        </SetupFormCard>
      </Section>
    </StyledPageContent>
  )
}

export default Terms
