import axios from 'axios'
import { useUserStore, useErrorStore } from '@repo/stores'
import { API_CONFIG, ENDPOINTS } from './constants'
import { generateUuid36, getTimestampSec } from '@repo/utils'

// Create base instance
const createClient = (baseURL, options = {}) => {
  const instance = axios.create({
    baseURL: baseURL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  // Request Interceptor: Inject Token
  instance.interceptors.request.use(
    (config) => {
      const token = useUserStore.getState().session?.accessToken
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response Interceptor: Standardized Error Handling
  instance.interceptors.response.use(
    (response) => {
      return response.data
    },
    (error) => {
      const { response, config } = error
      const isRefreshable = (accessToken, refreshToken, userId) => {
        return !!(accessToken && refreshToken && userId)
      }
      if (response) {
        switch (response.status) {
          case 400:
            error.message = 'error.badRequest'
            break
          case 401:
            const { accessToken, refreshToken, userId } = useUserStore.getState().session || {}
            if (isRefreshable(accessToken, refreshToken, userId)) {
              config.skipErrorPopup = true // Prevents error popup during token refresh
              return (async () => {
                try {
                  const newInstance = axios.create({
                    baseURL: import.meta.env.VITE_AUTH_API_BASE_URL,
                    timeout: API_CONFIG.TIMEOUT,
                    headers: {
                      'Content-Type': 'application/json',
                      timestamp: getTimestampSec(),
                      'message-id': generateUuid36(),
                      Authorization: `Bearer ${accessToken}`
                    },
                    ...options
                  })
                  const response = await newInstance.post(ENDPOINTS.AUTH.TOKEN_REFRESH, { userId, refreshToken })
                  if (response.status === 200 && response.data.accessToken) {
                    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data
                    useUserStore.getState().updateTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken })

                    // 업데이트 이후 헤더를 다시 설정하고, 인스턴스를 호출
                    config.headers.Authorization = `Bearer ${newAccessToken}`
                    delete config.skipErrorPopup
                    return instance(config)
                  }
                  throw new Error('Token refresh response invalid')
                } catch (e) {
                  error.message = 'error.unauthorized'
                  config.skipErrorPopup = false
                  config.onModalClose = () => {
                    window.location.href = '/login'
                  }
                  useUserStore.getState().logout()
                  console.error('Token refresh failed - Redirecting to login...')
                  useErrorStore.getState().setError(error, config.onModalClose)
                  return Promise.reject(error)
                }
              })()
            } else {
              error.message = 'error.unauthorized'
              config.onModalClose = () => {
                window.location.href = '/login'
              }
              useUserStore.getState().logout()
              console.error('Unauthorized - Redirecting to login...')
            }
            break
          case 403:
            error.message = 'error.forbidden'
            console.error('Forbidden - Access denied')
            break
          case 404:
            error.message = 'error.notFound'
            console.error('Not Found')
            break
          case 422:
            error.message = 'error.unprocessableEntity'
            console.error('Unprocessable Entity')
            break
          case 500:
            error.message = 'error.internalServerError'
            console.error('Internal Server Error')
            break
          default:
            error.message = 'error.unexpected'
            console.error('An unexpected error occurred', response.data)
        }
      } else if (error.request) {
        error.message = 'error.networkError'
        console.error('Network Error / Timeout')
      } else {
        error.message = 'error.unexpected'
        console.error('An unexpected error occurred', error)
      }

      // Global error handling via store
      if (!config?.skipErrorPopup) {
        useErrorStore.getState().setError(error, config?.onModalClose)
      }

      return Promise.reject(error)
    }
  )

  return instance
}

export default createClient
