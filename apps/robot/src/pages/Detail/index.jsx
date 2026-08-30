import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyledPageContent, Title, Tabs, Tab } from '@repo/ui'
import { useSearchParams } from 'react-router-dom'
import { deviceApis } from '@/apis'
import AssetInfo from './tabs/AssetInfo'
import HistoryList from './tabs/HistoryList'
import WebConsole from './tabs/WebConsole'
import '../../index.css'

const Detail = () => {
  const { t, i18n } = useTranslation('robot')
  const [searchParams] = useSearchParams()
  const deviceId = searchParams.get('deviceId')
  const [deviceInfo, setDeviceInfo] = useState({})
  const [deviceName, setDeviceName] = useState('')

  useEffect(() => {
    if (!deviceId) return
    deviceApis
      .getDeviceInfo(deviceId)
      .then((data) => {
        setDeviceName(data?.deviceName || data?.name || deviceId)
      })
      .catch((e) => {
        console.error('로봇 정보 조회 실패:', e)
        setDeviceName(deviceId)
      })
  }, [deviceId])

  return (
    <StyledPageContent className="column">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
        <Title>{t('robotDetail')}</Title>
        {deviceName && (
          <span
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '999px',
              fontSize: '1.2rem',
              fontWeight: 600,
              backgroundColor: 'var(--t-tag-bg)',
              color: '#fff',
              whiteSpace: 'nowrap',
              marginBottom: '0.8rem'
            }}
          >
            {deviceName}
          </span>
        )}
      </div>
      <Tabs defaultActiveId="tabAssetInfo">
        <Tab id="tabAssetInfo" label={t('basicInformation')}>
          <AssetInfo t={t} deviceId={deviceId} />
        </Tab>
        <Tab id="tabWebConsole" label={t('robotWebConsole')}>
          <WebConsole t={t} deviceId={deviceId} i18n={i18n} />
        </Tab>
        <Tab id="tabHistory" label={t('contorlOperationHistory')}>
          <HistoryList t={t} deviceId={deviceId} />
        </Tab>
      </Tabs>
    </StyledPageContent>
  )
}

export default Detail
