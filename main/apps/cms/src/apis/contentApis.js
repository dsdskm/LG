import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const mockupData = false

const getContents = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.CONTENT, { params })
    return response
  } catch (error) {
    console.error('Failed to get contents:', error)
    throw error
  }
}

const CONTENT_LIST_MOCKUP_DATA = {
  results: Array.from({ length: 10 }, (_, index) => {
    const num = index + 1
    return {
      id: `content-${num}`,
      displayName: `Content ${num}`,
      memo: `memo ${num}`,
      createdAt: `2026-06-${String((index % 28) + 1).padStart(2, '0')}T09:00:00.000Z`,
      PackageType: { id: `package-type-${num}`, displayName: ['Face', 'TTS', 'Sound Effect', 'Motion'][index % 4] },
      Organization: { id: `org-${(index % 3) + 1}`, displayName: `Organization ${(index % 3) + 1}` },
      Service: { id: `service-${(index % 2) + 1}`, displayName: `Service ${(index % 2) + 1}` },
      category1: {
        categoryCode: `cat1-${(index % 3) + 1}`,
        displayName: {
          default: `Category1-${(index % 3) + 1}`,
          'ko-KR': `카테고리1-${(index % 3) + 1}`,
          'en-US': `Category1-${(index % 3) + 1}`
        }
      },
      category2: {
        categoryCode: `cat2-${(index % 3) + 1}`,
        displayName: {
          default: `Category2-${(index % 3) + 1}`,
          'ko-KR': `카테고리2-${(index % 3) + 1}`,
          'en-US': `Category2-${(index % 3) + 1}`
        }
      },
      Labels: [{ id: `label-${num}`, displayName: `Label ${num}`, reserved: index % 2 === 0 }]
    }
  })
}

// eslint-disable-next-line no-unused-vars
const getContentList = async (params) => {
  if (mockupData) {
    return CONTENT_LIST_MOCKUP_DATA
  }

  try {
    const response = await axiosCms.get(ENDPOINTS.CONTENT_LIST, { params })
    return response
  } catch (error) {
    console.error('Failed to get content list:', error)
    throw error
  }
}

const getContentDetail = async (id) => {
  try {
    const response = await axiosCms.get(`${ENDPOINTS.CONTENT}/${id}`)
    return response
  } catch (error) {
    console.error('Failed to get content detail:', error)
    throw error
  }
}

const createContent = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.CONTENT, data)
    return response
  } catch (error) {
    console.error('Failed to create content:', error)
    throw error
  }
}

const createContentDetail = async (data) => {
  try {
    const response = await axiosCms.post(`${ENDPOINTS.CONTENT}/detail`, data)
    return response
  } catch (error) {
    console.error('Failed to create content detail:', error)
    throw error
  }
}

const updateContent = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.CONTENT, data)
    return response
  } catch (error) {
    console.error('Failed to update content:', error)
    throw error
  }
}

const updateContentDetail = async (data) => {
  try {
    const response = await axiosCms.put(`${ENDPOINTS.CONTENT}/detail`, data)
    return response
  } catch (error) {
    console.error('Failed to update content detail:', error)
    throw error
  }
}

const deleteContent = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.CONTENT, { data })
    return response
  } catch (error) {
    console.error('Failed to delete content:', error)
    throw error
  }
}

const increaseContentRef = async (id, data) => {
  try {
    const response = await axiosCms.post(`${ENDPOINTS.CONTENT}/${id}/ref/increase`, data)
    return response
  } catch (error) {
    console.error('Failed to increase content ref:', error)
    throw error
  }
}

const decreaseContentRef = async (id, data) => {
  try {
    const response = await axiosCms.post(`${ENDPOINTS.CONTENT}/${id}/ref/decrease`, data)
    return response
  } catch (error) {
    console.error('Failed to decrease content ref:', error)
    throw error
  }
}

export {
  getContents,
  getContentList,
  getContentDetail,
  createContent,
  createContentDetail,
  updateContent,
  updateContentDetail,
  deleteContent,
  increaseContentRef,
  decreaseContentRef
}
