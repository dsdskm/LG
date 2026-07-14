import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  StyledPageContent,
  Section,
  HeaderTitleGroup,
  Dropdown,
  Search,
  SearchContainer,
  Button,
  Radio,
  Title,
  Input,
  Textarea,
  Modal
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import ArtifactTable from '@/components/Artifact/ArtifactTable'
import { actionApis, campaignApis, targetGroupApis, policyApis, moduleApis } from '@/apis'
import { artifactApis } from '@repo/apis'
import { toast } from 'react-toastify'
import { convertDateToString } from '@repo/utils'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { DropdownContainer } from './styles'
import { ButtonWrap, PageHeadWrap } from '@/components/common/styles'
import { ClipLoader } from 'react-spinners'
import { ARTIFACT_STATUS } from '@/constants/artifact'

const CampaignDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation('campaign')
  const { t: tCommon } = useTranslation('common')
  const session = useUserStore((state) => state.session)
  const { allOrgs, actualOrgs, company, defaultOrg } = useOrganizationStore()

  const orgIdParam = new URLSearchParams(window.location.search).get('orgId')
  const currentOrg = useMemo(() => allOrgs.concat(defaultOrg).find((o) => o.id === Number(orgIdParam)), [defaultOrg])

  const navigate = useNavigate()

  const [processedArtifactData, setProcessedArtifactData] = useState([])
  const handleRowClick = (row) => {
    console.log(row)
    setSelectedArtifactId(row.id)
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [targetGroupOptions, setTargetGroupOptions] = useState([])
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState('')
  const [selectedPolicyId, setSelectedPolicyId] = useState('')
  const [selectedPostActionId, setSelectedPostActionId] = useState('')
  const [selectedPreActionId, setSelectedPreActionId] = useState('')
  const [selectedArtifactId, setSelectedArtifactId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [memo, setMemo] = useState('')
  const [policyOptions, setPolicyOptions] = useState([])
  const [actionOptions, setActionOptions] = useState([])
  const [moduleOptions, setModuleOptions] = useState([])
  const [organizationOptions, setOrganizationOptions] = useState([])
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDeploying, setIsDeploying] = useState(false)
  const [allModules, setAllModules] = useState([])
  const [jobStatus, setJobStatus] = useState(null)

  const tableHeader = () => {
    return {
      columns: [
        {
          name: '',
          cell: (row) => (
            <Radio
              checked={Number(row.id) === Number(selectedArtifactId)}
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
    const matchesOrg = item.Organization.id === selectedOrganizationId
    const matchesModule =
      !selectedModuleId || selectedModuleId === 'all' || Number(item.Module?.id) === Number(selectedModuleId)
    const completed = item.status === ARTIFACT_STATUS.SUCCESS

    return matchesSearch && matchesOrg && matchesModule && completed
  })

  const handleSave = async (isRequest = false) => {
    try {
      const payload = {
        ...(id && { id: Number(id) }),
        displayName, // Mandatory
        userId: session.email, // Mandatory
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
      toast.error(tCommon('error'), { autoClose: 2000 })
    }
  }

  const handleRequest = async () => {
    try {
      const campaignId = await handleSave(true)

      if (!campaignId) {
        toast.error(tCommon('error'), { autoClose: 2000 })
        return
      }

      setIsDeploying(true)
      await campaignApis.requestCampaign({ id: campaignId, userId: session.email })
      navigate('/ota/campaign')
      toast.success(tCommon('success'), { autoClose: 2000 })
    } catch (error) {
      console.error(error)
      toast.error(tCommon('error'), { autoClose: 2000 })
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
        if (actualOrgs.length === 0 && session.userRole !== 'SYSTEM_MANAGER') return

        const actualOrgIds =
          session.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0
            ? [...allOrgs, defaultOrg].map((org) => org.id)
            : actualOrgs.map((org) => org.id)

        const [groupRes, policyRes, actionRes, artifactRes, moduleRes] = await Promise.all([
          targetGroupApis.retrieveTargetGroup(actualOrgIds),
          policyApis.retrievePolicy(actualOrgIds),
          actionApis.retrieveAction(actualOrgIds),
          artifactApis.retrieveArtifacts(actualOrgIds),
          moduleApis.retrieveModules(company.id)
        ])

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
            setDisplayName(campaign.displayName)
            setMemo(campaign.memo)
            setSelectedTargetGroupId(campaign.TargetGroup?.id)
            setSelectedPostActionId(campaign.postAction?.id)
            setSelectedPreActionId(campaign.preAction?.id)
            setSelectedPolicyId(campaign.Policy?.id)
            setSelectedModuleId(campaign.Module?.id)
            setSelectedOrganizationId(campaign.Organization?.id)
            setSelectedArtifactId(campaign.Artifact?.id)
            setJobStatus(campaign.jobStatus)
          }
        }
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }

    fetchData()
  }, [id, actualOrgs])

  return (
    <StyledPageContent className="column">
      <Title>
        {t('campaign')} &gt; {tCommon('detail')}
      </Title>
      <PageHeadWrap>
        <div>{`${tCommon('organizationName')} : ${currentOrg?.displayName}`}</div>
        <ButtonWrap className="alignRight">
          <Button onClick={() => handleRequest()} disabled={isDeployDisabled()}>
            {t('request')}
          </Button>
          <Button onClick={() => handleSave(false)} disabled={isSaveDisabled()}>
            {t('save')}
          </Button>
          <Button onClick={() => handleCancel()}>{t('cancel')}</Button>
        </ButtonWrap>
      </PageHeadWrap>
      <Section gap="2.4rem">
        <Section gap="2.4rem">
          <Input
            label={t('title')}
            size="lg"
            placeholder={t('enterTitle')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
        <Section>
          <DropdownContainer>
            <Dropdown
              label={t('targetGroup')}
              size="lg"
              value={selectedTargetGroupId}
              placeholder={t('selectTargetGroup')}
              minWidth="200px"
              options={targetGroupOptions}
              disabled={id}
              onChange={handleGroupChange}
            />
            <Dropdown
              label={t('policy')}
              size="lg"
              value={selectedPolicyId}
              placeholder={t('selectPolicy')}
              minWidth="200px"
              options={policyOptions}
              disabled={id}
              onChange={handlePolicyChange}
            />
            <Dropdown
              label={t('preAction')}
              size="lg"
              value={selectedPreActionId}
              placeholder={t('selectAction')}
              minWidth="200px"
              options={actionOptions}
              disabled={id}
              onChange={handlePreActionChange}
            />
            <Dropdown
              label={t('postAction')}
              size="lg"
              value={selectedPostActionId}
              placeholder={t('selectAction')}
              minWidth="200px"
              options={actionOptions}
              disabled={id}
              onChange={handlePostActionChange}
            />
          </DropdownContainer>
        </Section>
        <Section gap="2.4rem">
          <HeaderTitleGroup>
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
                label={t('search')}
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
        </Section>
        <Modal isOpen={isDeploying} size="xs">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <ClipLoader color={'#36d7b7'} loading={true} size={50} />
            <div style={{ marginTop: '20px' }}>{t('deploying')}</div>
          </div>
        </Modal>
      </Section>
    </StyledPageContent>
  )
}

export default CampaignDetail
