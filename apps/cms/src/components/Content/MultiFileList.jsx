import { useRef } from 'react'
import { Button, IconButton, Icon } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { FileRow, FileNameChip, MoveBtnGroup } from '@/pages/Content/styles'

const genUid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `file-${Math.random().toString(36).slice(2)}-${Date.now()}`

const FileRowItem = ({ row, index, total, accept, attributeHint, selected, onFile, onRemove, onMove, onSelect }) => {
  const { t } = useTranslation('content')
  const inputRef = useRef(null)
  const fileName = row.file?.name || row.fileName || ''

  return (
    <FileRow $selected={selected} onClick={() => onSelect(row.uid)}>
      <div className="attach-col">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => onFile(row.uid, e.target?.files?.[0] || null)}
        />
        <Button
          size="sm"
          theme="secondary"
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
        >
          + {t('addFile', '파일첨부')}
        </Button>
        {attributeHint && <span className="resolution-hint">{attributeHint}</span>}
      </div>

      <div className="name-col">
        {fileName ? (
          <FileNameChip title={fileName}>
            {fileName}
            <span
              className="remove"
              onClick={(e) => {
                e.stopPropagation()
                onFile(row.uid, null)
              }}
            >
              <Icon name="close" size={12} />
            </span>
          </FileNameChip>
        ) : (
          <span style={{ color: '#b0b8c1', fontSize: '1.3rem' }}>{t('selectFile', '파일을 선택하세요')}</span>
        )}
      </div>

      <MoveBtnGroup onClick={(e) => e.stopPropagation()}>
        <IconButton
          type="button"
          name="arrow_up"
          size="xs"
          shape="square"
          theme="outlined"
          disabled={index === 0}
          onClick={() => onMove(row.uid, 'up')}
        />
        <IconButton
          type="button"
          name="arrow_down"
          size="xs"
          shape="square"
          theme="outlined"
          disabled={index === total - 1}
          onClick={() => onMove(row.uid, 'down')}
        />
      </MoveBtnGroup>

      <Button
        size="sm"
        theme="delete"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(row.uid)
        }}
      >
        {t('removeItem', '삭제')}
      </Button>
    </FileRow>
  )
}

const MultiFileList = ({ files, accept, attributeHint, selectedUid, onChange, onSelect = () => {} }) => {
  const { t } = useTranslation('content')

  const setFile = (uid, file) => onChange(files.map((f) => (f.uid === uid ? { ...f, file } : f)))
  const removeRow = (uid) => onChange(files.filter((f) => f.uid !== uid))
  const addRow = () => onChange([...files, { uid: genUid(), file: null }])
  const moveRow = (uid, dir) => {
    const i = files.findIndex((f) => f.uid === uid)
    const j = dir === 'up' ? i - 1 : i + 1
    if (i === -1 || j < 0 || j >= files.length) return
    const next = [...files]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div>
      {files.map((row, i) => (
        <FileRowItem
          key={row.uid}
          row={row}
          index={i}
          total={files.length}
          accept={accept}
          attributeHint={attributeHint}
          selected={selectedUid === row.uid}
          onFile={setFile}
          onRemove={removeRow}
          onMove={moveRow}
          onSelect={onSelect}
        />
      ))}
      <Button size="sm" theme="secondary" onClick={addRow}>
        + {t('addFile', '파일첨부')}
      </Button>
    </div>
  )
}

export default MultiFileList
