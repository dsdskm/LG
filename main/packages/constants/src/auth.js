// 사용자 권한(userRole) → 권한 레벨(userLevel) 매핑
// 앱별로 취급하지 않는 권한이 있는 경우(예: init-setup의 TERM_MANAGER)
// 이 맵에서 해당 키를 제외한 맵을 useLogin/LoginPage에 전달한다.
export const USER_ROLE_LEVEL = {
  SITE_MANAGER: 0,
  GROUP_MANAGER: 1,
  SYSTEM_MANAGER: 2,
  SYSTEM_ADMIN: 3,
  TERM_MANAGER: 4
}

export const DEFAULT_USER_LEVEL = 0

// 로그인 실패 응답 코드 → login 네임스페이스 i18n 키
export const AUTH_ERROR_MESSAGE_KEY = {
  AUTH_40104: 'loginError',
  '0114': 'accountLocked',
  USER_40401: 'loginError'
}

export const DEFAULT_AUTH_ERROR_MESSAGE_KEY = 'unknownError'
