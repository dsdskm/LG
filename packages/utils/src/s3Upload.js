import axios from 'axios'

/**
 * Uploads a file to S3 using multipart presigned URLs.
 *
 * @param {Object} options
 * @param {File} options.file The file to upload.
 * @param {Array<string>} options.presignedUrls Array of presigned URLs for each part.
 * @param {number} options.chunkSize The size of each chunk in bytes.
 * @param {Function} [options.onProgress] Callback function receiving the upload progress percentage (0-100).
 * @param {AbortSignal} [options.signal] AbortSignal to cancel the upload.
 * @returns {Promise<Array<{ETag: string, PartNumber: number}>>} Resolves with an array of uploaded parts information.
 */
export const uploadMultipartToS3 = async ({ file, presignedUrls, chunkSize, onProgress, signal }) => {
  const parts = []
  let uploadedBytes = 0
  const totalBytes = file.size

  if (!Array.isArray(presignedUrls) || presignedUrls.length === 0) {
    throw new Error('presignedUrls must be a non-empty array of URLs for multipart upload.')
  }

  for (let i = 0; i < presignedUrls.length; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, totalBytes)
    const chunk = file.slice(start, end)
    const url = presignedUrls[i]

    let response
    try {
      // We use a clean axios request here to avoid custom headers.
      response = await axios.put(url, chunk, {
        headers: { 'Content-Type': file.type },
        signal
      })
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('S3 upload part canceled')
        throw error
      }
      // axios throws for non-2xx responses or network errors.
      console.error('S3 upload error:', error)
      throw new Error(`Error occurred while uploading part ${i + 1}. Please verify S3 CORS settings.`)
    }

    // S3 returns the ETag in the response headers enclosed in double quotes.
    const eTag = response.headers['etag']

    parts.push({
      ETag: eTag ? eTag.replace(/"/g, '') : '',
      PartNumber: i + 1
    })

    uploadedBytes += chunk.size

    if (onProgress) {
      const percentage = Math.round((uploadedBytes / totalBytes) * 100)
      onProgress(percentage)
    }
  }

  return parts
}

export const uploadSingleFileToS3 = async ({ file, presignedUrl, onProgress, signal }) => {
  let uploadedBytes = 0
  const totalBytes = file.size

  if (!presignedUrl) {
    throw new Error('presignedUrl must be a non-empty string.')
  }

  let response
  try {
    // We use a clean axios request here to avoid custom headers.
    response = await axios.put(presignedUrl, file, {
      headers: { 'Content-Type': file.type },
      signal
    })
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log('S3 single file upload canceled')
      throw error
    }
    // axios throws for non-2xx responses or network errors.
    console.error('S3 upload error:', error)
    throw new Error(`Error occurred while uploading file. Please verify S3 CORS settings.`)
  }

  uploadedBytes += file.size

  if (onProgress) {
    const percentage = Math.round((uploadedBytes / totalBytes) * 100)
    onProgress(percentage)
  }

  return response
}
