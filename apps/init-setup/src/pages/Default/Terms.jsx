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
import { advanceSetupProgress, SETUP_STEPS } from '@/utils/setupProgress'

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
      // 약관 동의는 초기 설정(1~6단계)의 마지막이지 셋업 전체의 끝이 아니다.
      // 그래서 status 는 'draft' 로 두고 작업 중인 단계만 맵 스캔으로 옮긴다 — 'completed' 로 올리면
      // routes.jsx getSetupProgress 가 잠금을 전부 풀어서 맵 스캔/시맨틱을 건너뛰고 업로드가 열린다.
      // (전역 완료는 마지막 단계인 업로드에서만 기록한다 — utils/setupProgress.completeSetup)
      await advanceSetupProgress(SETUP_STEPS.MAP_SCAN)
      navigate('/map/scan', { replace: true })
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
