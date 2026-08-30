import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { login as requestLogin, getUserInfo } from '@repo/apis'
import { useUserStore } from '@repo/stores'
import {
  USER_ROLE_LEVEL,
  DEFAULT_USER_LEVEL,
  AUTH_ERROR_MESSAGE_KEY,
  DEFAULT_AUTH_ERROR_MESSAGE_KEY
} from '@repo/constants'

/**
 * 로그인 폼 상태 + 인증 처리 공통 훅
 *
 * @param {Object} params
 * @param {string} params.redirectTo - 로그인 성공 후 이동할 경로
 * @param {Object} [params.roleLevelMap] - userRole → userLevel 매핑 (앱별 재정의 가능)
 * @param {string} [params.namespace] - i18n 네임스페이스
 * @param {(userEmail: string, userPassword: string) => Promise<object>} [params.loginFn]
 *        인증 요청 함수. 기본값은 클라우드 auth 서버 직접 호출(@repo/apis 의 login).
 *        init-setup 처럼 브라우저가 클라우드로 나갈 수 없는 앱은 로봇 BE 대행 함수를 주입한다.
 *        반환/에러 형태는 기본값과 같아야 한다(성공: accessToken/refreshToken/userId,
 *        실패: error.response.data.errorCode 를 가진 에러).
 * @param {(userId: string, token: string) => Promise<object>} [params.userInfoFn]
 *        유저 정보 조회 함수. loginFn 의 응답에 userInfo 가 이미 들어 있으면 호출되지 않는다.
 */
export const useLogin = ({
  redirectTo,
  roleLevelMap = USER_ROLE_LEVEL,
  namespace = 'login',
  loginFn = requestLogin,
  userInfoFn = getUserInfo
} = {}) => {
  const { t } = useTranslation(namespace)
  const setUserSession = useUserStore((state) => state.login)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loginResponse, setLoginResponse] = useState(null)

  const [searchParams] = useSearchParams()
  const sessionOut = searchParams.get('sessionout') ?? ''
  const hasSessionOut = Boolean(sessionOut)

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

  useEffect(() => {
    if (!loginResponse?.accessToken) return

    setUserSession({
      email: loginResponse.email,
      accessToken: loginResponse.accessToken,
      refreshToken: loginResponse.refreshToken,
      userId: loginResponse.userId,
      userRole: loginResponse.userRole,
      userLevel: loginResponse.userLevel
    })
    window.location.href = redirectTo
  }, [loginResponse, redirectTo, setUserSession])

  useEffect(() => {
    if (hasSessionOut && sessionOut === 'Y') {
      toast.error(t('logoutForSession'), { autoClose: 2000 })
    }
  }, [hasSessionOut, sessionOut, t])

  const handleLoginError = (resultCode) => {
    setIsLoading(false)
    setErrorMessage(t(AUTH_ERROR_MESSAGE_KEY[resultCode] ?? DEFAULT_AUTH_ERROR_MESSAGE_KEY))
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const response = await loginFn(data.id, data.password)

      if (!response) return

      if (!response.accessToken) {
        handleLoginError(response.data?.resultCode)
        return
      }

      // 응답에 userInfo 키가 있으면 이 조회를 BE 가 대신 한 것이다 — init-setup 은 로봇 BE 가
      // 로그인을 대행하면서 userRole 까지 붙여 준다(브라우저가 로봇 AP 에 붙어 있으면 이 두 번째
      // 클라우드 호출도 직접 못 하기 때문). 키가 있으면 값이 null 이어도 다시 호출하지 않는다 —
      // 그래봐야 BE 가 이미 실패한 경로를 브라우저가 되짚는 것뿐이다.
      const userInfo =
        'userInfo' in response ? response.userInfo : await userInfoFn(response.userId, response.accessToken)

      if (!userInfo) {
        // 조용히 return 하면 isLoading 이 안 풀려 스피너가 계속 돈다.
        handleLoginError()
        return
      }

      setIsLoading(false)
      setLoginResponse({
        ...response,
        email: data.id,
        userRole: userInfo.userRole,
        userLevel: roleLevelMap[userInfo.userRole] ?? DEFAULT_USER_LEVEL
      })
    } catch (error) {
      handleLoginError(error.response?.data?.errorCode)
    }
  }

  return {
    register,
    handleSubmit,
    errors,
    isValid,
    isLoading,
    errorMessage,
    onSubmit
  }
}
