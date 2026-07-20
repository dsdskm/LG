import React, { useState, useEffect, useMemo } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  Button,
  Input,
  Textarea,
  Dropdown,
  Modal,
  ProgressBar,
  Tag,
  Checkbox
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { moduleApis, packageTypeApis, artifactApis } from '@/apis'
import { useS3Upload } from '@repo/hooks/useS3Upload'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { DropdownContainer } from './styles'
import { ButtonWrap, PageHeadWrap } from '@/components/common/styles'
import { VersionContainer } from '@repo/ui/styles'
import { toast } from 'react-toastify'

const ArtifactDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation('artifact')
  const { t: tCommon } = useTranslation('common')
  const { actualOrgs, company, defaultOrg, allOrgs } = useOrganizationStore()
  const session = useUserStore((state) => state.session)

  const navigate = useNavigate()
  const orgIdParam = new URLSearchParams(window.location.search).get('orgId')
  const currentOrg = useMemo(() => allOrgs.concat(defaultOrg).find((o) => o.id === Number(orgIdParam)), [defaultOrg])

  const [displayName, setDisplayName] = useState('')
  const [memo, setMemo] = useState('')
  const [packageType, setPackageType] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [artifactFile, setArtifactFile] = useState(null)
  const [manifestFile, setManifestFile] = useState(null)
  const [status, setStatus] = useState('')
  const [allPackageTypes, setAllPackageTypes] = useState([])
  const [allModules, setAllModules] = useState([])
  const [moduleOptions, setModuleOptions] = useState([])
  const [moduleId, setModuleId] = useState(null)
  const [latestVersion, setLatestVersion] = useState(true)

  const [version, setVersion] = useState('')
  const [versions, setVersions] = useState([])
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isUploadFailModalOpen, setIsUploadFailModalOpen] = useState(false)
  const [isUploadCancelModalOpen, setIsUploadCancelModalOpen] = useState(false)
  const [createdArtifactId, setCreatedArtifactId] = useState(null)

  const { uploadFile, abort, isUploading, uploadProgress, error } = useS3Upload({
    requestUploadUrl: async ({ file, chunkCount, context }) => {
      const { artifactData, kind } = context
      const res = await artifactApis.requestUploadUrl({
        artifactId: artifactData.id,
        orgId: artifactData.orgId,
        moduleId: artifactData.moduleId,
        files: {
          [kind]: { chunkCount, fileName: file?.name || '' }
        }
      })
      const { artifactUrls, artifactUploadId, manifestUrls } = res.results
      return {
        presignedUrls: kind === 'manifest' ? manifestUrls : artifactUrls,
        uploadId: artifactUploadId
      }
    },
    completeUpload: async ({ file, chunkCount, context }) => {
      // Only the multipart artifact needs server-side part assembly.
      if (context.kind !== 'artifact') return { error: false }
      return artifactApis.completeMultipartUpload({
        id: context.artifactData.id,
        companyId: company.id,
        orgId: context.artifactData.orgId,
        fileName: file.name,
        chunkCount
      })
    },
    abortUpload: ({ uploadId }) => artifactApis.abortMultipartUpload({ uploadId })
  })

  const handleSave = () => {
    if (artifactFile?.size > 0 || manifestFile?.size > 0) {
      setIsConfirmModalOpen(true)
    } else {
      confirmSave()
    }
  }

  const confirmSave = async () => {
    setIsConfirmModalOpen(false)
    console.log('save')
    const versionList = versions.map((v) => v)
    if (latestVersion) {
      versionList.push('latest')
    }

    const targetId = id || createdArtifactId
    const artifactData = {
      orgId: currentOrg?.id,
      displayName,
      memo,
      moduleId,
      version: { displayName: versionList },
      fileInfo: {
        artifact: {
          name: artifactFile?.fileName || artifactFile?.name,
          size: artifactFile?.fileSize || artifactFile?.size
        }
      }
    }
    if (manifestFile) {
      artifactData.fileInfo.manifest = {
        name: manifestFile?.fileName || manifestFile?.name,
        size: manifestFile?.fileSize || manifestFile?.size
      }
    }
    const CHUNK_SIZE = 1024 * 1024 * 10 // 10MB
    try {
      let currentArtifactId = targetId ? Number(targetId) : null

      if (currentArtifactId) {
        artifactData.id = currentArtifactId
      } else if (!artifactFile) {
        return
      }

      const saveRes = await artifactApis.saveArtifact(artifactData)
      if (saveRes.error) {
        return
      }

      if (!currentArtifactId) {
        currentArtifactId = saveRes.results?.id
        setCreatedArtifactId(currentArtifactId)
        artifactData.id = currentArtifactId
      }

      const uploadTasks = []
      if (artifactFile?.size > 0) {
        uploadTasks.push({
          file: artifactFile,
          promise: uploadFile(artifactFile, { artifactData, kind: 'artifact' })
        })
      }
      if (manifestFile?.size > 0) {
        uploadTasks.push({
          file: manifestFile,
          promise: uploadFile(manifestFile, { artifactData, kind: 'manifest' })
        })
      }

      if (uploadTasks.length > 0) {
        const results = await Promise.all(uploadTasks.map((t) => t.promise))
        const errorIndex = results.findIndex((res) => res?.error)

        if (errorIndex !== -1) {
          const errorRes = results[errorIndex]
          if (errorRes?.error?.code === 'UPLOAD_CANCELED') {
            toast.info(t('uploadCanceled'), { autoClose: 2000 })
            setStatus('CANCELED')
          } else {
            setIsUploadFailModalOpen(true)
            setStatus('FAILED')
          }
          const errorFile = uploadTasks[errorIndex].file
          await artifactApis.failedMultipartUpload({
            id: currentArtifactId,
            moduleId: moduleId,
            orgId: artifactData.orgId,
            fileName: errorFile.name,
            chunkCount: Math.ceil(errorFile.size / CHUNK_SIZE)
          })
        } else {
          toast.success(t('uploadSuccess'), { autoClose: 2000 })
          navigate('/ota/artifact')
        }
      } else {
        toast.success(t('updateComplete'), { autoClose: 2000 })
        navigate('/ota/artifact')
      }
    } catch (err) {
      console.error('Artifact save/upload flow failed:', err)
    }
  }

  const handleAbort = () => {
    setIsUploadCancelModalOpen(true)
  }

  const handleAbortConfirm = () => {
    setIsUploadCancelModalOpen(false)
    abort()
  }

  const handleModuleChange = (value) => {
    setModuleId(value)
    const md = allModules.find((m) => m.id === Number(value))
    const pt = allPackageTypes.find((p) => p.id === md.PackageType.id)
    setPackageType(pt)
  }

  const handleCancel = () => {
    navigate('/ota/artifact')
  }

  const handleDeleteTag = (index) => {
    setVersions(versions.filter((_, i) => i !== index))
  }

  const isDisabled = () => {
    if (id) {
      return !displayName
    }
    return !displayName || !packageType || !versions.length || !artifactFile || !moduleId
  }

  const isDockerType = () => {
    return packageType?.code === '0000'
  }

  const addVersion = () => {
    if (versions.includes(version)) {
      toast.error('Version already exists', { autoClose: 2000 })
      return
    }
    if (versions.length >= 3) {
      toast.error('Tag limit is 3', { autoClose: 2000 })
      return
    }
    if (version.trim().toLowerCase() === 'latest') {
      toast.error('Tag cannot be "latest"', { autoClose: 2000 })
      return
    }
    setVersions([...versions, version])
    setVersion('')
  }

  useEffect(() => {
    console.log(id)
    if (id) {
      try {
        const retrieveArtifacts = async () => {
          setIsLoading(true)
          const response = await artifactApis.retrieveArtifacts([Number(orgIdParam)], id)
          const artifact = response.results[0]
          setDisplayName(artifact.displayName || '')
          setMemo(artifact.memo || '')
          setStatus(artifact.status)
          setModuleId(artifact.Module.id || '')
          setPackageType(artifact.PackageType || null)
          setVersions(artifact.Versions.map((v) => v.displayName) || [])
          setOrganizationId(artifact.Organization.id || '')

          const artifactFile = artifact.Files.find((file) => file.fileType === 'artifact')
          const manifestFile = artifact.Files.find((file) => file.fileType === 'manifest')
          const { fileName: artifactFileName, fileSize: artifactFileSize } = artifactFile
          setArtifactFile({ fileName: artifactFileName, fileSize: artifactFileSize } || null)
          if (manifestFile) {
            const { fileName: manifestFileName, fileSize: manifestFileSize } = manifestFile
            setManifestFile({ fileName: manifestFileName, fileSize: manifestFileSize } || null)
          }
        }
        retrieveArtifacts()
      } catch (error) {
        console.error('Error retrieving artifacts:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }, [id])

  useEffect(() => {
    if (!company) return
    const retrieveModules = async () => {
      setIsLoading(true)
      try {
        const response = await moduleApis.retrieveModules(company.id, null)
        setModuleOptions(
          response.results.map((module) => ({ value: module.id, name: module.displayName, use: module.use }))
        )
        setAllModules(response.results)
      } catch (error) {
        console.error('Error retrieving modules:', error)
      } finally {
        setIsLoading(false)
      }
    }
    retrieveModules()

    const retrievePackageTypes = async () => {
      setIsLoading(true)
      try {
        const response = await packageTypeApis.retrievePackageTypes(company.id)
        setAllPackageTypes(response.results)
      } catch (error) {
        console.error('Error retrieving package types:', error)
      } finally {
        setIsLoading(false)
      }
    }
    retrievePackageTypes()
  }, [company])

  return (
    <StyledPageContent className="column">
      <Title>
        {t('artifactTitle')} &gt; {tCommon('detail')}
      </Title>
      <PageHeadWrap>
        <div>{`${tCommon('organizationName')} : ${currentOrg?.displayName}`}</div>
        <ButtonWrap className="alignRight">
          <Button variant="contained" onClick={handleSave} disabled={isLoading || isUploading || isDisabled()}>
            {t(id ? 'modify' : 'save')}
          </Button>
          <Button variant="contained" onClick={handleCancel} disabled={isLoading || isUploading}>
            {t('cancel')}
          </Button>
        </ButtonWrap>
      </PageHeadWrap>
      <Section gap="2.4rem">
        <Section gap="2.4rem">
          <Input
            label={t('title')}
            size="lg"
            placeholder={t('enterTitle')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Textarea
            label={t('memo')}
            size="lg"
            placeholder={t('enterMemo')}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            count={`${memo.length}/100`}
            maxLength={100}
          />
        </Section>
        <Section gap="0.5rem">
          <DropdownContainer>
            <Dropdown
              label={t('module')}
              size="lg"
              value={moduleId}
              placeholder={t('selectModule')}
              options={moduleOptions}
              onChange={handleModuleChange}
              disabled={id !== undefined && id !== null}
            />
          </DropdownContainer>
          <Input
            type="file"
            label={t('fileArtifact')}
            size="lg"
            value={artifactFile?.fileName || ''}
            onChange={(e) => setArtifactFile(e.target?.files[0] || artifactFile)}
            onReset={() => setArtifactFile(null)}
            disabled={id !== undefined && id !== null && (status === 'IN_PROGRESS' || status === 'SUCCESS')}
          />
          {packageType?.needScript && (
            <Input
              type="file"
              label={t('fileManifest')}
              size="lg"
              value={manifestFile?.fileName || ''}
              onChange={(e) => setManifestFile(e.target?.files[0] || manifestFile)}
              onReset={() => setManifestFile(null)}
              disabled={id !== undefined && id !== null && (status === 'IN_PROGRESS' || status === 'SUCCESS')}
            />
          )}
          <VersionContainer>
            <div className="version-label">{isDockerType() ? 'Tag' : 'Version'}</div>
            <div className="version-wrapper">
              <div
                className={`version-input-group ${!moduleId || (id !== undefined && id !== null) ? 'disabled' : ''}`}
              >
                <Input
                  value={version}
                  size="sm"
                  style={{ width: '20rem' }}
                  onChange={(e) => setVersion(e.target.value)}
                  type="text"
                  disabled={id !== undefined && id !== null}
                  onKeyDown={(e) => e.key === 'Enter' && version && addVersion()}
                />
                <Button
                  variant="contained"
                  onClick={addVersion}
                  disabled={(id !== undefined && id !== null) || !version}
                >
                  +
                </Button>
              </div>
              <div className="version-list">
                {versions.map((ver, index) => (
                  <div key={index} className="tag">
                    <Tag
                      variant="contained"
                      size="sm"
                      onClick={() => (id === undefined || id === null) && handleDeleteTag(index)}
                    >
                      {ver}
                      {(id === undefined || id === null) && (
                        <span
                          className="close-icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTag(index)
                          }}
                        >
                          ✕
                        </span>
                      )}
                    </Tag>
                  </div>
                ))}
              </div>
            </div>
          </VersionContainer>
        </Section>
      </Section>

      <Modal
        isOpen={isUploading}
        title={t('uploadingArtifact') || 'Uploading Artifact'}
        closeButton={false}
        size="md"
        renderButtonComponent={
          <Button variant="contained" color="error" onClick={handleAbort}>
            {t('abort')}
          </Button>
        }
      >
        <div style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <p style={{ marginBottom: '0.8rem' }}>{t('uploadProgressDescription')}</p>
          <ProgressBar percentage={uploadProgress} showPercentage={true} status={`${uploadProgress}%`} />
        </div>
      </Modal>

      <Modal
        isOpen={isConfirmModalOpen}
        title={t('saveArtifact')}
        onClose={() => setIsConfirmModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ButtonWrap className="alignRight" style={{ marginTop: '2rem' }}>
            <Button variant="contained" onClick={confirmSave}>
              {tCommon('confirm')}
            </Button>
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
          </ButtonWrap>
        }
      >
        <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <p>{t('confirmSaveArtifact')}</p>
          <Checkbox
            label={t('saveAsLatest')}
            checked={latestVersion}
            onChange={(e) => setLatestVersion(e.target.checked)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isUploadFailModalOpen}
        title={tCommon('error.uploadFail')}
        onClose={() => setIsUploadFailModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ButtonWrap className="alignRight" style={{ marginTop: '2rem' }}>
            <Button variant="contained" onClick={() => setIsUploadFailModalOpen(false)}>
              {tCommon('confirm')}
            </Button>
          </ButtonWrap>
        }
      >
        <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <p>{tCommon('error.fileUploadError')}</p>
        </div>
      </Modal>

      <Modal
        isOpen={isUploadCancelModalOpen}
        title={t('abortUpload')}
        onClose={() => setIsUploadCancelModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ButtonWrap className="alignRight" style={{ marginTop: '2rem' }}>
            <Button variant="contained" onClick={handleAbortConfirm}>
              {tCommon('confirm')}
            </Button>
            <Button variant="outline" onClick={() => setIsUploadCancelModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
          </ButtonWrap>
        }
      >
        <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <p>{t('confirmAbortUpload')}</p>
        </div>
      </Modal>
    </StyledPageContent>
  )
}

export default ArtifactDetail
