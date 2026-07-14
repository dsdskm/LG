import React, { useState, useEffect } from 'react'
import { StyledPageContent, Section, SectionTitle, Title, Button, Input, Textarea, Checkbox } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { policyApis } from '@/apis'
import { ButtonWrap, PageHeadWrap } from '@/components/common/styles'
import { useOrganizationStore, useUserStore } from '@repo/stores'

const PolicyDetail = () => {
  const { id } = useParams()
  const orgId = new URLSearchParams(location.search).get('orgId')
  const { t } = useTranslation('policy')
  const { t: tCommon } = useTranslation('common')
  const { actualOrgs, defaultOrg } = useOrganizationStore()
  const { session } = useUserStore()
  const navigate = useNavigate()

  const [currentOrg, setCurrentOrg] = useState()
  const [policyName, setPolicyName] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [waitTimeout, setWaitTimeout] = useState('')
  const [battery, setBattery] = useState('')
  const [wifiOnly, setWifiOnly] = useState(false)

  const handleSave = async () => {
    try {
      const payload = {
        orgId: currentOrg.id,
        displayName: policyName,
        memo,
        contents: {
          timeout: {
            complete: waitTimeout
          }
        }
        // deviceCondition: {
        //   minBattLv: battery,
        //   wifiOnly
        // }
      }
      if (id) {
        payload.id = Number(id)
      }
      const response = await policyApis.savePolicy(payload)
      console.log(response)
    } catch (error) {
      console.error('Error saving policy:', error)
    } finally {
      navigate('/ota/policy')
    }
  }

  const handleCancel = () => {
    navigate('/ota/policy')
  }

  const isDisabled = () => {
    return !policyName || !waitTimeout
  }

  useEffect(() => {
    if (session.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0) {
      setCurrentOrg(defaultOrg)
    } else if (actualOrgs.length > 0) {
      setCurrentOrg(actualOrgs[0])
    }
  }, [actualOrgs, defaultOrg])

  useEffect(() => {
    const retrievePolicy = async () => {
      setIsLoading(true)
      try {
        const response = await policyApis.retrievePolicy([Number(orgId)], Number(id))
        const data = response.results[0]
        setPolicyName(data.displayName || '')
        setMemo(data.memo || '')
        if (data) {
          if (data.waitTimeout) {
            setWaitTimeout(data.waitTimeout || '')
          }
          if (data.battery) {
            setBattery(data.battery || '')
          }
          setWifiOnly(!!data.wifiOnly)
        }
      } catch (error) {
        console.error('Error retrieving policy:', error)
      } finally {
        setIsLoading(false)
      }
    }
    if (id) {
      retrievePolicy()
    } else {
      setIsLoading(false)
    }
  }, [currentOrg])

  return (
    <StyledPageContent className="column">
      <Title>
        {t('policyTitle')} &gt; {tCommon('detail')}
      </Title>
      <PageHeadWrap>
        <div>{`${tCommon('organizationName')} : ${currentOrg?.displayName || ''}`}</div>
        <ButtonWrap className="alignRight">
          <Button variant="contained" onClick={handleSave} disabled={isLoading || isDisabled()}>
            {t(id ? 'modify' : 'save')}
          </Button>
          <Button variant="contained" onClick={handleCancel} disabled={isLoading}>
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
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
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
        <Section gap="1.5rem">
          <SectionTitle title={t('timeout')} />
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Input
              label={t('completeTime')}
              value={waitTimeout}
              type="number"
              max={24}
              min={1}
              onChange={(e) => setWaitTimeout(e.target.value)}
              disabled={id}
            />
          </div>
        </Section>
        {/* <Section gap="1.5rem">
          <SectionTitle title={t('deviceCondition')} />
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Input
              label={t('batteryLevel')}
              value={battery}
              type="number"
              max={100}
              min={30}
              onChange={(e) => setBattery(e.target.value)}
              disabled={id}
            />
            <div style={{ paddingBottom: '0.8rem' }}>
              <Checkbox
                label={t('wifiOnly')}
                checked={wifiOnly}
                onChange={(e) => setWifiOnly(e.target.checked)}
                disabled={id}
              />
            </div>
          </div>
        </Section> */}
      </Section>
    </StyledPageContent>
  )
}

export default PolicyDetail
