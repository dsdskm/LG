import createClient from '../client'
import { ENDPOINTS } from '../constants'
import { generateUuid36, getTimestampSec } from '@repo/utils'

const axiosAuth = createClient(import.meta.env.VITE_AUTH_API_BASE_URL)

const commonHeaders = () => {
  return { timestamp: getTimestampSec(), 'message-id': generateUuid36() }
}

export const login = async (userEmail, userPassword) => {
  try {
    const response = await axiosAuth.post(
      ENDPOINTS.AUTH.LOGIN,
      {
        userEmail,
        userPassword
      },
      { headers: commonHeaders() }
    )
    return response
  } catch (error) {
    throw error
  }
}

export const signUpVerificationCode = async (userEmail) => {
  try {
    const response = await axiosAuth.post(
      ENDPOINTS.AUTH.VERIFICATION_CODE,
      {
        userEmail
      },
      { headers: commonHeaders() }
    )
    return response
  } catch (error) {
    throw error
  }
}

export const signUpVerificationCodeVerify = async (userEmail, verificationCode) => {
  try {
    const response = await axiosAuth.post(
      ENDPOINTS.AUTH.VERIFICATION_VERIFY,
      {
        userEmail,
        verificationCode
      },
      { headers: commonHeaders() }
    )
    return response
  } catch (error) {
    throw error
  }
}

export const signUpApply = async (userEmail, userNickname, locationId, verificationToken) => {
  try {
    const response = await axiosAuth.post(
      ENDPOINTS.AUTH.SIGNUP_APPLY,
      {
        userEmail,
        verificationToken,
        userNickname,
        locationId
      },
      { headers: commonHeaders() }
    )
    return response
  } catch (error) {
    throw error
  }
}

export const tempTokensValidate = async (passwordToken) => {
  try {
    const response = await axiosAuth.get(ENDPOINTS.AUTH.TEMPTOKEN_VALIDATE, {
      params: { passwordToken },
      headers: commonHeaders()
    })
    return response
  } catch (error) {
    throw error
  }
}

export const signUpComplete = async (temporaryUserId, userEmail, userPassword) => {
  try {
    const response = await axiosAuth.post(
      ENDPOINTS.AUTH.SIGNUP_COMPLETE,
      {
        temporaryUserId,
        userEmail,
        userPassword
      },
      { headers: commonHeaders() }
    )
    return response
  } catch (error) {
    throw error
  }
}

export const requestPasswordReset = async (userEmail) => {
  try {
    const response = await axiosAuth.post(
      ENDPOINTS.AUTH.RESET_PASSWORD,
      {
        userEmail
      },
      { headers: commonHeaders() }
    )
    return response
  } catch (error) {
    throw error
  }
}

export const resetPasswordComplete = async (passwordToken, userEmail, userPassword) => {
  try {
    const response = await axiosAuth.post(
      ENDPOINTS.AUTH.RESET_PASSWORD_COMPLETE,
      {
        passwordToken,
        userEmail,
        userPassword
      },
      { headers: commonHeaders() }
    )
    return response
  } catch (error) {
    throw error
  }
}

export const getUserInfo = async (userId, token) => {
  let _commonHeaders = commonHeaders()
  _commonHeaders.authorization = `Bearer ${token}`

  try {
    const response = await axiosAuth.get(ENDPOINTS.ROBOT.USERS + '/' + userId, {
      headers: _commonHeaders
    })
    return response
  } catch (error) {
    throw error
  }
}
