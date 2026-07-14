import React, { useState, useMemo } from 'react'
import { Modal, Title, Button, Radio } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import {
  ModeSelectionContainer,
  StyledRadioWrapper,
  Card,
  CardInfo,
  CardInfoTitleText,
  CardInfoDescText
} from '../../Device/styles'
import { useOrganizationStore } from '@repo/stores'
const DownloadScriptModal = ({ isOpen, moduleRow, onConfirm, onCancel }) => {
  const { t } = useTranslation('settings')
  const { allOrgs, actualOrgs } = useOrganizationStore()

  const findOrgIdByCode = (code) => {
    return allOrgs.find((org) => org.code === code)?.id
  }

  const targetCiCd = moduleRow?.Cicds?.find((cicd) => cicd.organizationId === findOrgIdByCode(actualOrgs[0].code))
  const [templateMode, setTemplateMode] = useState(targetCiCd?.mode || 'development')

  const handleModeChange = (mode) => {
    setTemplateMode(mode)
  }

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      renderButtonComponent={
        <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
          <Button size="lg" theme="secondary" onClick={() => onCancel()} style={{ minWidth: '120px' }}>
            {t('cancel')}
          </Button>
          <Button
            size="lg"
            theme="primary"
            onClick={() => onConfirm(moduleRow, templateMode)}
            style={{ minWidth: '120px' }}
          >
            {t('templateDownload')}
          </Button>
        </div>
      }
    >
      <div style={{ padding: '3rem 5rem', textAlign: 'center' }}>
        <Title style={{ marginBottom: '2rem' }}>{t('selectDeploymentMode')}</Title>
        <p style={{ lineHeight: '2', marginBottom: '2rem' }}>{t('selectDeploymentModeDescription')}</p>

        <ModeSelectionContainer>
          <Card active={templateMode === 'development'} onClick={() => handleModeChange('development')}>
            <StyledRadioWrapper>
              <Radio
                name="templateMode"
                value="development"
                checked={templateMode === 'development'}
                onChange={() => handleModeChange('development')}
              />
            </StyledRadioWrapper>
            <CardInfo>
              <CardInfoTitleText>{t('developerMode')}</CardInfoTitleText>
              <CardInfoDescText>{t('developerModeDescription')}</CardInfoDescText>
            </CardInfo>
          </Card>

          <Card active={templateMode === 'product'} onClick={() => handleModeChange('product')}>
            <StyledRadioWrapper>
              <Radio
                name="templateMode"
                value="product"
                checked={templateMode === 'product'}
                onChange={() => handleModeChange('product')}
              />
            </StyledRadioWrapper>
            <CardInfo>
              <CardInfoTitleText>{t('productionMode')}</CardInfoTitleText>
              <CardInfoDescText>{t('productionModeDescription')}</CardInfoDescText>
            </CardInfo>
          </Card>
        </ModeSelectionContainer>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}></div>
      </div>
    </Modal>
  )
}

export default DownloadScriptModal
