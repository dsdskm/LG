import { toast } from 'react-toastify'

/**
 * 버튼 정책: 항상 활성화 + 불가 시 사유 토스트.
 * 전제조건을 rules 로 기술하고, 첫 번째 차단 규칙의 message 를 토스트로 안내한 뒤 handler 실행을 막는다.
 * (in-flight 중복 제출 방지는 별도로 버튼 disabled 로 유지)
 *
 * @param {Function} handler 실제 동작
 * @param {Array<{when: boolean, message?: string}>} rules when=true 면 차단
 * @returns {(...args) => any} 가드된 클릭 핸들러
 */
export const guardAction =
  (handler, rules = []) =>
  (...args) => {
    const blocked = rules.find((r) => r && r.when)
    if (blocked) {
      if (blocked.message) toast.error(blocked.message, { autoClose: 2000 })
      return
    }
    return handler?.(...args)
  }
