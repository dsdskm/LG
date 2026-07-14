import { useState, useRef } from 'react'
import styled from 'styled-components'

const DropZone = styled.div`
  border: 2px dashed ${({ $dragOver }) => ($dragOver ? '#FF6B6B' : 'var(--color-secondary-20, #dadde2)')};
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $dragOver }) => ($dragOver ? 'rgba(255,107,107,0.05)' : 'var(--color-neutral-10, #fff)')};

  &:hover {
    border-color: #ff6b6b;
    background: rgba(255, 107, 107, 0.05);
  }
`

const DropIcon = styled.div`
  font-size: 40px;
  margin-bottom: 12px;
`

const DropTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
  margin-bottom: 6px;
`

const DropHint = styled.div`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
`

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
`

const FileItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
`

const FileName = styled.span`
  font-size: 13px;
  color: var(--color-secondary-90, #262f44);
`

const FileSize = styled.span`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
`

const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
`

export default function VideoUploader({ files, onChange }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles)
    onChange([...files, ...arr])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const removeFile = (index) => {
    onChange(files.filter((_, i) => i !== index))
  }

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div>
      <DropZone
        $dragOver={dragOver}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <DropIcon>🎬</DropIcon>
        <DropTitle>영상 파일을 드래그하거나 클릭하여 추가</DropTitle>
        <DropHint>MP4, MOV, AVI, MKV 지원</DropHint>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => addFiles(e.target.files)}
        />
      </DropZone>

      {files.length > 0 && (
        <FileList>
          {files.map((file, i) => (
            <FileItem key={i}>
              <FileName>📹 {file.name}</FileName>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileSize>{formatSize(file.size)}</FileSize>
                <RemoveBtn onClick={() => removeFile(i)}>×</RemoveBtn>
              </div>
            </FileItem>
          ))}
        </FileList>
      )}
    </div>
  )
}
