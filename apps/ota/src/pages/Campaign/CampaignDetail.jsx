import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  StyledPageContent,
  Section,
  SectionTitle,
  HeaderTitleGroup,
  Dropdown,
  Search,
  SearchContainer,
  Button,
  Radio,
  Title,
  Input,
  Textarea,
  Modal,
  Icon,
  StyledTag
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import ArtifactTable from '@/components/Artifact/ArtifactTable'
import { actionApis, campaignApis, targetGroupApis, policyApis, moduleApis, packageTypeApis } from '@/apis'
import { artifactApis } from '@repo/apis'
import { toast } from 'react-toastify'
import { convertDateToString } from '@repo/utils'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { ArtifactPickerBody, DetailCardRow, FieldGroup, InfoList, PickerField } from './styles'
import { ButtonWrap, DetailHead } from '@/components/common/styles'
import { ClipLoader } from 'react-spinners'
import { ARTIFACT_STATUS } from '@/constants/artifact'
import { DEPLOYMENT_STATUS } from '@/constants/campaign'
import { statusToColor, statusToBgColor } from '@/utils/common'

const COMPLETED_DEPLOYMENT_STATUS = [
  DEPLOYMENT_STATUS.SUCCEEDED,
  DEPLOYMENT_STATUS.FAILED,
  DEPLOYMENT_STATUS.REJECTED,
  DEPLOYMENT_STATUS.TIMED_OUT,
  DEPLOYMENT_STATUS.CANCELED,
  DEPLOYMENT_STATUS.REMOVED
]

const FAILED_DEPLOYMENT_STATUS = [DEPLOYMENT_STATUS.FAILED, DEPLOYMENT_STATUS.REJECTED, DEPLOYMENT_STATUS.TIMED_OUT]

const formatDate = (value) => (value ? convertDateToString(value) : '-')

const CampaignDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation('campaign')
  const { t: tCommon } = useTranslation('common')
  const session = useUserStore((state) => state.session)
  const userId = session?.email
  const userRole = session?.userRole
  const { allOrgs, actualOrgs, company, defaultOrg } = useOrganizationStore()

  const orgIdParam = new URLSearchParams(window.location.search).get('orgId')
  const currentOrg = useMemo(() => allOrgs.concat(defaultOrg).find((o) => o.id === Number(orgIdParam)), [defaultOrg])

  const navigate = useNavigate()

  const [processedArtifactData, setProcessedArtifactData] = useState([])
  const handleRowClick = (row) => {
    setPendingArtifactId(row.id)
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [targetGroupOptions, setTargetGroupOptions] = useState([])
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState('')
  const [selectedPolicyId, setSelectedPolicyId] = useState('')
  const [selectedPostActionId, setSelectedPostActionId] = useState('')
  const [selectedPreActionId, setSelectedPreActionId] = useState('')
  const [selectedArtifactId, setSelectedArtifactId] = useState('')
  const [selectedPackageTypeId, setSelectedPackageTypeId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [memo, setMemo] = useState('')
  const [policyOptions, setPolicyOptions] = useState([])
  const [actionOptions, setActionOptions] = useState([])
  const [moduleOptions, setModuleOptions] = useState([])
  const [packageTypeOptions, setPackageTypeOptions] = useState([])
  const [organizationOptions, setOrganizationOptions] = useState([])
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDeploying, setIsDeploying] = useState(false)
  const [allModules, setAllModules] = useState([])
  const [jobStatus, setJobStatus] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [isArtifactModalOpen, setIsArtifactModalOpen] = useState(false)
  const [pendingArtifactId, setPendingArtifactId] = useState('')

  const tableHeader = () => {
    return {
      columns: [
        {
          name: '',
          cell: (row) => (
            <Radio
              checked={Number(row.id) === Number(pendingArtifactId)}
              onChange={() => handleRowClick(row)}
              disabled={id}
            />
          ),
          width: '50px'
        },
        {
          name: t('title'),
          selector: (row) => (
            <Button as={'NavLink'} to={`/ota/artifact/detail/${row.id}`} theme={'link'}>
              {row.displayName}
            </Button>
          ),
          sortable: 'true'
        },
        {
          name: t('module'),
          selector: (row) => row.Module.displayName,
          sortable: 'true'
        },
        {
          name: t('packageType'),
          selector: (row) => allModules.find((item) => item.code === row.Module.code)?.PackageType?.displayName,
          sortable: 'true'
        },
        {
          name: t('organization'),
          selector: (row) => row.Organization.displayName,
          sortable: 'true'
        },
        {
          name: t('date'),
          selector: (row) => row.createdAt,
          sortable: 'true'
        }
      ]
    }
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleModuleChange = (value) => {
    setSelectedModuleId(value)
  }

  const handlePackageTypeChange = (value) => {
    setSelectedPackageTypeId(value)
    setModuleOptions(
      allModules
        .filter((module) => module.PackageType.id === Number(value))
        .map((item) => ({
          name: item.displayName,
          value: item.id
        }))
    )
  }

  const handleOrganizationChange = (value) => {
    setSelectedOrganizationId(value)
  }

  const handleGroupChange = (value) => {
    setSelectedTargetGroupId(value)
  }

  const handlePostActionChange = (value) => {
    setSelectedPostActionId(value)
  }

  const handlePreActionChange = (value) => {
    setSelectedPreActionId(value)
  }

  const handlePolicyChange = (value) => {
    setSelectedPolicyId(value)
  }

  const filteredArtifactData = processedArtifactData.filter((item) => {
    const matchesSearch = item.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesOrg =
      !selectedOrganizationId ||
      selectedOrganizationId === 'all' ||
      Number(item.Organization.id) === Number(selectedOrganizationId)
    const matchesModule =
      !selectedModuleId || selectedModuleId === 'all' || Number(item.Module?.id) === Number(selectedModuleId)
    const completed = item.status === ARTIFACT_STATUS.SUCCESS
    const matchesPackageType = item.Module.packageTypeId === Number(selectedPackageTypeId)

    return matchesSearch && matchesOrg && matchesModule && completed && matchesPackageType
  })

  const selectedTargetGroup = targetGroupOptions.find(
    (option) => Number(option.value) === Number(selectedTargetGroupId)
  )?.origin

  const selectedArtifact =
    processedArtifactData.find((item) => Number(item.id) === Number(selectedArtifactId)) || campaign?.Artifact

  const artifactVersion = selectedArtifact?.Versions?.map((version) => version.displayName).join(', ') || '-'

  // 롤아웃 진행 상황 : 캠페인 응답에 디바이스 목록이 있으면 그 기준, 없으면 타겟 그룹 대수만 노출
  const deployedDevices = campaign?.TargetGroup?.Devices || []
  const totalUnits = deployedDevices.length || selectedTargetGroup?.deviceCount || 0
  const completedUnits = deployedDevices.filter((device) =>
    COMPLETED_DEPLOYMENT_STATUS.includes(device.jobExecutionStatus)
  ).length
  const failedUnits = deployedDevices.filter((device) =>
    FAILED_DEPLOYMENT_STATUS.includes(device.jobExecutionStatus)
  ).length

  const handleOpenArtifactModal = () => {
    if (id) return
    setPendingArtifactId(selectedArtifactId)
    setIsArtifactModalOpen(true)
  }

  const handleCloseArtifactModal = () => {
    setIsArtifactModalOpen(false)
  }

  const handleConfirmArtifact = () => {
    setSelectedArtifactId(pendingArtifactId)
    setIsArtifactModalOpen(false)
  }

  const handleSave = async (isRequest = false) => {
    try {
      const payload = {
        ...(id && { id: Number(id) }),
        displayName, // Mandatory
        userId, // Mandatory
        memo, // Optional
        orgId: currentOrg.id, // Mandatory
        targetGroupId: selectedTargetGroupId || undefined, // Mandatory
        policyId: selectedPolicyId || undefined, // Mandatory
        artifactId: selectedArtifactId, // Mandatory
        preActionId: selectedPreActionId || undefined, // Optional
        postActionId: selectedPostActionId || undefined // Optional
      }
      const saveResponse = await campaignApis.saveCampaign(payload)
      console.log('saveResponse', saveResponse)
      if (isRequest) {
        return saveResponse.results[0].id
      }
      navigate('/ota/campaign')
      toast.success(tCommon('success'), { autoClose: 2000 })
    } catch (error) {
      console.error(error)
      toast.error(tCommon('error.description'), { autoClose: 2000 })
    }
  }

  const handleRequest = async () => {
    try {
      const campaignId = await handleSave(true)

      if (!campaignId) {
        toast.error(tCommon('error.description'), { autoClose: 2000 })
        return
      }

      setIsDeploying(true)
      await campaignApis.requestCampaign({ id: campaignId, userId })
      navigate('/ota/campaign')
      toast.success(tCommon('success'), { autoClose: 2000 })
    } catch (error) {
      console.error(error)
      toast.error(tCommon('error.description'), { autoClose: 2000 })
    } finally {
      setIsDeploying(false)
    }
  }

  const handleCancel = () => {
    console.log('cancel')
    navigate('/ota/campaign')
  }

  const isDeployDisabled = () => {
    return !displayName || !selectedTargetGroupId || !selectedArtifactId || jobStatus
  }

  const isSaveDisabled = () => {
    return !displayName
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // defaultOrg 초기값이 {} 이므로 id 없는 조직(미로딩)은 제외한다
        const actualOrgIds = (userRole === 'SYSTEM_MANAGER' ? [...allOrgs, defaultOrg] : actualOrgs)
          .map((org) => org?.id)
          .filter((orgId) => orgId !== undefined && orgId !== null)

        if (actualOrgIds.length === 0) {
          setIsLoading(false)
          return
        }

        const [packageTypeRes, groupRes, policyRes, actionRes, artifactRes, moduleRes] = await Promise.all([
          packageTypeApis.retrievePackageTypes(company.id),
          targetGroupApis.retrieveTargetGroup(actualOrgIds),
          policyApis.retrievePolicy(actualOrgIds),
          actionApis.retrieveAction(actualOrgIds),
          artifactApis.retrieveArtifacts(actualOrgIds),
          moduleApis.retrieveModules(company.id)
        ])

        const ptOptions = packageTypeRes.results.map((item) => ({
          name: item.displayName,
          value: item.id,
          origin: item
        }))
        setPackageTypeOptions(ptOptions)

        const groupOptions = groupRes.results
          .filter((item) => item.campaignType === 'update')
          .map((item) => ({
            name: item.displayName,
            value: item.id,
            origin: item
          }))
        setTargetGroupOptions(groupOptions)

        const policyOptionsFetched = policyRes.results.map((item) => ({
          name: item.displayName,
          value: item.id,
          origin: item
        }))
        setPolicyOptions(policyOptionsFetched)

        const actionOptionsFetched = actionRes.results.map((item) => ({
          name: item.displayName,
          value: item.id,
          origin: item
        }))
        setActionOptions(actionOptionsFetched)

        setProcessedArtifactData(
          artifactRes.results.map((item) => ({
            ...item,
            module: item.Module.displayName,
            packageType: item.PackageType?.displayName,
            organization: item.Organization.displayName,
            createdAt: item.createdAt ? convertDateToString(item.createdAt) : '-'
          }))
        )

        setAllModules(moduleRes.results)

        const mOptions = moduleRes.results.map((item) => ({
          name: item.displayName,
          value: item.id
        }))
        setModuleOptions(mOptions.length > 0 ? [{ name: t('all'), value: 'all' }, ...mOptions] : [])

        setOrganizationOptions([
          { name: t('all'), value: 'all' },
          ...allOrgs.map((item) => ({
            name: item.displayName,
            value: item.id
          }))
        ])

        if (id) {
          const campaignResponse = await campaignApis.retrieveCampaign([Number(orgIdParam)], id)
          const campaign = campaignResponse.results.pageCampaign[0]
          if (campaign) {
            setCampaign(campaign)
            setDisplayName(campaign.displayName)
            setMemo(campaign.memo)
            setSelectedTargetGroupId(campaign.TargetGroup?.id)
            setSelectedPostActionId(campaign.postAction?.id)
            setSelectedPreActionId(campaign.preAction?.id)
            setSelectedPolicyId(campaign.Policy?.id)
            setSelectedModuleId(campaign.Module?.id)
            setSelectedOrganizationId(campaign.Organization?.id)
            setSelectedArtifactId(campaign.Artifact?.id)
            setPendingArtifactId(campaign.Artifact?.id)
            setJobStatus(campaign.jobStatus)
          }
        }
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }

    fetchData()
  }, [id, actualOrgs, allOrgs])

  return (
    <StyledPageContent className="column">
      <DetailHead>
        <div className="titleGroup">
          <Title>{id ? t('campaignDetail') : t('campaignCreation')}</Title>
          <span className="orgName typographyBody5">{`${tCommon('organizationName')} : ${currentOrg?.displayName || ''}`}</span>
        </div>
        <ButtonWrap className="alignRight">
          <Button onClick={() => handleRequest()} disabled={isDeployDisabled()}>
            {t('request')}
          </Button>
          <Button onClick={() => handleSave(false)} disabled={isSaveDisabled()}>
            {t('save')}
          </Button>
          <Button onClick={() => handleCancel()}>{t('cancel')}</Button>
        </ButtonWrap>
      </DetailHead>
      <DetailCardRow $columns="minmax(0, 2fr) minmax(0, 1fr)">
        <Section gap="1.6rem">
          <SectionTitle title={t('campaignDetails')} />
          <Input
            label={t('campaignName')}
            size="lg"
            placeholder={t('enterTitle')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Textarea
            label={t('description')}
            size="lg"
            placeholder={t('enterDescription')}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            count={`${memo.length}/100`}
            maxLength={100}
          />
        </Section>
        <Section>
          <SectionTitle title={t('updateStatus')} />
          <InfoList>
            <dt>{t('status')}</dt>
            <dd>
              <StyledTag color={statusToColor(jobStatus)} bgColor={statusToBgColor(jobStatus)}>
                {jobStatus || t('notDeployed')}
              </StyledTag>
            </dd>
            <dt>{t('step')}</dt>
            <dd>{campaign?.totalStep ? `${campaign.currentStep ?? 0} / ${campaign.totalStep}` : '-'}</dd>
            <dt>{t('rolloutProgress')}</dt>
            <dd>
              {`${completedUnits} / ${totalUnits}`}
              <span className="failedCount">{`· ${failedUnits} ${t('failed')}`}</span>
            </dd>
            {/* <dt>{t('rolloutVersion')}</dt>
            <dd>{artifactVersion}</dd> */}
            <dt>{t('startedAt')}</dt>
            <dd>{formatDate(campaign?.requestAt)}</dd>
            <dt>{t('lastUpdated')}</dt>
            <dd>{formatDate(campaign?.updatedAt)}</dd>
            <dt>{t('completedAt')}</dt>
            <dd>{formatDate(campaign?.completeAt)}</dd>
          </InfoList>
        </Section>
      </DetailCardRow>
      <DetailCardRow $columns="repeat(3, minmax(0, 1fr))">
        <Section gap="1.6rem">
          <SectionTitle title={t('targetGroup')} />
          <Dropdown
            label={t('name')}
            size="lg"
            value={selectedTargetGroupId}
            placeholder={t('selectTargetGroup')}
            options={targetGroupOptions}
            disabled={id}
            onChange={handleGroupChange}
          />
          <InfoList>
            <dt>{t('units')}</dt>
            <dd>{selectedTargetGroup?.deviceCount ?? '-'}</dd>
            <dt>{t('mode')}</dt>
            <dd>{selectedTargetGroup?.mode ? t(selectedTargetGroup.mode) : '-'}</dd>
            <dt>{t('lastUpdated')}</dt>
            <dd>{formatDate(selectedTargetGroup?.updatedAt)}</dd>
          </InfoList>
        </Section>
        <Section gap="1.6rem">
          <SectionTitle title={t('artifact')} />
          <PickerField $disabled={!!id} onClick={handleOpenArtifactModal}>
            <Input
              label={t('name')}
              size="lg"
              readOnly
              placeholder={t('selectArtifact')}
              value={selectedArtifact?.displayName || ''}
              disabled={!!id}
              unit={<Icon name="search" size={20} />}
            />
          </PickerField>
          <InfoList>
            <dt>{t('module')}</dt>
            <dd>{selectedArtifact?.Module?.displayName || '-'}</dd>
            <dt>{t('version')}</dt>
            <dd>{artifactVersion}</dd>
            <dt>{t('lastUpdated')}</dt>
            <dd>{formatDate(selectedArtifact?.updatedAt)}</dd>
          </InfoList>
        </Section>
        <Section gap="1.6rem">
          <SectionTitle title={t('rolloutSettings')} />
          <FieldGroup>
            <Dropdown
              label={t('timeoutPolicy')}
              size="lg"
              value={selectedPolicyId}
              placeholder={t('selectPolicy')}
              options={policyOptions}
              disabled={id}
              onChange={handlePolicyChange}
            />
            <Dropdown
              label={t('preAction')}
              size="lg"
              value={selectedPreActionId}
              placeholder={t('notSet')}
              options={actionOptions}
              disabled={id}
              onChange={handlePreActionChange}
            />
            <Dropdown
              label={t('postAction')}
              size="lg"
              value={selectedPostActionId}
              placeholder={t('notSet')}
              options={actionOptions}
              disabled={id}
              onChange={handlePostActionChange}
            />
          </FieldGroup>
        </Section>
      </DetailCardRow>
      <Modal
        isOpen={isArtifactModalOpen}
        size="xl"
        title={t('selectArtifact')}
        closeButton
        onClose={handleCloseArtifactModal}
        renderButtonComponent={
          <>
            <Button theme="secondary" onClick={handleCloseArtifactModal}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleConfirmArtifact} disabled={!pendingArtifactId}>
              {tCommon('confirm')}
            </Button>
          </>
        }
      >
        <ArtifactPickerBody>
          <HeaderTitleGroup>
            <Dropdown
              label={t('packageType')}
              size="lg"
              minWidth="200px"
              value={selectedPackageTypeId}
              placeholder={t('selectPackageType')}
              options={packageTypeOptions}
              disabled={id}
              onChange={handlePackageTypeChange}
            />
            <Dropdown
              label={t('module')}
              size="lg"
              minWidth="200px"
              value={selectedModuleId}
              placeholder={t('selectModule')}
              options={moduleOptions}
              disabled={id}
              onChange={handleModuleChange}
            />
            <Dropdown
              label={t('organization')}
              size="lg"
              minWidth="200px"
              value={selectedOrganizationId}
              placeholder={t('selectOrganization')}
              options={organizationOptions}
              disabled={id}
              onChange={handleOrganizationChange}
            />
            <SearchContainer>
              <Search
                label={tCommon('search')}
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={tCommon('searchPlaceHolder')}
                disabled={id}
                onReset={handleResetSearch}
              />
            </SearchContainer>
          </HeaderTitleGroup>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <ClipLoader color={'#36d7b7'} loading={true} size={50} />
            </div>
          ) : (
            <ArtifactTable
              data={filteredArtifactData}
              disabled={id}
              columns={tableHeader().columns}
              noData={tCommon('noData')}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
            />
          )}
        </ArtifactPickerBody>
      </Modal>
      <Modal isOpen={isDeploying} size="xs">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <ClipLoader color={'#36d7b7'} loading={true} size={50} />
          <div style={{ marginTop: '20px' }}>{t('deploying')}</div>
        </div>
      </Modal>
    </StyledPageContent>
  )
}

export default CampaignDetail
