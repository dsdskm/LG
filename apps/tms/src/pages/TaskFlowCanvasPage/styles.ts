import styled from 'styled-components'

export const PageRoot = styled.div`
  display: flex;
  flex-direction: column;

  height: 100vh;
  min-height: 100vh;

  background: #eef3f8;
  color: #0f172a;
`

export const Main = styled.main`
  flex: 1;
  min-height: 0;
  padding: 20px;
`

// 저장 확인 모달 안 "운영 버전 저장" 체크박스 아래 설명 문구
export const SaveHint = styled.p`
  margin: 8px 0 0 28px;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
  white-space: pre-line;
`
