import React, { useState, useEffect } from 'react'
import { StyledPageContent, Section, Title, Button, Input, Textarea, Dropdown, TransferList } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { moduleApis, deviceTypeApis, packageTypeApis } from '@/apis'
import { toast } from 'react-toastify'
import { ButtonWrap } from '@/components/common/styles'
import { useOrganizationStore } from '@repo/stores'

const ModuleSettingsDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()

  const [moduleName, setModuleName] = useState('')
  const [memo, setMemo] = useState('')
  const [packagingId, setPackagingId] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [packagingOptions, setPackagingOptions] = useState([])
  const [availableDeviceTypes, setAvailableDeviceTypes] = useState([])
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState([])
  const [selectedDeployStrategy, setSelectedDeployStrategy] = useState(null)
  const [deployStrategyOptions, setDeployStrategyOptions] = useState([])
  const [allDeployStrategy, setAllDeployStrategy] = useState([])
  const { company } = useOrganizationStore()

  const handleSave = () => {
    const selectedPackageType = packagingOptions.find((p) => String(p.id) === String(packagingId))
    moduleApis
      .saveModule({
        ...(id && { id: Number(id) }),
        displayName: moduleName,
        memo: memo,
        code: code,
        companyId: company.id,
        packageTypeId: selectedPackageType.id,
        deployStrategyId: selectedDeployStrategy.id,
        deviceTypeIds: selectedDeviceTypes.map((dt) => dt.id)
      })
      .then(() => {
        toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
        navigate('/ota/settings/module')
      })
      .catch((error) => {
        console.error(error)
        toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
      })
  }

  const handleCancel = () => {
    navigate('/ota/settings/module')
  }

  const isDisabled = () => {
    return !moduleName || !packagingId || !code
  }

  const handleTransferChange = (nextAvailable, nextSelected) => {
    setAvailableDeviceTypes(nextAvailable)
    setSelectedDeviceTypes(nextSelected)
  }

  const handleSelectDeployConfig = (id) => {
    const selectedConfig = allDeployStrategy.find((config) => String(config.id) === String(id))
    setSelectedDeployStrategy(selectedConfig)
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch Replacement Options
        const deployStrategyRes = await moduleApis.retrieveDeployStrategy(company.id)
        console.log('deployStrategyRes', deployStrategyRes)
        const allStrategy = deployStrategyRes.results
        setAllDeployStrategy(allStrategy)
        setDeployStrategyOptions(allStrategy.map((item) => ({ value: item.id, name: item.displayName })) || [])

        // Fetch Packaging Options
        const pkgRes = await packageTypeApis.retrievePackageTypes(company.id)
        setPackagingOptions(pkgRes.results || [])

        let initialSelected = []
        if (id) {
          console.log('allStrategy', allStrategy)
          const moduleRes = await moduleApis.retrieveModules(company.id, id)
          const moduleData = Array.isArray(moduleRes.results) ? moduleRes.results[0] : moduleRes.results
          if (moduleData) {
            setModuleName(moduleData.displayName || '')
            setMemo(moduleData.memo || '')
            setPackagingId(moduleData.PackageType?.id || '')
            setSelectedDeployStrategy(
              allStrategy.find((strategy) => strategy.id === moduleData.DeployStrategy?.id) || null
            )
            setCode(moduleData.code || '')
            initialSelected = moduleData.DeviceTypes.map((dt) => ({ id: dt.id, displayName: dt.displayName })) || []
          }
        }

        // Fetch Device Types
        const dtRes = await deviceTypeApis.retrieveDeviceTypes(company.id)
        const allDeviceTypes = dtRes.results || []

        const selectedIds = new Set(initialSelected.map((dt) => dt.id))
        setAvailableDeviceTypes(allDeviceTypes.filter((dt) => !selectedIds.has(dt.id)))
        setSelectedDeviceTypes(initialSelected)
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
        {t('moduleSettingsTitle', 'Module Settings')} &gt; {tCommon('detail')}
      </Title>
      <ButtonWrap className="alignRight">
        <Button variant="contained" onClick={handleSave} disabled={isLoading || isDisabled()}>
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
              label={t('moduleName')}
              size="lg"
              placeholder={t('enterModuleName')}
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
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
        {/* Section 2: Packaging Dropdown + Code Input */}
        <Section horizontal gap="2.4rem">
          <div style={{ flex: 1 }}>
            <Dropdown
              label={t('packaging', 'Packaging')}
              minWidth="200px"
              size="md"
              placeholder={t('selectPackaging')}
              options={packagingOptions.map((p) => ({ value: p.id, name: p.displayName }))}
              value={packagingId}
              onChange={(val) => setPackagingId(val)}
              disabled={!!id}
            />
          </div>
          <div style={{ flex: 1, width: '200px' }}>
            <Input
              label={t('code', 'Code')}
              size="sm"
              placeholder={t('enterCode', 'Enter Code')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={!!id}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Dropdown
              label={t('moduleDeployStrategy')}
              size="md"
              value={selectedDeployStrategy?.id}
              placeholder={t('selectModuleDeployStrategy')}
              options={deployStrategyOptions}
              onChange={handleSelectDeployConfig}
              disabled={!!id}
            />
          </div>
        </Section>

        {/* Section 3: Device Type TransferList */}
        <TransferList
          title={t('appliedDeviceType')}
          availableItems={availableDeviceTypes}
          selectedItems={selectedDeviceTypes}
          onChange={handleTransferChange}
          searchPlaceholder={tCommon('searchPlaceHolder', 'Search...')}
        />
      </Section>
    </StyledPageContent>
  )
}

export default ModuleSettingsDetail
