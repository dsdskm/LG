import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)
const axiosTTS = client(import.meta.env.VITE_API_BASE_URL, 30000)

const getGoogleVoices = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.GOOGLE_VOICE, { params })
    return response
  } catch (error) {
    console.error('Failed to get google voices:', error)
    throw error
  }
}

const synthesizeTts = async (data) => {
  try {
    const response = await axiosTTS.post(`${ENDPOINTS.GOOGLE_VOICE}/synthesize`, data)
    return response
  } catch (error) {
    console.error('Failed to synthesize tts:', error)
    throw error
  }
}

const createGoogleVoice = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.GOOGLE_VOICE, data)
    return response
  } catch (error) {
    console.error('Failed to create google voice:', error)
    throw error
  }
}

const updateGoogleVoice = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.GOOGLE_VOICE, data)
    return response
  } catch (error) {
    console.error('Failed to update google voice:', error)
    throw error
  }
}

const deleteGoogleVoice = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.GOOGLE_VOICE, { data })
    return response
  } catch (error) {
    console.error('Failed to delete google voice:', error)
    throw error
  }
}

export { getGoogleVoices, synthesizeTts, createGoogleVoice, updateGoogleVoice, deleteGoogleVoice }
