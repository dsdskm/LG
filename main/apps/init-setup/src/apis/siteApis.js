import { axiosApi, createCrud } from './crudFactory'

// 사이트 (Site 1:N Map) (init-setup-be: /api/v1/sites)
export const { create, list, getById, update, remove } = createCrud('sites')

export const retrieveSiteScope = async (body) => {
  return await axiosApi.post(`/sites/site-scope`, body)
}