import React from 'react'
import { StyledPageContent, ButtonWrap } from './styles'
import { Section, Title, Checkbox, Button, Input } from '@repo/ui'

const Page1 = () => {
  return (
    <StyledPageContent>
      <Section>
        <Title>Device</Title>
        <Checkbox label="Connect to Device" />
        <ButtonWrap>
          <Button>시작</Button>
          <Button>정지</Button>
        </ButtonWrap>
      </Section>
      <Section>
        <Title>WiFi 설정</Title>
        <ButtonWrap>
          <Button>WiFi 스캔</Button>
        </ButtonWrap>
      </Section>
      <Section>
        <Title>관제 등록</Title>
        <Input label="ID" />
        <Input label="PW" type="password" />
        <ButtonWrap>
          <Button>등록</Button>
        </ButtonWrap>
      </Section>
    </StyledPageContent>
  )
}

export default Page1
