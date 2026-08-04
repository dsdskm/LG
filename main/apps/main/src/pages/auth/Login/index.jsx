import { useEffect, useState } from 'react'
import { login, getUserInfo } from '@repo/apis'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button, Input, LogoLogin, LanguageSelect, Checkbox } from '@repo/ui'
import { ClipLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useModalState } from '@repo/hooks'
import { useUserStore } from '@repo/stores'
import { useSearchParams } from 'react-router-dom'
import SignUp from './tabs/SignUp'
import ResetPassword from './tabs/ResetPassword'
import {
  LoginContainer,
  LoginBox,
  LogoWrapper,
  FormGroup,
  ErrorMessage,
  LanguageSelectWrapper,
  ButtonWrapper,
  Footer
} from './styles'
import { Tabs, Tab } from '@repo/ui'

function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { t } = useTranslation('login')
  const [loginResponse, setLoginResponse] = useState(null)
  const { setLoggedIn, isLoggedIn } = useUserStore.getState()

  const [searchParams] = useSearchParams()
  const sessionOut = searchParams.get('sessionout') ?? ''
  const hasSessionOut = Boolean(sessionOut)

  const setSessionData = async (response) => {
    if (response?.accessToken) {
      useUserStore.getState().login({
        email: response.email,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        userId: response.userId,
        userRole: response.userRole,
        userLevel: response.userLevel
      })
    }
  }

  useEffect(() => {
    if (loginResponse) {
      console.log(loginResponse)
      console.log('isLoggedIn=' + isLoggedIn)
      setSessionData(loginResponse)
      window.location.href = '/robot/dashboard'
    }

    if (hasSessionOut && sessionOut == 'Y') {
      toast.error(t('logoutForSession'), { autoClose: 2000 })
    }
  }, [loginResponse, hasSessionOut])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm({
    mode: 'onChange', // 입력 변경 시마다 검증
    reValidateMode: 'onChange',
    defaultValues: {
      id: '',
      password: '',
      saveId: true
    }
  })

  function getUserLevel(userRole) {
    let returnLevel = 0
    switch (userRole) {
      case 'SYSTEM_ADMIN':
        returnLevel = 3
        break
      case 'SYSTEM_MANAGER':
        returnLevel = 2
        break
      case 'GROUP_MANAGER':
        returnLevel = 1
        break
      case 'SITE_MANAGER':
        returnLevel = 0
        break
      case 'TERM_MANAGER':
        returnLevel = 4
        break
    }
    return returnLevel
  }

  const handleLoginSuccess = (data, data2) => {
    setLoggedIn(true)
    setIsLoading(false)
    let _data = data
    _data.userRole = data2.userRole
    _data.userLevel = getUserLevel(data2.userRole)
    setLoginResponse(_data)
  }

  const handleLoginError = (resultCode) => {
    setIsLoading(false)

    switch (resultCode) {
      case 'AUTH_40104':
        setErrorMessage(t('loginError'))
        break
      case '0114':
        setErrorMessage(t('accountLocked'))
        break
      case 'USER_40401':
        //setErrorMessage(t('userNotFound'))
        setErrorMessage(t('loginError'))
        break
      default:
        setErrorMessage(t('unknownError'))
        break
    }
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const response = await login(data.id, data.password)

      if (response) {
        if (response.accessToken) {
          response.email = data.id
          const response2 = await getUserInfo(response.userId, response.accessToken)

          if (response2) {
            handleLoginSuccess(response, response2)
          }
        } else {
          handleLoginError(response.data?.resultCode)
          return
        }
      }
    } catch (error) {
      handleLoginError(error.response?.data?.errorCode)
    }
  }

  return (
    <LoginContainer>
      <LogoWrapper>
        <LogoLogin disableLink />
      </LogoWrapper>
      <LoginBox>
        <LanguageSelectWrapper>
          <LanguageSelect />
        </LanguageSelectWrapper>
        <Tabs defaultActiveId="login">
          <Tab id="login" label={t('loginButton')}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormGroup>
                <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '0.7rem' }}>
                  {t('email')}
                </p>
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
                <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '0.7rem' }}>
                  {t('password')}
                </p>
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
          <Tab id="signUp" label={t('signUp')}>
            <SignUp t={t} />
          </Tab>
          <Tab id="resetPw" label={t('resetPassword')}>
            <ResetPassword t={t} />
          </Tab>
        </Tabs>
      </LoginBox>
      <Footer>
        <p className="typographyButton5">Copyright © 2026 LG Electronics. All rights reserved.</p>
      </Footer>
    </LoginContainer>
  )
}

export default Login
