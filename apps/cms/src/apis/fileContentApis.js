import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getFileContents = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.FILE_CONTENT, { params })
    return response
  } catch (error) {
    console.error('Failed to get file contents:', error)
    throw error
  }
}

const getFileContentDetail = async (id) => {
  try {
    const response = await axiosCms.get(`${ENDPOINTS.FILE_CONTENT}/${id}`)
    return response
  } catch (error) {
    console.error('Failed to get file content detail:', error)
    throw error
  }
}

const createFileContent = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.FILE_CONTENT, data)
    return response
  } catch (error) {
    console.error('Failed to create file content:', error)
    throw error
  }
}

const updateFileContent = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.FILE_CONTENT, data)
    return response
  } catch (error) {
    console.error('Failed to update file content:', error)
    throw error
  }
}

const deleteFileContent = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.FILE_CONTENT, { data })
    return response
  } catch (error) {
    console.error('Failed to delete file content:', error)
    throw error
  }
}

const requestUploadUrlById = async (data) => {
  try {
    const response = await axiosCms.post(`${ENDPOINTS.FILE_CONTENT}/request-upload-url-id`, data)
    return response
  } catch (error) {
    console.error('Failed to request upload url by id:', error)
    throw error
  }
}

const requestDownloadUrlById = async (data) => {
  try {
    const response = await axiosCms.post(`${ENDPOINTS.FILE_CONTENT}/request-download-url-id`, data)
    return response
  } catch (error) {
    console.error('Failed to request download url by id:', error)
    throw error
  }
}

const completeUpload = async (data) => {
  try {
    const response = await axiosCms.post(`${ENDPOINTS.FILE_CONTENT}/complete-upload`, data)
    return response
  } catch (error) {
    console.error('Failed to complete upload:', error)
    throw error
  }
}

export {
  getFileContents,
  getFileContentDetail,
  createFileContent,
  updateFileContent,
  deleteFileContent,
  requestUploadUrlById,
  requestDownloadUrlById,
  completeUpload
}
