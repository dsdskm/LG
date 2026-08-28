import { client } from '@repo/apis'
import { API_DM_BASE } from './index'

const axiosApi = client(`${API_DM_BASE}/api/v1`)

const retrieveSiteScope = async (siteId, params) => {
  return await axiosApi.get(`/web/sites/${siteId}`, { params })
}

export { retrieveSiteScope }
