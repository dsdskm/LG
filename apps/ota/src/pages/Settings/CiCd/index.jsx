import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import JSZip from 'jszip'
import {
  Modal,
  Search,
  Section,
  HeaderTitleGroup,
  SearchContainer,
  Title,
  StyledPageContent,
  TableLoading,
  OrganizationSelector,
  NoData,
  Button
} from '@repo/ui'
import DownloadScriptModal from '@/components/Settings/CiCd/DownloadScriptModal'
import GuideModal from '@/components/Settings/CiCd/GuideModal'
import { ClipLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { moduleApis } from '@/apis'
import ModuleTable from '@/components/Settings/CiCd/ModuleTable'
import { ButtonWrap } from '@/components/common/styles'

const CiCd = () => {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const { session } = useUserStore()
  const userRole = session?.userRole

  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [moduleSearch, setModuleSearch] = useState('')
  const [processingModule, setProcessingModule] = useState(null)
  const [isTemplateDownload, setIsTemplateDownload] = useState(false)
  const [isGuideModal, setIsGuideModal] = useState(false)
  const { company, allOrgs, selectedOrgs, actualOrgs } = useOrganizationStore()
  const [selectedModuleId, setSelectedModuleId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await moduleApis.retrieveModules(company.id)
      setData(response.results || [])
    } catch (error) {
      console.error('Failed to fetch modules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const orgIds = actualOrgs.map((org) => org.id).join(',')

  useEffect(() => {
    fetchData()
  }, [orgIds])

  const downloadCiTemplate = async (mode) => {
    try {
      setIsProcessing(true)
      const response = await moduleApis.fetchCiTemplate({ id: selectedModuleId, orgId: actualOrgs[0].id, mode })
      const fileContent = await fetch(response.results.url)
      const replacedContent = (await fileContent.text())
        .replaceAll('DYNAMIC_ECR_REPOSITORY_URI', response.results.repoUri)
        .replaceAll('DYNAMIC_ECR_REPOSITORY_NAME', response.results.repoUri.split('/').pop())

      const zip = new JSZip()
      zip.file('.gitlab-ci.yml', replacedContent)
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gitlab-ci.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(t('downloadFailed'), {
        autoClose: 2000
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTemplateDownload = (row) => {
    setSelectedModuleId(row.id)
    setIsTemplateDownload(true)
  }

  const downloadTemplate = async (row, templateMode) => {
    setIsTemplateDownload(false)
    const targetCicd = row?.Cicds?.find((cicd) => cicd.organizationId === findOrgIdByCode(selectedOrgs[0]))
    if (targetCicd && targetCicd.mode !== templateMode) {
      await moduleApis.requestActivateCi(
        targetCicd.id,
        true,
        company.id,
        findOrgIdByCode(selectedOrgs[0]),
        findOrgIdByCode(selectedOrgs[1]),
        row.id,
        templateMode
      )
    }
    await downloadCiTemplate(templateMode)
    toast.success(t('downloadComplete'), {
      autoClose: 2000
    })
  }

  const findOrgIdByCode = (code) => {
    return allOrgs.find((org) => org.code === code)?.id
  }

  const handleToggleChange = async (row) => {
    const targetCicd = row.Cicds.find((cicd) => cicd.organizationId === findOrgIdByCode(selectedOrgs[0]))
    if (!targetCicd) {
      setProcessingModule(row)
      try {
        await moduleApis.requestActivateCi(
          undefined,
          true,
          company.id,
          findOrgIdByCode(selectedOrgs[0]),
          findOrgIdByCode(selectedOrgs[1]),
          row.id,
          'development'
        )
        toast.success(t('moduleActivatedSuccessfully', { module: row.displayName || row.id }), {
          autoClose: 2000
        })
        fetchData()
        handleTemplateDownload(row)
      } catch (error) {
        console.error('Failed to activate module:', error)
      } finally {
        setProcessingModule(null)
      }
    }
  }

  const filteredData = useMemo(() => {
    const dockerTypeModules = data.filter((item) => item.PackageType.code === '0000')
    if (moduleSearch) {
      return (
        dockerTypeModules?.filter((item) =>
          (item.displayName || '').toLowerCase().includes(moduleSearch.toLowerCase())
        ) || []
      )
    }
    return dockerTypeModules
  }, [data, moduleSearch])

  return (
    <StyledPageContent className="column">
      <Title>{t('cicdSettingsTitle')}</Title>
      <OrganizationSelector
        supportAlls={[userRole === 'SYSTEM_MANAGER', false]}
        supportNone={[false, true]}
        allToTop={false}
        onChange={() => {
          fetchData()
        }}
      />
      <Section>
        <HeaderTitleGroup>
          <SearchContainer style={{ width: '300px' }}>
            <Search
              label={t('moduleName')}
              placeholder={t('searchModulePlaceholder')}
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
            />
          </SearchContainer>
          <ButtonWrap className="alignRight" style={{ marginBottom: '-2rem' }}>
            <Button variant="tertiary" size="md" onClick={() => setIsGuideModal(true)}>
              {t('guideTitle')}
            </Button>
          </ButtonWrap>
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count') || 'Count'} :{' '}
          {userRole !== 'SYSTEM_MANAGER' && actualOrgs.length !== 1 ? 0 : filteredData.length}
        </div>
        {isLoading ? (
          <TableLoading />
        ) : userRole !== 'SYSTEM_MANAGER' && actualOrgs.length !== 1 ? (
          <NoData>{t('selectOneOrg') || 'Select one org'}</NoData>
        ) : (
          <ModuleTable
            data={filteredData}
            handleToggleChange={handleToggleChange}
            templateDownload={handleTemplateDownload}
          />
        )}

        {/* Loading Modal for Activation */}
        <Modal isOpen={!!processingModule} size="xs">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <ClipLoader color={'#36d7b7'} loading={true} size={50} />
            <div style={{ marginTop: '20px' }}>
              {processingModule
                ? t(processingModule?.orgIds ? 'moduleDeactivating' : 'moduleActivating', {
                    module: processingModule.displayName || processingModule.id
                  })
                : ''}
            </div>
          </div>
        </Modal>
        <DownloadScriptModal
          isOpen={isTemplateDownload}
          moduleRow={filteredData.find((item) => item.id === selectedModuleId)}
          onCancel={() => setIsTemplateDownload(false)}
          onConfirm={downloadTemplate}
        />
        <GuideModal isOpen={isGuideModal} onConfirm={() => setIsGuideModal(false)} />
        <Modal isOpen={isProcessing} size="xs">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <ClipLoader color={'#36d7b7'} loading={true} size={50} />
            <div style={{ marginTop: '20px' }}>{t('processing')}</div>
          </div>
        </Modal>
      </Section>
    </StyledPageContent>
  )
}

export default CiCd
