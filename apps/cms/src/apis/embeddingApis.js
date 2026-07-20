import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getEmbeddingDocuments = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.EMBEDDING_DOCUMENT, { params })
    return response
  } catch (error) {
    console.error('Failed to get embedding documents:', error)
    throw error
  }
}

const createEmbeddingDocument = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.EMBEDDING_DOCUMENT, data)
    return response
  } catch (error) {
    console.error('Failed to create embedding document:', error)
    throw error
  }
}

const updateEmbeddingDocument = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.EMBEDDING_DOCUMENT, data)
    return response
  } catch (error) {
    console.error('Failed to update embedding document:', error)
    throw error
  }
}

const deleteEmbeddingDocument = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.EMBEDDING_DOCUMENT, { data })
    return response
  } catch (error) {
    console.error('Failed to delete embedding document:', error)
    throw error
  }
}

export { getEmbeddingDocuments, createEmbeddingDocument, updateEmbeddingDocument, deleteEmbeddingDocument }
