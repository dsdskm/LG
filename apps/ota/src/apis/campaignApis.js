import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

const retrieveCampaign = async (orgIds, id = null, page = null) => {
  try {
    const data = { orgIds: orgIds }
    if (id) data.id = String(id)
    if (page !== null) data.page = Number(page)
    const response = await axiosOta.post(ENDPOINTS.CAMPAIGN.BASE, data)
    return response
  } catch (error) {
    console.error('Failed to retrieve deployments:', error)
    throw error
  }
}

const retrieveCampaignDeviceList = async (id, thingNameList = [], jobExecutionStatus = null) => {
  try {
    const params = { id }
    if (thingNameList) params.thingNameList = thingNameList
    if (jobExecutionStatus) params.status = jobExecutionStatus
    const response = await axiosOta.get(`${ENDPOINTS.CAMPAIGN.DEVICE_LIST}`, { params })
    return response
  } catch (error) {
    console.error('Failed to retrieve deployments:', error)
    throw error
  }
}

const saveCampaign = async (data) => {
  try {
    const response = await axiosOta.put(ENDPOINTS.CAMPAIGN.BASE, data)
    return response
  } catch (error) {
    console.error('Failed to create deployment:', error)
    throw error
  }
}

const requestCampaign = async (data) => {
  try {
    const response = await axiosOta.post(`${ENDPOINTS.CAMPAIGN.REQUEST}`, data)
    return response
  } catch (error) {
    console.error(`Failed to request deployment (${data.campaignId}):`, error)
    throw error
  }
}

const abortDeployment = async (data) => {
  try {
    const response = await axiosOta.post(`${ENDPOINTS.CAMPAIGN.ABORT}`, data)
    return response
  } catch (error) {
    console.error(`Failed to abort deployment (${data.id}):`, error)
    throw error
  }
}

const rollbackDeployment = async (data) => {
  try {
    const response = await axiosOta.post(`${ENDPOINTS.CAMPAIGN.ROLLBACK}`, data)
    return response
  } catch (error) {
    console.error(`Failed to rollback deployment (${data.id}):`, error)
    throw error
  }
}

export {
  retrieveCampaign,
  retrieveCampaignDeviceList,
  saveCampaign,
  requestCampaign,
  rollbackDeployment,
  abortDeployment
}
