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
 */
export const useLogin = ({ redirectTo, roleLevelMap = USER_ROLE_LEVEL, namespace = 'login' } = {}) => {
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
      const response = await requestLogin(data.id, data.password)

      if (!response) return

      if (!response.accessToken) {
        handleLoginError(response.data?.resultCode)
        return
      }

      const userInfo = await getUserInfo(response.userId, response.accessToken)
      if (!userInfo) return

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
