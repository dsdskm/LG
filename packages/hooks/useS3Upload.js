import { useState, useRef } from 'react'
import { uploadMultipartToS3, uploadSingleFileToS3 } from '@repo/utils'

const CHUNK_SIZE = 1024 * 1024 * 10 // 10MB

/**
 * Generic S3 (multipart) upload hook.
 *
 * The hook owns only the transfer mechanics — chunking, multipart vs. single
 * PUT, progress, and abort. Anything domain/backend specific is injected by the
 * caller through adapter callbacks so the hook stays reusable across apps.
 *
 * @param {object} adapters
 * @param {(args: { file: File, chunkCount: number, context: any }) => Promise<{ presignedUrls: string[], uploadId?: string }>} adapters.requestUploadUrl
 *        Requests presigned URLs from the backend and normalises the response.
 * @param {(args: { file: File, chunkCount: number, parts: any[], uploadId?: string, context: any }) => Promise<any>} [adapters.completeUpload]
 *        Notifies the backend that the upload finished (e.g. assemble parts).
 * @param {(args: { uploadId?: string }) => Promise<any>} [adapters.abortUpload]
 *        Notifies the backend that an in-flight upload was cancelled.
 */
export const useS3Upload = ({ requestUploadUrl, completeUpload, abortUpload } = {}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [uploadId, setUploadId] = useState(null)
  const abortControllerRef = useRef(null)

  const uploadFile = async (file, context) => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    setUploadId(null)

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    const chunkCount = Math.ceil(file.size / CHUNK_SIZE)

    try {
      // 1. Ask the app to request presigned URLs and normalise the response.
      const { presignedUrls, uploadId: newUploadId } = await requestUploadUrl({
        file,
        chunkCount,
        context
      })
      setUploadId(newUploadId)

      // 2. Upload to S3 — multipart for large files, single PUT otherwise.
      let parts = []
      if (file.size > CHUNK_SIZE) {
        parts = await uploadMultipartToS3({
          file,
          presignedUrls,
          chunkSize: CHUNK_SIZE,
          signal,
          onProgress: setUploadProgress
        })
      } else {
        await uploadSingleFileToS3({
          file,
          presignedUrl: presignedUrls[0],
          signal,
          onProgress: setUploadProgress
        })
      }

      // 3. Ask the app to finalise the upload (assemble parts, persist, etc.).
      if (completeUpload) {
        return await completeUpload({ file, chunkCount, parts, uploadId: newUploadId, context })
      }
      return { parts, uploadId: newUploadId }
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        console.log('Upload was canceled by user')
        const cancelError = new Error('Upload Canceled')
        cancelError.code = 'UPLOAD_CANCELED'
        return { error: cancelError }
      }
      console.error('S3 upload failed:', err)
      setError(err)
      return { error: err }
    } finally {
      setIsUploading(false)
      setUploadId(null)
    }
  }

  const abort = async () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      if (uploadId && abortUpload) {
        await abortUpload({ uploadId })
      }
    } catch (err) {
      console.error('S3 upload abort failed:', err)
      setError(err)
      throw err
    } finally {
      setIsUploading(false)
      setUploadId(null)
    }
  }

  return {
    uploadFile,
    abort,
    isUploading,
    uploadProgress,
    uploadId,
    error
  }
}

