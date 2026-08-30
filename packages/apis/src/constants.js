export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_AUTH_API_BASE_URL,
  PREFIX_AUTH: '/api/v1/auth',
  PREFIX_INVITATION: '/api/v1/web/invitations',
  PREFIX_OTA: '/v1/ota/web',
  PREFIX_CMS: '/v1/cms/web',
  PREFIX_TMS: '/api/v1/web',
  PREFIX_ROBOT: '/api/v1/web',
  PREFIX_AI_EVENTS: '/events',
  PREFIX_AI_ANALYSIS: '/analysis',
  PREFIX_AI_CONFIG: '/config',
  PREFIX_AI_ACTIONS: '/actions',
  PREFIX_AI_REPORTS: '/reports',
  TIMEOUT: 10000
}

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_CONFIG.PREFIX_AUTH}/login`,
    RESET_PASSWORD: `${API_CONFIG.PREFIX_AUTH}/password-reset/request`,
    RESET_PASSWORD_COMPLETE: `${API_CONFIG.PREFIX_AUTH}/password-reset/complete`,
    VERIFICATION_CODE: `${API_CONFIG.PREFIX_AUTH}/signup/verification-codes`,
    VERIFICATION_VERIFY: `${API_CONFIG.PREFIX_AUTH}/signup/verification-codes/verify`,
    SIGNUP_APPLY: `${API_CONFIG.PREFIX_AUTH}/signup/apply`,
    TEMPTOKEN_VALIDATE: `${API_CONFIG.PREFIX_AUTH}/signup/temporary-tokens/validate`,
    SIGNUP_COMPLETE: `${API_CONFIG.PREFIX_AUTH}/signup/complete`,
    TOKEN_REFRESH: `${API_CONFIG.PREFIX_AUTH}/token/refresh`,
    LOGOUT: `${API_CONFIG.PREFIX_AUTH}/logout`
  },
  INVITATION: {
    TOKEN_VALIDATE: `${API_CONFIG.PREFIX_INVITATION}/invitation-tokens/validate`,
    ACCEPT: `${API_CONFIG.PREFIX_INVITATION}/accept`
  },
  ROBOT: {
    DEVICES: `${API_CONFIG.PREFIX_ROBOT}/devices`,
    FILES: `${API_CONFIG.PREFIX_ROBOT}/files`,
    USERS: `${API_CONFIG.PREFIX_ROBOT}/users`,
    GROUPS: `${API_CONFIG.PREFIX_ROBOT}/groups`,
    SITES: `${API_CONFIG.PREFIX_ROBOT}/sites`
  },
  ORGANIZATION: {
    BASE: `${API_CONFIG.PREFIX_OTA}/organization`,
    CMS_BASE: `${API_CONFIG.PREFIX_CMS}/organization`,
    TREE: `${API_CONFIG.PREFIX_OTA}/organization/tree`,
    USER_DETAIL: `${API_CONFIG.PREFIX_OTA}/organization/user/detail`,
    JOIN: `${API_CONFIG.PREFIX_OTA}/organization/join`,
    WITHDRAW: `${API_CONFIG.PREFIX_OTA}/organization/withdraw`,
    APPROVE: `${API_CONFIG.PREFIX_OTA}/organization/approve`,
    REQUEST: `${API_CONFIG.PREFIX_OTA}/organization/request`,
    CHANGE_ROLE: `${API_CONFIG.PREFIX_OTA}/organization/changeRole`
  },
  COMPANY: `${API_CONFIG.PREFIX_OTA}/company`,
  ARTIFACT: `${API_CONFIG.PREFIX_OTA}/artifact`
}

export const GETSIZE = '100'
