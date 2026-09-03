import { useTranslation } from 'react-i18next'
import { ClipLoader } from 'react-spinners'
import { useLogin } from '@repo/hooks/useLogin'
import Button from '../../common/Button'
import Input from '../../common/Input'
import Checkbox from '../../common/Checkbox'
import Tabs from '../../common/Tabs'
import Tab from '../../common/Tab'
import LogoLogin from '../../layout/LogoLogin'
import LanguageSelect from '../../layout/LanguageSelect'
import {
  LoginContainer,
  LoginBox,
  LogoWrapper,
  FormGroup,
  ErrorMessage,
  LanguageSelectWrapper,
  ButtonWrapper,
  Footer,
  FieldLabel
} from './styles'

/**
 * 여러 앱이 공유하는 로그인 화면
 *
 * @param {Object} props
 * @param {string} props.redirectTo - 로그인 성공 후 이동할 경로
 * @param {Object} [props.roleLevelMap] - userRole → userLevel 매핑 (앱별 재정의)
 * @param {Array<{id: string, label: string, content: React.ReactNode}>} [props.extraTabs]
 *        로그인 탭 뒤에 붙일 앱 전용 탭 (예: 회원가입, 비밀번호 재설정)
 * @param {string} [props.copyright] - 하단 카피라이트 문구
 * @param {Function} [props.loginFn] - 인증 요청 함수 (미지정 시 클라우드 직접 호출). useLogin 참고.
 * @param {Function} [props.userInfoFn] - 유저 정보 조회 함수. loginFn 과 짝을 맞춰 넘긴다.
 * @param {React.ReactNode} [props.headerActions] - 언어 선택 좌측에 놓을 앱 전용 버튼
 *        (예: init-setup 의 네트워크 설정 바로가기)
 */
const LoginPage = ({
  redirectTo,
  roleLevelMap,
  extraTabs = [],
  copyright = 'Copyright © 2026 LG Electronics. All rights reserved.',
  loginFn,
  userInfoFn,
  headerActions
}) => {
  const { t } = useTranslation('login')
  // loginFn/userInfoFn 은 undefined 면 useLogin 의 기본 인자(클라우드 직접 호출)가 적용되므로
  // 그대로 넘긴다 — 여기서 기본값을 다시 정하면 두 곳에 중복된다.
  const { register, handleSubmit, errors, isValid, isLoading, errorMessage, onSubmit } = useLogin({
    redirectTo,
    roleLevelMap,
    loginFn,
    userInfoFn
  })

  return (
    <LoginContainer>
      <LogoWrapper>
        <LogoLogin disableLink />
      </LogoWrapper>
      <LoginBox>
        <LanguageSelectWrapper>
          {headerActions}
          <LanguageSelect />
        </LanguageSelectWrapper>
        <Tabs defaultActiveId="login">
          <Tab id="login" label={t('loginButton')}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormGroup>
                <FieldLabel className="typographyBody4">{t('email')}</FieldLabel>
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  isError={!!errors.id}
                  message={errors.id?.message}
                  size="md"
                  {...register('id', {
                    required: t('emailRequired'),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: t('emailInvalid')
                    }
                  })}
                />
              </FormGroup>

              <FormGroup>
                <FieldLabel className="typographyBody4">{t('password')}</FieldLabel>
                <Input
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  isError={!!errors.password}
                  message={errors.password?.message}
                  size="md"
                  {...register('password', { required: t('passwordRequired') })}
                />
              </FormGroup>

              <FormGroup>
                <Checkbox label={t('saveId')} {...register('saveId')} defaultChecked />
              </FormGroup>

              {errorMessage && <ErrorMessage className="typographyBody6">{errorMessage}</ErrorMessage>}

              <ButtonWrapper>
                <Button type="submit" size="lg" disabled={isLoading || !isValid} style={{ width: '100%' }}>
                  {isLoading ? <ClipLoader color={'#ffffff'} loading={isLoading} size={20} /> : t('loginButton')}
                </Button>
              </ButtonWrapper>
            </form>
          </Tab>
          {extraTabs.map(({ id, label, content }) => (
            <Tab key={id} id={id} label={label}>
              {content}
            </Tab>
          ))}
        </Tabs>
      </LoginBox>
      <Footer>
        <p className="typographyBody6">{copyright}</p>
      </Footer>
    </LoginContainer>
  )
}

export default LoginPage
