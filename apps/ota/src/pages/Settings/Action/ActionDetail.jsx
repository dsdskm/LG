import React, { useState, useEffect } from 'react'
import {
  StyledPageContent,
  Section,
  SectionTitle,
  Title,
  Button,
  Input,
  Textarea,
  Dropdown,
  IconButton,
  Icon
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { DropdownContainer, VariableRow, VariableHeader } from './styles'
import { useNavigate, useParams } from 'react-router-dom'
import { actionApis } from '@/apis'
import { ButtonWrap, DetailHead } from '@/components/common/styles'
import { useOrganizationStore } from '@repo/stores'

const ActionDetail = () => {
  const { id } = useParams()
  const orgId = new URLSearchParams(location.search).get('orgId')
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [typeKeyValues, setTypeKeyValues] = useState([])
  const [valueId, setValueId] = useState(null)
  const [workingTKV, setWorkingTKV] = useState({ type: '', key: '', value: '' })
  const [isLoading, setIsLoading] = useState(true)
  const { actualOrgs } = useOrganizationStore()

  const handleSave = () => {
    const save = async () => {
      try {
        await actionApis.saveAction({
          orgId: orgId,
          id: Number(id),
          displayName: title,
          memo,
          variables: { id: valueId, typeKeyValue: typeKeyValues }
        })
        navigate('/ota/settings/action')
      } catch (error) {
        console.error('Error saving action:', error)
      } finally {
        setIsLoading(false)
      }
    }
    save()
  }

  const handleVariableTypeChange = (value) => {
    setWorkingTKV({ type: value, key: '', value: '' })
  }

  const handleKeyChange = (value) => {
    setWorkingTKV({ ...workingTKV, key: value })
  }

  const handleValueChange = (value) => {
    setWorkingTKV({ ...workingTKV, value: value })
  }

  const handleAddVariable = () => {
    setTypeKeyValues([...typeKeyValues, workingTKV])
    setWorkingTKV({ type: '', key: '', value: '' })
  }

  const handleDeleteVariable = (index) => {
    if (typeKeyValues.length === 1) {
      setTypeKeyValues([])
    } else {
      setTypeKeyValues(typeKeyValues.filter((_, i) => i !== index))
    }
  }

  const handleCancel = () => {
    navigate('/ota/settings/action')
  }

  const isDisabled = () => {
    return (
      !title ||
      typeKeyValues.some((v) => {
        console.log(v)
        return !v.type || !v.key || v.value === undefined || v.value === null || v.value === ''
      })
    )
  }

  const typeKeyValueOptions = [
    { value: 'boolean', name: 'Boolean' },
    { value: 'string', name: 'String' },
    { value: 'number', name: 'Number' }
  ]

  const booleanOptions = [
    { value: true, name: 'True' },
    { value: false, name: 'False' }
  ]

  useEffect(() => {
    if (id) {
      const retrieveAction = async () => {
        try {
          const response = await actionApis.retrieveAction([Number(orgId)], id)
          const data = response.results[0]
          setTitle(data.displayName || '')
          setMemo(data.memo || '')
          if (data.Value) {
            setValueId(data.Value.id)
            setTypeKeyValues(data.Value.typeKeyValue)
          }
        } catch (error) {
          console.error('Error retrieving action:', error)
        } finally {
          setIsLoading(false)
        }
      }
      retrieveAction()
    } else {
      setIsLoading(false)
    }
  }, [id, orgId])

  return (
    <StyledPageContent className="column">
      <DetailHead>
        <div className="titleGroup">
          <Title>{id ? t('actionDetail') : t('actionCreation')}</Title>
          <span className="orgName typographyBody5">{`${tCommon('organizationName')} : ${actualOrgs && actualOrgs.length > 0 ? actualOrgs[0]?.displayName : ''}`}</span>
        </div>
        <ButtonWrap className="alignRight">
          <Button variant="contained" onClick={handleSave} disabled={isLoading || isDisabled()}>
            {t(id ? 'modify' : 'save')}
          </Button>
          <Button variant="contained" onClick={handleCancel} disabled={isLoading}>
            {t('cancel')}
          </Button>
        </ButtonWrap>
      </DetailHead>
      <Section gap="2.4rem">
        <Section gap="2.4rem">
          <div>
            <Input
              label={t('title')}
              size="lg"
              placeholder={t('enterTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
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
        <Section gap="1rem">
          <SectionTitle title={t('variableTitle')}>
            {/* <IconButton onClick={handleAddVariable} disabled={id}>
              <Icon name="add" size={24} />
            </IconButton> */}
          </SectionTitle>
          <VariableHeader className="typographyBody6">
            <span>{t('variableType')}</span>
            <span>{t('key')}</span>
            <span>{t('value')}</span>
            <span style={{ flex: '0 0 4.2rem' }}></span>
          </VariableHeader>
          <Section>
            <VariableRow>
              <DropdownContainer>
                <Dropdown
                  size="lg"
                  value={workingTKV.type}
                  placeholder={t('selectVariableType')}
                  options={typeKeyValueOptions}
                  onChange={(value) => handleVariableTypeChange(value)}
                />
              </DropdownContainer>
              <div style={{ flex: 1 }}>
                <Input
                  size="sm"
                  placeholder={t('enterKey')}
                  value={workingTKV.key}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  disabled={!workingTKV.type}
                />
              </div>
              <div style={{ flex: 1 }}>
                {workingTKV.type === 'boolean' ? (
                  <Dropdown
                    size="lg"
                    placeholder={t('selectVariableType')}
                    options={booleanOptions}
                    value={workingTKV.value}
                    disabled={!workingTKV.key}
                    onChange={(value) => handleValueChange(value)}
                  />
                ) : (
                  <Input
                    size="sm"
                    placeholder={t('enterValue')}
                    type={workingTKV.type === 'number' ? 'number' : 'text'}
                    value={workingTKV.value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    disabled={!workingTKV.key}
                    onKeyDown={(e) => e.key === 'Enter' && workingTKV.value && handleAddVariable()}
                  />
                )}
              </div>
              <div style={{ flex: '0 0 4.2rem', display: 'flex', justifyContent: 'center' }}>
                <IconButton onClick={() => handleAddVariable()} disabled={!workingTKV.value}>
                  <Icon name="add" size={24} />
                </IconButton>
              </div>
            </VariableRow>
          </Section>
          <Section gap="1.2rem">
            {typeKeyValues.map((typeKeyValue, index) => (
              <VariableRow key={`typeKeyValue-${index}`}>
                <div style={{ flex: 1 }}>
                  <Input size="sm" placeholder={t('selectVariableType')} value={typeKeyValue.type} disabled />
                </div>
                <div style={{ flex: 1 }}>
                  <Input size="sm" placeholder={t('enterKey')} value={typeKeyValue.key} disabled />
                </div>
                <div style={{ flex: 1 }}>
                  <Input size="sm" placeholder={t('enterValue')} value={typeKeyValue.value} disabled />
                </div>
                <div style={{ flex: '0 0 4.2rem', display: 'flex', justifyContent: 'center' }}>
                  <IconButton onClick={() => handleDeleteVariable(index)}>
                    <Icon name="subtract" size={24} />
                  </IconButton>
                </div>
              </VariableRow>
            ))}
          </Section>
        </Section>
      </Section>
    </StyledPageContent>
  )
}

export default ActionDetail
