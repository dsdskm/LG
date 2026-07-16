import React from 'react'
import { Button, Tag } from '@repo/ui'

const ForgeSection = ({
  t,
  id,
  selectedForgeModel,
  setSelectedForgeModel,
  handleRetrieveForgeModel
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <Button
          variant="contained"
          onClick={handleRetrieveForgeModel}
          disabled={id !== undefined && id !== null}
        >
          {t('retrieveForgeModel')}
        </Button>
      </div>
      {selectedForgeModel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.4rem' }}>
          <span style={{ color: 'var(--color-neutral-70)' }}>{t('selectedModel') || 'Selected Model'}:</span>
          <Tag variant="contained" size="sm" theme="light">
            {selectedForgeModel.displayName}
            <span
              style={{ marginLeft: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setSelectedForgeModel(null)}
            >
              ✕
            </span>
          </Tag>
        </div>
      )}
    </div>
  )
}

export default ForgeSection
