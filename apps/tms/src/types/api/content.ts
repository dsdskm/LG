export interface DownloadContentUrlRequest {
  fileContentId: number
}

export interface DownloadContentUrlResponse {
  error: boolean
  code: string
  message: string
  results: string
}
