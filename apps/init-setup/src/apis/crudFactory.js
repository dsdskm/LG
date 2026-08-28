import { client } from '@repo/apis'
import { API_BASE } from './index'

// init-setup-be 백엔드 공용 클라이언트.
// - baseURL 은 apis/index.js 가 계산한 API_BASE(현재 페이지 hostname + VITE_BE_PORT,
//   captive portal 모드에서는 상대경로)에 `/api/v1` 을 붙인 값이다.
//   예) 개발: http://localhost:3100/api/v1, 배포: /api/v1 (nginx 프록시)
//   따라서 각 API 는 리소스 경로(`/sites` 등)만 붙인다.
// - 백엔드 응답 봉투는 { success, data, total? } 이며, client 의 응답 인터셉터가
//   response.data(봉투 전체)를 반환한다.
// - 인증 헤더는 붙이지 않는다. init-setup-be 는 API 키 인증을 제거하고 노출 최소화로 대체했다
//   (host 네트워크 + nginx loopback 전용 listen → 외부 직접 호출 차단, FE 가 유일한 진입점).
//   인증을 재도입한다면 BE 의 CORS allowedHeaders 에 해당 헤더를 함께 추가해야 preflight 가 통과한다.
export const axiosApi = client(`${API_BASE}/api/v1`)

// client() 의 요청 인터셉터(세션 accessToken → Authorization 주입)를 제거한다.
// init-setup-be 는 Authorization 을 읽지 않는데, 헤더가 붙으면 요청이 단순 요청이 아니게 되어
// preflight 가 발생하고 BE 의 allowedHeaders(Content-Type 만)에서 막혀 CORS 에러가 된다.
// 응답 인터셉터(응답 봉투 unwrap · 전역 에러 처리)는 그대로 유지해야 하므로 request 만 비운다.
// ※ 나중에 인터셉터를 추가해 헤더를 지우는 방식은 안 된다 — axios 요청 인터셉터는 등록 역순으로
//   실행되므로 client() 에서 먼저 등록된 토큰 주입이 나중에 돌아 헤더를 다시 붙인다.
axiosApi.interceptors.request.clear()

// 헬스체크(GET /api/health)는 버전 접두사가 없어 baseURL 이 달라 별도 인스턴스가 필요하다.
// 여기도 API_BASE 를 붙여야 한다 — 상대경로 '/api' 로 두면 dev 에서 BE(3100) 가 아니라
// vite(5181) 로 가고, vite 에는 /api 프록시가 없어 실패한다.
export const axiosHealthApi = client(`${API_BASE}/api`)
axiosHealthApi.interceptors.request.clear()

/**
 * 표준 CRUD 팩토리. init-setup-be 의 리소스 라우트는 모두 동일한 형태다.
 *   POST   /{resource}          create
 *   GET    /{resource}          list   (?query)
 *   GET    /{resource}/:id      getById
 *   PUT    /{resource}/:id      update
 *   DELETE /{resource}/:id      remove
 * bulk=true 이면 POST /{resource}/bulk (bulkCreate) 를 추가로 제공한다.
 */
export const createCrud = (resource, { bulk = false } = {}) => {
  const crud = {
    /**
     * 리소스 1건 생성.
     * @param {object} data 생성할 필드 (백엔드 스키마에 따름)
     * @returns {Promise<{success: boolean, data: object}>}
     */
    create: (data) => axiosApi.post(`/${resource}`, data),

    /**
     * 리소스 목록 조회.
     * @param {object} [params] 쿼리스트링 (페이징/필터 등, 예: { page, rows })
     * @returns {Promise<{success: boolean, data: object[], total?: number}>}
     */
    list: (params) => axiosApi.get(`/${resource}`, { params }),

    /**
     * 리소스 1건 단건 조회.
     * @param {string|number} id 리소스 식별자
     * @param {object} [params] 추가 쿼리스트링 (하위 리소스 포함 여부 등)
     * @returns {Promise<{success: boolean, data: object}>}
     */
    getById: (id, params) => axiosApi.get(`/${resource}/${id}`, { params }),

    /**
     * 리소스 1건 전체 수정(PUT).
     * @param {string|number} id 리소스 식별자
     * @param {object} data 수정할 필드
     * @returns {Promise<{success: boolean, data: object}>}
     */
    update: (id, data) => axiosApi.put(`/${resource}/${id}`, data),

    /**
     * 리소스 1건 삭제.
     * @param {string|number} id 리소스 식별자
     * @returns {Promise<{success: boolean}>}
     */
    remove: (id) => axiosApi.delete(`/${resource}/${id}`)
  }
  if (bulk) {
    /**
     * 리소스 여러 건 일괄 생성 (POST /{resource}/bulk).
     * @param {object|object[]} data 백엔드 bulk 라우트가 받는 배열 또는 래핑 객체
     * @returns {Promise<{success: boolean, data: object[]}>}
     */
    crud.bulkCreate = (data) => axiosApi.post(`/${resource}/bulk`, data)
  }
  return crud
}
