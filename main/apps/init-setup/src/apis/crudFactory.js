import { client } from '@repo/apis'

// init-setup-be 백엔드 공용 클라이언트.
// - baseURL 은 이미 `/api/v1` 를 포함한다 (.env 의 VITE_API_BASE_URL).
//   예) 개발: http://localhost:8081/api/v1, 배포: /api/v1 (nginx 프록시)
//   따라서 각 API 는 리소스 경로(`/sites` 등)만 붙인다.
// - 백엔드 응답 봉투는 { success, data, total? } 이며, client 의 응답 인터셉터가
//   response.data(봉투 전체)를 반환한다.
export const axiosApi = client(import.meta.env.VITE_API_BASE_URL)

// 운영 환경에서 /api/v1 전 경로는 X-API-Key 인증이 필요하다.
// VITE_API_KEY 가 설정된 경우에만 헤더를 실어 보낸다(미설정 시 백엔드가 인증 생략).
const apiKey = import.meta.env.VITE_API_KEY
export const authConfig = apiKey ? { headers: { 'X-API-Key': apiKey } } : {}

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
    create: (data) => axiosApi.post(`/${resource}`, data, authConfig),
    list: (params) => axiosApi.get(`/${resource}`, { params, ...authConfig }),
    getById: (id, params) => axiosApi.get(`/${resource}/${id}`, { params, ...authConfig }),
    update: (id, data) => axiosApi.put(`/${resource}/${id}`, data, authConfig),
    remove: (id) => axiosApi.delete(`/${resource}/${id}`, authConfig)
  }
  if (bulk) {
    crud.bulkCreate = (data) => axiosApi.post(`/${resource}/bulk`, data, authConfig)
  }
  return crud
}
