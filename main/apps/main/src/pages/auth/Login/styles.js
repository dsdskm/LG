import styled from 'styled-components'

export const LoginContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--color-secondary-10);
  background: linear-gradient(136deg, #80c3e2 0%, #95c2dc 95.46%);
  overflow-y: auto;
`

export const LoginBox = styled.div`
  width: 100%;
  max-width: 55rem;
  padding: 4.8rem 4rem;
  background: var(--color-neutral-10);
  border-radius: 1.6rem;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
`

export const LogoWrapper = styled.div`
  align-items: center;
  flex-direction: column;
  display: flex;
  margin-bottom: 3em;
  font-size: initial !important;

  .logo-root svg text {
    font-size: 42px !important; /* 필요시 !important로 전역 규칙을 이김 */
  }

  .logo-root svg text[data-part='tm'] {
    font-size: 12px !important;
  }
`

export const Title = styled.h2`
  margin-bottom: 4rem;
  color: var(--color-neutral-80);
`

export const FormGroup = styled.div`
  margin-bottom: 1.6rem;
`

export const ErrorMessage = styled.p`
  color: var(--color-error-70);
  margin: 0.8rem 0 2rem;
  font-weight: 500;
`

export const LanguageSelectWrapper = styled.div`
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 0.8rem;
`

export const ButtonWrapper = styled.div`
  margin-top: 3.2rem;
  display: flex;
  gap: 1.6rem;
`

export const Footer = styled.div`
  position: absolute;
  bottom: 2.4rem;
  right: 2.4rem;
  color: var(--color-neutral-80);
`

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
