import React, { useState, useEffect } from 'react'
import { StyledPageContent, Section, Title, Button, Input, Radio } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { labelApis } from '@/apis'
import { toast } from 'react-toastify'
import { ButtonWrap, SelectionTypeContainer } from '@/components/common/styles'
import { useOrganizationStore } from '@repo/stores'
import { guardAction } from '@/utils/actionGuard'

const LabelDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation('label')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [type, setType] = useState('normal')
  const [isLoading, setIsLoading] = useState(true)
  const [allLabels, setAllLabels] = useState([])

  const { company } = useOrganizationStore()

  const handleSave = () => {
    const nameValid = checkDuplicateName()
    if (!nameValid) {
      return
    }
    labelApis
      .saveLabel({
        ...(id && { id: Number(id) }),
        displayName: name,
        reserved: type === 'default'
      })
      .then(() => {
        toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
        navigate('/cms/label')
      })
      .catch((error) => {
        console.error(error)
        toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
      })
  }

  const handleCancel = () => {
    navigate('/cms/label')
  }

  const isDisabled = () => {
    return !name
  }

  const checkDuplicateName = () => {
    const exists = allLabels.some((l) => l.displayName === name && l.id !== Number(id))
    if (exists) {
      toast.error(t('duplicateName'), { autoClose: 2000 })
      return false
    }
    return true
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const contentTypeRes = await labelApis.retrieveLabels(company.id)
        setAllLabels(contentTypeRes.results || [])

        if (id) {
          const labelRes = await labelApis.retrieveLabels(company.id, id)
          const labelDatas = Array.isArray(labelRes.results) ? labelRes.results[0] : labelRes.results
          if (labelDatas) {
            setName(labelDatas.displayName || '')
            setType(labelDatas.reserved ? 'default' : 'normal')
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id])

  return (
    <StyledPageContent className="column">
      {/* Section 1: Top Buttons + Title, Memo */}
      <Title>
        {t('labelTitle')} &gt; {tCommon('detail')}
      </Title>
      <ButtonWrap className="alignRight">
        <Button
          variant="contained"
          onClick={guardAction(handleSave, [{ when: isDisabled(), message: '라벨 이름을 입력하세요.' }])}
          disabled={isLoading}
        >
          {id ? t('modify') : t('create')}
        </Button>
        <Button variant="contained" onClick={handleCancel} disabled={isLoading}>
          {t('cancel')}
        </Button>
      </ButtonWrap>
      <Section horizontal gap="2.4rem">
        <Section horizontal gap="2.4rem">
          <div style={{ flex: 1 }}>
            <Input
              label={t('labelName')}
              size="lg"
              placeholder={t('enterLabel')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <SelectionTypeContainer>
            <label>{t('labelType')}</label>
            <Radio
              name="type"
              label={t('normal')}
              value="normal"
              checked={type}
              onChange={(e) => setType(e.target.value)}
            />
            <Radio
              name="type"
              label={t('default')}
              value="default"
              checked={type}
              onChange={(e) => setType(e.target.value)}
            />
          </SelectionTypeContainer>
        </Section>
      </Section>
    </StyledPageContent>
  )
}

export default LabelDetail
