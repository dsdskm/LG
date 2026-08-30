import { useUserStore } from '@repo/stores'
import { generateUuid36, getTimestampSec } from '@repo/utils'

export const authHeaders = () => {
  const session = useUserStore.getState().session
  const token = session?.accessToken
  return token
    ? { authorization: `Bearer ${token}`, timestamp: getTimestampSec(), 'message-id': generateUuid36() }
    : { timestamp: getTimestampSec(), 'message-id': generateUuid36() }
}

export const shouldForceLogout = (error) => {
  const status = error?.status
  const errCode = error.response?.data?.errorCode
  if (status === 401 && errCode == 'AUTH_40101') {
    const store = useUserStore.getState()
    store.logout()
    window.location.href = '/login?sessionout=Y'
    return true
  }

  return false
}
