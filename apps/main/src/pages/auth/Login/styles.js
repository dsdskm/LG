import styled from 'styled-components'

// 로그인/인증 화면 공통 레이아웃 스타일은 @repo/ui의 LoginPage와 공유한다.
// main의 다른 auth 페이지(Invitations, ResetPassword, SetPassword)들이 이 경로로
// 계속 참조하고 있으므로 여기서 재노출한다.
export {
  LoginContainer,
  LoginBox,
  LogoWrapper,
  Title,
  FormGroup,
  ErrorMessage,
  LanguageSelectWrapper,
  ButtonWrapper,
  Footer
} from '@repo/ui/components/pages/LoginPage/styles'

// 아래 안내 박스 스타일은 main 앱 전용이다.
export const BlueDescBox = styled.div`
  padding: 1.6rem;
  background-color: oklch(97% 0.014 254.604);
  border-color: oklch(88.2% 0.059 254.128);
  border-style: solid;
  border-width: 1px;
  border-radius: 0.625rem;
  margin-bottom: 1rem;
`

export const BlueDescTitle = styled.p`
  color: oklch(37.9% 0.146 265.522);
  font-weight: 600;
  font-size: 1.5rem;
  line-height: calc(1.5 / 0.875);
  margin-bottom: 0.5rem;
`

export const BlueDescList = styled.ol`
  color: oklch(48.8% 0.243 264.376);
  font-size: 1.25rem;
  line-height: calc(1.25 / 0.75);
  list-style-type: decimal;
  list-style-position: inside;
`

export const BlueDescItems = styled.li`
  list-style-type: decimal;
  list-style-position: inside;
`

export const GreenDescBox = styled.div`
  padding: 1.6rem;
  background-color: oklch(98.2% 0.018 155.826);
  border-color: oklch(92.5% 0.084 155.995);
  border-style: solid;
  border-width: 1px;
  border-radius: 0.625rem;
  margin-bottom: 1rem;
  display: flex;

  .text-green-600 {
    color: oklch(52.7% 0.154 150.069);
  }

  .margin-right-5 {
    margin-right: 5px;
  }
`

export const GreenDescTitle = styled.p`
  color: oklch(39.3% 0.095 152.535);
  font-weight: 500;
  font-size: 1.6rem;
  line-height: calc(1.4 / 0.75);
`

export const GreenDescItem = styled.p`
  color: oklch(52.7% 0.154 150.069);
  font-size: 1.4rem;
  line-height: calc(1.4 / 0.75);
`

export const GreenDescEmail = styled.strong`
  font-weight: bolder;
  margin-left: 5px;
`
