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

  return (
    <StyledPageContent className="column">
      <Title>{t('robotDetail')}</Title>
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
