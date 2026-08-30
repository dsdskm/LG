import { client } from '@repo/apis'
import { ENDPOINTS } from '@/apis/constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

const retrieveModules = async (companyId, id = null, use = 'false') => {
  try {
    const data = { companyId, moduleUse: use }

    if (id) data.id = String(id)
    const response = await axiosOta.post(ENDPOINTS.MODULE.BASE, data)
    return response
  } catch (error) {
    console.error('Failed to retrieve modules:', error)
    throw error
  }
}

const requestActivateCi = async (id, activate, companyId, groupId, siteId, moduleId, mode) => {
  try {
    const response = await axiosOta.put(ENDPOINTS.MODULE.ACTIVATE_CI, {
      id, // cici id
      activate,
      companyId,
      groupId,
      siteId,
      moduleId,
      mode
    })
    return response
  } catch (error) {
    console.error('Failed to retrieve device type:', error)
    throw error
  }
}

const saveModule = async (data) => {
  try {
    const response = await axiosOta.put(ENDPOINTS.MODULE.BASE, data)
    return response
  } catch (error) {
    console.error('Failed to save module:', error)
    throw error
  }
}

const requestInfoActivateCi = async (moduleId, deviceIds, activate) => {
  try {
    const response = await axiosOta.post(ENDPOINTS.MODULE.INFO_ACTIVATE_CI, {
      moduleId,
      deviceIds,
      activate
    })
    return response
  } catch (error) {
    console.error('Failed to request activate CI:', error)
    throw error
  }
}

const retrieveDeployStrategy = async (companyId) => {
  try {
    const params = { companyId }
    const response = await axiosOta.get(ENDPOINTS.DEPLOY_STRATEGY, { params })
    return response
  } catch (error) {
    console.error('Failed to retrieve deploy strategy:', error)
    throw error
  }
}

const fetchCiTemplate = async (params) => {
  try {
    const response = await axiosOta.get(ENDPOINTS.MODULE.CI_TEMPLATE, {
      params
    })
    return response
  } catch (error) {
    console.error('Failed to download template:', error)
    throw error
  }
}

export {
  retrieveModules,
  requestActivateCi,
  saveModule,
  requestInfoActivateCi,
  retrieveDeployStrategy,
  fetchCiTemplate
}
