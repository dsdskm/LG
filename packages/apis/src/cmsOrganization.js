import createClient from './client'
import { ENDPOINTS } from './constants'

const axiosCms = createClient(import.meta.env.VITE_CMS_API_BASE_URL)

const registerOrganization = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.ORGANIZATION.CMS_BASE, data)
    return response
  } catch (error) {
    console.error('Failed to save organization:', error)
    throw error
  }
}

export const organizationCmsApis = {
  registerOrganization
}
