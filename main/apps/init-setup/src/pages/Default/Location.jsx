import React, { useEffect, useMemo, useState } from 'react'
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
  FormSelect,
  ActionButton,
  SecondaryActionButton,
  WizardButtonWrap,
  InfoText,
  ErrorText
} from './styles'
import { getOperationLocation, saveOperationLocation } from '@/apis/defaultSetup'
import { advanceSetupProgress, SETUP_STEPS } from '@/utils/setupProgress'

const itemId = (item) => String(item?.id ?? item?.buildingId ?? item?.floorId ?? item?.areaId ?? '')
const itemName = (item) => item?.name ?? item?.buildingName ?? item?.floorName ?? item?.areaName ?? itemId(item)

const Location = () => {
  const navigate = useNavigate()
  const [buildings, setBuildings] = useState([])
  const [defaultSite, setDefaultSite] = useState(false)
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [area, setArea] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    setErr('')
    try {
      const response = await getOperationLocation()
      const data = response?.data ?? response ?? {}
      setBuildings(data?.options?.buildings ?? [])
      setDefaultSite(data?.site_code_method === 'default' && !!data?.site_id)
    } catch (e) {
      setErr(`운영 장소 조회 실패: ${e.message}`)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selectedBuilding = useMemo(
    () => buildings.find((item) => itemId(item) === building),
    [buildings, building]
  )
  const floors = selectedBuilding?.floors || []
  const selectedFloor = useMemo(
    () => floors.find((item) => itemId(item) === floor),
    [floors, floor]
  )
  const areas = selectedFloor?.areas || []
  const canContinue = defaultSite && buildings.length === 0
    ? true
    : !!building && !!floor && (areas.length === 0 || !!area)

  const handleNext = async () => {
    if (!canContinue) return
    setBusy(true)
    setErr('')
    try {
      await saveOperationLocation({ building, floor, area })
      await advanceSetupProgress(SETUP_STEPS.ROBOT_INFO)
      navigate('/robot-info')
    } catch (e) {
      setErr(`운영 장소 저장 실패: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <StyledPageContent>
      <Section>
        <PageHero>
          <HeroText>
            <HeroTitle>운영 장소</HeroTitle>
            <HeroDescription>지점 코드에서 조회된 건물, 층, 영역을 선택합니다.</HeroDescription>
          </HeroText>
        </PageHero>

        <SetupFormCard>
          <SetupCardIntro>로봇이 운영될 장소를 선택하세요.</SetupCardIntro>

          <FormRow>
            <FormLabel>건물</FormLabel>
            <FormSelect
              value={building}
              onChange={(e) => {
                setBuilding(e.target.value)
                setFloor('')
                setArea('')
              }}
            >
              <option value="">건물을 선택하세요</option>
              {buildings.map((item) => (
                <option key={itemId(item)} value={itemId(item)}>{itemName(item)}</option>
              ))}
            </FormSelect>
          </FormRow>

          <FormRow>
            <FormLabel>층</FormLabel>
            <FormSelect
              value={floor}
              disabled={!building}
              onChange={(e) => {
                setFloor(e.target.value)
                setArea('')
              }}
            >
              <option value="">층을 선택하세요</option>
              {floors.map((item) => (
                <option key={itemId(item)} value={itemId(item)}>{itemName(item)}</option>
              ))}
            </FormSelect>
          </FormRow>

          {areas.length > 0 && (
            <FormRow>
              <FormLabel>영역</FormLabel>
              <FormSelect value={area} disabled={!floor} onChange={(e) => setArea(e.target.value)}>
                <option value="">영역을 선택하세요</option>
                {areas.map((item) => (
                  <option key={itemId(item)} value={itemId(item)}>{itemName(item)}</option>
                ))}
              </FormSelect>
            </FormRow>
          )}

          {!err && buildings.length === 0 && (
            <InfoText>{defaultSite ? '기본 지점은 건물/층 선택 없이 다음 단계로 진행합니다.' : '먼저 지점 코드 메뉴에서 Site Code를 적용해 주세요.'}</InfoText>
          )}
          {err && <ErrorText>{err}</ErrorText>}

          <WizardButtonWrap>
            <SecondaryActionButton type="button" onClick={() => navigate('/site-code')} disabled={busy}>
              이전
            </SecondaryActionButton>
            <ActionButton type="button" onClick={handleNext} disabled={busy || !canContinue}>
              {busy ? '적용 중...' : '다음'}
            </ActionButton>
          </WizardButtonWrap>
        </SetupFormCard>
      </Section>
    </StyledPageContent>
  )
}

export default Location
