import { useState } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Styled components
// ─────────────────────────────────────────────────────────────────────────────
const PageWrap = styled.div`
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
`

const TopBar = styled.header`
  background: #1e293b;
  padding: 0 32px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`

const LogoText = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
`

const BackBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;

  &:hover { color: #fff; }
`

const Main = styled.main`
  flex: 1;
  max-width: 760px;
  width: 100%;
  margin: 48px auto;
  padding: 0 24px;

  @media (max-width: 600px) { margin: 24px auto; }
`

const PageHeader = styled.div`
  margin-bottom: 32px;
`

const PageTitle = styled.h1`
  font-size: 26px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px;
`

const PageDesc = styled.p`
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 600px) { grid-template-columns: 1fr; }
`

const Card = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 28px 32px;
`

const FormCard = styled(Card)`
  grid-column: 1 / -1;
`

const SectionTitle = styled.h2`
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 500px) { grid-template-columns: 1fr; }
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #374151;

  span { color: #ef4444; margin-left: 2px; }
`

const inputStyle = `
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  color: #1e293b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: #fff;
  }

  &::placeholder { color: #94a3b8; }
`

const Input = styled.input`${inputStyle}`
const Select = styled.select`${inputStyle} cursor: pointer;`
const Textarea = styled.textarea`
  ${inputStyle}
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
`

const SubmitRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
`

const SubmitBtn = styled.button`
  padding: 10px 32px;
  background: #6366f1;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #4f46e5; }
  &:disabled { background: #a5b4fc; cursor: not-allowed; }
`

const InfoRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;

  &:last-child { border-bottom: none; }
`

const InfoIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #eef2ff;
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
`

const InfoBody = styled.div``

const InfoLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 2px;
`

const InfoValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
`

const SuccessBanner = styled.div`
  background: #dcfce7;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #15803d;
  margin-bottom: 20px;
`

const PageFoot = styled.footer`
  text-align: center;
  padding: 24px;
  font-size: 12px;
  color: #94a3b8;
`

const CATEGORIES = [
  { value: '', label: '문의 유형을 선택하세요' },
  { value: 'product', label: '제품 문의' },
  { value: 'technical', label: '기술 지원' },
  { value: 'account', label: '계정 / 권한' },
  { value: 'billing', label: '계약 / 구독' },
  { value: 'other', label: '기타' }
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerInquiry() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', category: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const isValid = form.name && form.email && form.category && form.subject && form.message

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValid) return
    // TODO: 실제 API 연동 시 여기서 호출
    setSubmitted(true)
    setForm({ name: '', email: '', category: '', subject: '', message: '' })
  }

  return (
    <PageWrap>
      <TopBar>
        <LogoText>OpCon</LogoText>
        <BackBtn type="button" onClick={() => navigate(-1)}>
          ← 이전 페이지
        </BackBtn>
      </TopBar>

      <Main>
        <PageHeader>
          <PageTitle>고객 문의</PageTitle>
          <PageDesc>
            서비스 이용 중 불편한 점이나 궁금한 사항을 남겨주세요.<br />
            담당자가 확인 후 이메일로 빠르게 답변드리겠습니다.
          </PageDesc>
        </PageHeader>

        <Grid>
          <FormCard>
            <SectionTitle>문의 작성</SectionTitle>

            {submitted && (
              <SuccessBanner>
                ✓ 문의가 접수되었습니다. 영업일 기준 1~2일 내로 답변드리겠습니다.
              </SuccessBanner>
            )}

            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <FieldRow>
                  <Field>
                    <Label htmlFor="inq-name">이름 <span>*</span></Label>
                    <Input
                      id="inq-name"
                      placeholder="홍길동"
                      value={form.name}
                      onChange={set('name')}
                      required
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="inq-email">이메일 <span>*</span></Label>
                    <Input
                      id="inq-email"
                      type="email"
                      placeholder="example@lge.com"
                      value={form.email}
                      onChange={set('email')}
                      required
                    />
                  </Field>
                </FieldRow>

                <Field>
                  <Label htmlFor="inq-category">문의 유형 <span>*</span></Label>
                  <Select id="inq-category" value={form.category} onChange={set('category')} required>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value} disabled={c.value === ''}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field>
                  <Label htmlFor="inq-subject">제목 <span>*</span></Label>
                  <Input
                    id="inq-subject"
                    placeholder="문의 제목을 입력하세요"
                    value={form.subject}
                    onChange={set('subject')}
                    required
                  />
                </Field>

                <Field>
                  <Label htmlFor="inq-message">문의 내용 <span>*</span></Label>
                  <Textarea
                    id="inq-message"
                    placeholder="문의하실 내용을 자세히 입력해 주세요."
                    value={form.message}
                    onChange={set('message')}
                    required
                  />
                </Field>

                <SubmitRow>
                  <SubmitBtn type="submit" disabled={!isValid}>
                    문의 접수
                  </SubmitBtn>
                </SubmitRow>
              </FieldGroup>
            </form>
          </FormCard>

          <Card>
            <SectionTitle>연락처 정보</SectionTitle>
            <InfoRow>
              <InfoIcon>📞</InfoIcon>
              <InfoBody>
                <InfoLabel>고객센터</InfoLabel>
                <InfoValue>1544-7777</InfoValue>
              </InfoBody>
            </InfoRow>
            <InfoRow>
              <InfoIcon>✉️</InfoIcon>
              <InfoBody>
                <InfoLabel>이메일</InfoLabel>
                <InfoValue>opcon-support@lge.com</InfoValue>
              </InfoBody>
            </InfoRow>
            <InfoRow>
              <InfoIcon>🕐</InfoIcon>
              <InfoBody>
                <InfoLabel>운영 시간</InfoLabel>
                <InfoValue>평일 09:00 – 18:00</InfoValue>
              </InfoBody>
            </InfoRow>
          </Card>

          <Card>
            <SectionTitle>자주 묻는 질문</SectionTitle>
            {[
              '계정 비밀번호를 잊었어요',
              '로봇 연결이 안 됩니다',
              'OTA 배포 실패 원인을 알고 싶어요',
              '사용자 권한을 변경하고 싶어요',
            ].map((q) => (
              <InfoRow key={q}>
                <InfoIcon style={{ background: '#f0fdf4', color: '#16a34a' }}>?</InfoIcon>
                <InfoBody>
                  <InfoValue style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{q}</InfoValue>
                </InfoBody>
              </InfoRow>
            ))}
          </Card>
        </Grid>
      </Main>

      <PageFoot>
        Copyright © 2026 LG Electronics. All Rights Reserved
      </PageFoot>
    </PageWrap>
  )
}
