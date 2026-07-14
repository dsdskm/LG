import { useState, useEffect } from 'react'
import { Input } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { fileContentApis } from '@/apis'
import { IconPreview } from './styles'

const CategoryIconField = ({ node, disabled, onChange }) => {
  const { t } = useTranslation('settings')
  const [blobUrl, setBlobUrl] = useState(null)
  const [signedUrl, setSignedUrl] = useState(null)

  // 새로 첨부한 파일(pendingIconFile)은 blob 미리보기 생성, 언마운트/변경 시 revoke
  useEffect(() => {
    if (node.pendingIconFile) {
      const url = URL.createObjectURL(node.pendingIconFile)
      setBlobUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setBlobUrl(null)
    return undefined
  }, [node.pendingIconFile])

  // 기존에 저장된 아이콘은 S3 presigned GET URL 을 받아 표시
  useEffect(() => {
    let active = true
    const fileContentId = node.iconContent?.id
    if (!node.pendingIconFile && fileContentId) {
      fileContentApis
        .requestDownloadUrlById({ fileContentId })
        .then((res) => {
          if (active) setSignedUrl(res?.results || null)
        })
        .catch(() => {
          if (active) setSignedUrl(null)
        })
    } else {
      setSignedUrl(null)
    }
    return () => {
      active = false
    }
  }, [node.iconContent?.id, node.pendingIconFile])

  const previewSrc = blobUrl || signedUrl || null
  const fileName = node.pendingIconFile?.name || node.iconContent?.fileName || ''

  return (
    <>
      <Input
        type="file"
        size="md"
        value={fileName}
        placeholder={t('attachFile')}
        disabled={disabled}
        onChange={(e) => onChange(e.target?.files?.[0] || null)}
        onReset={() => onChange(null)}
      />
      {previewSrc && (
        <IconPreview>
          <img src={previewSrc} alt={fileName || 'icon'} />
        </IconPreview>
      )}
    </>
  )
}

export default CategoryIconField
