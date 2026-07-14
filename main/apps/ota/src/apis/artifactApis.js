import { artifactApis } from '@repo/apis'

const retrieveArtifacts = async (orgIds, id) => {
  const response = await artifactApis.retrieveArtifacts(orgIds, id)
  return response
}

const requestUploadUrl = async (data) => {
  const response = await artifactApis.requestUploadUrl(data)
  return response
}

const completeMultipartUpload = async (data) => {
  const response = await artifactApis.completeMultipartUpload(data)
  return response
}

const abortMultipartUpload = async (data) => {
  const response = await artifactApis.abortMultipartUpload(data)
  return response
}

const saveArtifact = async (data) => {
  const response = await artifactApis.saveArtifact(data)
  return response
}

const failedMultipartUpload = async (data) => {
  const response = await artifactApis.failedMultipartUpload(data)
  return response
}

export {
  retrieveArtifacts,
  requestUploadUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  saveArtifact,
  failedMultipartUpload
}
