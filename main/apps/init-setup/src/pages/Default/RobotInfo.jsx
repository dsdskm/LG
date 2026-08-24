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
  FormRow,
  FormLabel,
  FormInput,
  ActionButton,
  SecondaryActionButton,
  WizardButtonWrap,
  InfoText,
  ErrorText
} from './styles'
import { saveRobotInfo } from '@/apis/defaultSetup'

const RobotInfo = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const handleComplete = async () => {
    const robotName = name.trim()
    if (!robotName) return

    setBusy(true)
    setErr('')
    try {
      const response = await saveRobotInfo({ robot_name: robotName })
      if (response?.registered === false) throw new Error('registration_failed')
      navigate('/terms')
    } catch (e) {
      setErr(`관제 등록 실패: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <StyledPageContent>
      <Section>
        <PageHero>
          <HeroText>
            <HeroTitle>로봇 정보</HeroTitle>
            <HeroDescription>관제에 등록할 로봇명을 설정합니다.</HeroDescription>
          </HeroText>
        </PageHero>

        <SetupFormCard>
          <SetupCardIntro>관제에 등록할 로봇 정보를 입력하세요.</SetupCardIntro>

          <FormRow>
            <FormLabel>로봇명</FormLabel>
            <FormInput
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              placeholder="최대 20자 입력 가능"
            />
            <InfoText>{name.length}/20</InfoText>
          </FormRow>

          {err && <ErrorText>{err}</ErrorText>}

          <WizardButtonWrap>
            <SecondaryActionButton type="button" onClick={() => navigate('/location')} disabled={busy}>
              이전
            </SecondaryActionButton>
            <ActionButton type="button" onClick={handleComplete} disabled={busy || !name.trim()}>
              {busy ? '등록 중...' : '완료'}
            </ActionButton>
          </WizardButtonWrap>
        </SetupFormCard>
      </Section>
    </StyledPageContent>
  )
}

export default RobotInfo
