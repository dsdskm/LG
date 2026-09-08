/**
 * 비밀번호 유효성 검사
 * 규칙: 영문 대/소, 숫자, 특수문자 중 3가지 조합으로 8자 이상 또는 2가지 조합으로 10자 이상
 * @param {string} password - 검사할 비밀번호
 * @returns {object} { isValid: boolean, reason?: string }
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, reason: 'empty' }
  }

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  const combinationCount = [hasUpperCase, hasLowerCase, hasDigit, hasSpecialChar].filter(Boolean).length
  const length = password.length

  if (combinationCount === 3 && length >= 8) {
    return { isValid: true }
  }

  if (combinationCount === 2 && length >= 10) {
    return { isValid: true }
  }

  if (combinationCount >= 4 && length >= 8) {
    return { isValid: true }
  }

  return { isValid: false, reason: 'invalid' }
}

/**
 * 비밀번호 강도 정보 반환
 * @param {string} password - 검사할 비밀번호
 * @returns {object} 비밀번호 유효성, 조합 정보, 길이 정보
 */
export const getPasswordStrengthInfo = (password) => {
  if (!password) {
    return {
      isValid: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasDigit: false,
      hasSpecialChar: false,
      combinationCount: 0,
      length: 0,
      minLength: 0,
      reason: 'empty'
    }
  }

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  const combinationCount = [hasUpperCase, hasLowerCase, hasDigit, hasSpecialChar].filter(Boolean).length
  const length = password.length

  let isValid = false
  let minLength = 0

  if (combinationCount === 3) {
    isValid = length >= 8
    minLength = 8
  } else if (combinationCount === 2) {
    isValid = length >= 10
    minLength = 10
  } else if (combinationCount >= 4) {
    isValid = length >= 8
    minLength = 8
  }

  return {
    isValid,
    hasUpperCase,
    hasLowerCase,
    hasDigit,
    hasSpecialChar,
    combinationCount,
    length,
    minLength,
    reason: isValid ? 'valid' : 'invalid'
  }
}
