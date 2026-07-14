import React, { useState, useEffect } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  Button,
  Input,
  Textarea,
  TransferList,
  OrganizationSelector
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { deviceApis } from '@/apis'
import { organizationApis } from '@repo/apis'
import { toast } from 'react-toastify'
import { useUserStore } from '@repo/stores'
import { ButtonWrap } from '@/components/common/styles'
import { useOrganizationStore } from '@repo/stores'

const OrganizationDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation('organization')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()

  const [organizationName, setOrganizationName] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [availableDevices, setAvailableDevices] = useState([])
  const [selectedDevices, setSelectedDevices] = useState([])

  const { session } = useUserStore()
  const { actualOrgs } = useOrganizationStore()

  const handleSave = () => {
    organizationApis
      .saveOrganization({
        id: id ? Number(id) : undefined,
        displayName: organizationName,
        memo: memo,
        devices: selectedDevices.map((d) => d.id)
      })
      .then(() => {
        toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
        navigate('/ota/organization')
      })
      .catch((error) => {
        console.error(error)
        toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
      })
  }

  const handleCancel = () => {
    navigate('/ota/organization')
  }

  const isDisabled = () => {
    return !organizationName || !memo
  }

  const handleTransferChange = (nextAvailable, nextSelected) => {
    setAvailableDevices(nextAvailable)
    setSelectedDevices(nextSelected)
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        let initialSelected = []
        if (id) {
          const groupRes = await organizationApis.retrieveOrganizationUser({ userId: session?.email, id })
          const groupData = groupRes.results[0]
          if (groupData) {
            setOrganizationName(groupData.displayName || '')
            setMemo(groupData.memo || '')
            initialSelected = groupData.devices || []
          }
        }

        const deviceRes = await deviceApis.retrieveDevices(actualOrgs.map((org) => org.id))
        const allDevices = deviceRes.results || []

        const selectedIds = new Set(initialSelected.map((device) => device.id))

        setAvailableDevices(allDevices.filter((device) => !device.organization && !selectedIds.has(device.id)))
        setSelectedDevices(initialSelected)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchData()
    }
  }, [id, session])

  return (
    <StyledPageContent className="column">
      <Title>
        {t('organizationTitle')} &gt; {tCommon('detail')}
      </Title>
      <ButtonWrap className="alignRight">
        <Button variant="contained" onClick={handleSave} disabled={isLoading || isDisabled()}>
          {t('save')}
        </Button>
        <Button variant="contained" onClick={handleCancel} disabled={isLoading}>
          {t('cancel', 'Cancel')}
        </Button>
      </ButtonWrap>
      <Section gap="2.4rem">
        <Section gap="2.4rem">
          <div>
            <Input
              label={t('title', 'Title')}
              size="lg"
              placeholder={t('enterTitle', 'Enter Title')}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
            />
          </div>
          <Textarea
            label={t('memo', 'Memo')}
            size="lg"
            placeholder={t('enterMemo', 'Enter Memo')}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Section>

        <TransferList
          title={t('appliedDevice')}
          availableItems={availableDevices}
          selectedItems={selectedDevices}
          onChange={handleTransferChange}
          searchPlaceholder={tCommon('searchPlaceHolder', 'Search...')}
          disabled={id}
        />
      </Section>
    </StyledPageContent>
  )
}

export default OrganizationDetail
