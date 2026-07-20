import React from 'react'
import { StyledPageContent, Title, Button, Tabs, Tab } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import SiteRobotList from './tabs/SiteRobotList'
import UnsignedList from './tabs/UnsignedList'
import SignedList from './tabs/SignedList'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@/assets/icon'

const SiteDetail = () => {
  const { t } = useTranslation('robot')
  const [searchParams] = useSearchParams()
  const siteId = searchParams.get('siteId')
  const navigate = useNavigate()

  return (
    <StyledPageContent className="column">
      <div className="flex gap-2 sm:gap-2.5 ">
        <Title>{t('robotAssign')}</Title>
      </div>
      <Tabs defaultActiveId="tabSite">
        <Tab id="tabSite" label={t('currentSite')}>
          <SiteRobotList siteId={siteId} />
        </Tab>
        <Tab id="tabUnsigned" label={t('unassigned')}>
          <UnsignedList siteId={siteId} />
        </Tab>
        <Tab id="tabOtherSite" label={t('다른 사이트')}>
          <SignedList siteId={siteId} />
        </Tab>
      </Tabs>
    </StyledPageContent>
  )
}

export default SiteDetail
