import { client } from '@repo/apis'
import { ENDPOINTS } from './apiConstants'
import { useMutation } from '@tanstack/react-query'
import { DownloadContentUrlRequest } from '@/types/api/content'

const axiosClient = client(import.meta.env.VITE_API_CMS_BASE_URL)
const path = ENDPOINTS.CMS.FILE

async function getDownloadContentUrl(params: DownloadContentUrlRequest) {
  console.log('getDownloadContentUrl parms', params)
  const response = await axiosClient.post(path, params)
  return response
}

export function useDownloadContentUrl() {
  return useMutation({
    mutationFn: (params: DownloadContentUrlRequest) => getDownloadContentUrl(params)
  })
}
