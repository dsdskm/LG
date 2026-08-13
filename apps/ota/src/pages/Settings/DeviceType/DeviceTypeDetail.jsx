import React, { useState, useEffect } from 'react'
import { StyledPageContent, Section, Title, Button, Input, Textarea } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { deviceTypeApis } from '@/apis'
import { toast } from 'react-toastify'
import { ButtonWrap, DetailHead } from '@/components/common/styles'
import { useOrganizationStore } from '@repo/stores'

const DeviceTypeDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const { company } = useOrganizationStore()

  const [deviceTypeName, setDeviceTypeName] = useState('')
  const [memo, setMemo] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const handleSave = () => {
    setIsLoading(true)
    deviceTypeApis
      .saveDeviceType({
        id: id ? Number(id) : undefined,
        displayName: deviceTypeName,
        memo: memo,
        code: code
      })
      .then(() => {
        toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
        navigate('/ota/settings/device-type')
      })
      .catch((error) => {
        console.error(error)
        toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const handleCancel = () => {
    navigate('/ota/settings/device-type')
  }

  const isDisabled = () => {
    return !deviceTypeName || !code
  }

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        setIsLoading(true)
        try {
          const response = await deviceTypeApis.retrieveDeviceTypes(company.id, id)
          const data = Array.isArray(response.results) ? response.results[0] : response.results
          if (data) {
            setDeviceTypeName(data.displayName || '')
            setMemo(data.memo || '')
            setCode(data.code || '')
          }
        } catch (error) {
          console.error(error)
        } finally {
          setIsLoading(false)
        }
      }
      fetchData()
    }
  }, [id])

  return (
    <StyledPageContent className="column">
      <DetailHead>
        <div className="titleGroup">
          <Title>{id ? t('deviceTypeDetail') : t('deviceTypeCreation')}</Title>
        </div>
        <ButtonWrap className="alignRight">
          <Button variant="contained" onClick={handleSave} disabled={isLoading || isDisabled()}>
            {id ? t('modify') : t('create')}
          </Button>
          <Button variant="contained" onClick={handleCancel} disabled={isLoading}>
            {t('cancel')}
          </Button>
        </ButtonWrap>
      </DetailHead>
      <Section gap="2.4rem">
        <Section horizontal gap="2.4rem">
          <div style={{ flex: 1 }}>
            <Input
              label={t('deviceTypeName')}
              size="lg"
              placeholder={t('enterDeviceTypeName')}
              value={deviceTypeName}
              onChange={(e) => setDeviceTypeName(e.target.value)}
            />
          </div>
          <div style={{ flex: 2 }}>
            <Textarea
              label={t('memo')}
              size="lg"
              placeholder={t('enterMemo')}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              count={`${memo.length}/100`}
              maxLength={100}
            />
          </div>
        </Section>

        <Section horizontal gap="2.4rem">
          <Input
            label={t('code')}
            size="lg"
            placeholder={t('enterCode')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={id}
          />
        </Section>
      </Section>
    </StyledPageContent>
  )
}

export default DeviceTypeDetail
