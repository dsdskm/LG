import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { ClipLoader } from 'react-spinners'
import {
  StyledPageContent,
  Section,
  Title,
  Dropdown,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Button,
  NoData,
  Icon,
  UITooltip,
  CircleProgressBar,
  OrganizationSelector,
  Modal,
  StyledTag,
  StateStatusCard
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { campaignApis, deviceApis, mqttApis } from '@/apis'
import CampaignTable from '@/components/Campaign/CampaignTable'
import { useNavigate } from 'react-router-dom'
import { convertDateToString } from '@repo/utils'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { CAMPAIGN_STATUS, DEPLOYMENT_STATUS } from '@/constants/campaign'
import { useMqtt } from '@repo/hooks'
import { ButtonWrap } from '@/components/common/styles'
import { statusToColor, statusToBgColor } from '@/utils/common'
import CampaignInfoTooltipContent from '@/components/Campaign/CampaignTooltipContent'
import { StateStatusList } from './styles'

const completeStatus = [
  DEPLOYMENT_STATUS.SUCCEEDED,
  DEPLOYMENT_STATUS.FAILED,
  DEPLOYMENT_STATUS.REJECTED,
  DEPLOYMENT_STATUS.TIMED_OUT,
  DEPLOYMENT_STATUS.CANCELED,
  DEPLOYMENT_STATUS.REMOVED
]

const hoverStyles = {
  rows: {
    highlightOnHoverStyle: {
      backgroundColor: 'var(--color-neutral-20)',
      transitionDuration: '0.15s',
      transitionProperty: 'background-color'
    }
  }
}

const calculateProgress = (devices) => {
  if (!devices || !Array.isArray(devices) || devices.length === 0) {
    return 0
  }
  const total = devices.length
  const completed = devices.filter((device) => completeStatus.includes(device.jobExecutionStatus)).length
  return Math.round((completed / total) * 100) || 0
}

const Campaign = () => {
  const { t } = useTranslation('campaign')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const { actualOrgs, allOrgs, defaultOrg } = useOrganizationStore()
  const { session } = useUserStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [countOfStatus, setCountOfStatus] = useState({})

  const campaignStatusOptions = [
    { value: 'all', name: t('all') },
    { value: CAMPAIGN_STATUS.IN_PROGRESS, name: CAMPAIGN_STATUS.IN_PROGRESS },
    { value: CAMPAIGN_STATUS.COMPLETED, name: CAMPAIGN_STATUS.COMPLETED }
  ]

  const [activeCampaignTooltip, setActiveCampaignTooltip] = useState(null)

  const columns = useMemo(
    () =>
      [
        {
          name: t('campaignName'),
          selector: (row) => row.displayName,
          sortable: 'true',
          grow: 1.5
        },
        {
          name: t('organizationName'),
          selector: (row) => row.Organization.displayName,
          sortable: 'true',
          grow: 1.5
        },
        {
          name: t('artifact'),
          selector: (row) => row.Artifact.displayName,
          sortable: 'true',
          grow: 2
        },
        {
          name: t('memo'),
          selector: (row) => row.memo,
          sortable: 'true'
        },
        {
          name: t('setting'),
          selector: (row) => row.id,
          cell: (row) => (
            <div
              style={{ display: 'flex', justifyContent: 'center' }}
              data-tooltip-id="campaign-info"
              data-tooltip-title={t('setting')}
              onMouseEnter={() => setActiveCampaignTooltip(row)}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="info" size={20} />
            </div>
          ),
          minWidth: '100px',
          grow: 0
        },
        {
          name: t('status'),
          selector: (row) => (
            <StyledTag color={statusToColor(row.jobStatus)} bgColor={statusToBgColor(row.jobStatus)}>
              {row.jobStatus || 'NOT DEPLOYED'}
            </StyledTag>
          ),
          sortFunction: (a, b) => {
            if (!a.jobStatus && !b.jobStatus) return 0
            if (!a.jobStatus) return -1
            if (!b.jobStatus) return 1
            return a.jobStatus.localeCompare(b.jobStatus)
          },
          width: '150px'
        },
        {
          name: t('progress'),
          selector: (row) => <CircleProgressBar percentage={row.progress} showPercentage={true} />,
          minWidth: '50px',
          grow: 0.5
        },
        {
          name: t('device'),
          selector: (row) => row.manage,
          width: '100px'
        },
        {
          name: t('date'),
          selector: (row) => row.createdAt,
          sortable: 'true',
          width: '140px'
        }
      ].filter(Boolean),
    [t]
  )

  const [processedData, setProcessedData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterQuery, setFilterQuery] = useState('all')
  const [orgFilter, setOrgFilter] = useState({ actualOrgs: [], matchesOrg: () => false })
  const [initialOrg, setInitialOrg] = useState(false)

  const orgIds =
    session.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0
      ? [...allOrgs, defaultOrg].map((org) => org.id).join(',')
      : actualOrgs.map((org) => org.id).join(',')
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      if (orgIds.length === 0) {
        setIsLoading(false)
        return
      }

      const response = await campaignApis.retrieveCampaign(orgIds.split(',').sort((a, b) => a - b))
      const { numberOfStatus, pageCampaign } = response.results
      setCountOfStatus(numberOfStatus)
      const newData = pageCampaign
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((item) => {
          return {
            ...item,
            createdAt: item.createdAt ? convertDateToString(item.createdAt) : '-',
            progress: item.completionRate ? (item.completionRate * 100).toFixed(2) : 0,
            manage: true
          }
        })
      setProcessedData(newData)
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setIsLoading(false)
    }
  }, [orgIds])

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleFilterChange = (value) => {
    setFilterQuery(value)
  }

  // 조직/검색 조건만 적용한 집합 (상태 카드/드롭다운 집계의 기준)
  const orgSearchFiltered = useMemo(
    () =>
      processedData.filter((campaign) => {
        const displayNameStr = campaign.displayName || ''
        const searchQueryStr = searchQuery || ''
        const matchesSearch = displayNameStr.toLowerCase().includes(searchQueryStr.toLowerCase())
        const matchesOrg =
          session.userRole === 'SYSTEM_MANAGER' && orgFilter.actualOrgs.length === 0
            ? true
            : campaign.Organization
              ? orgFilter.matchesOrg(campaign.Organization)
              : false
        return matchesSearch && matchesOrg
      }),
    [processedData, searchQuery, orgFilter]
  )

  const filteredData = orgSearchFiltered.filter(
    (campaign) => filterQuery === 'all' || campaign.jobStatus === filterQuery
  )

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleAbort = useCallback(
    async (devices) => {
      setIsProcessing(true)
      try {
        const groupedByCampaignId = devices.reduce((acc, device) => {
          if (!acc[device.campaignId]) {
            acc[device.campaignId] = []
          }
          acc[device.campaignId].push({ id: device.id, isRollback: device.isRollback })
          return acc
        }, {})
        console.log('groupedByCampaignId', groupedByCampaignId)
        const promises = Object.entries(groupedByCampaignId).map(([campaignId, devices]) => {
          const deviceIds = devices.map((device) => device.id)
          return campaignApis.abortDeployment({
            id: Number(campaignId),
            deviceIds,
            rollback: devices[0].isRollback,
            userId: session.email
          })
        })
        await Promise.all(promises)
      } catch (error) {
        console.error('Failed to abort deployment:', error)
      } finally {
        fetchData()
        setIsProcessing(false)
      }
    },
    [processedData, session.email, fetchData]
  )

  const handleRollback = useCallback(
    async (devices) => {
      setIsProcessing(true)
      try {
        const groupedByCampaignId = devices.reduce((acc, device) => {
          if (!acc[device.campaignId]) {
            acc[device.campaignId] = []
          }
          acc[device.campaignId].push(device.id)
          return acc
        }, {})
        const promises = Object.entries(groupedByCampaignId).map(([campaignId, deviceIds]) => {
          return campaignApis.rollbackDeployment({
            id: Number(campaignId),
            deviceIds,
            userId: session.email
          })
        })
        await Promise.all(promises)
      } catch (error) {
        console.error('Failed to rollback deployment:', error)
      } finally {
        setIsProcessing(false)
      }
    },
    [processedData, session.email, fetchData]
  )

  const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL
  const region = import.meta.env.VITE_AWS_REGION
  const { subscribe } = useMqtt({ brokerUrl, region, fetchCredentials: mqttApis.getMqttCredentials })

  useEffect(() => {
    const mode = (import.meta.env.VITE_MODE || 'qa').replace(/"/g, '')
    const campaignTopic = `${mode}/ota/campaign/status`

    const unsubscribeCampaign = subscribe(campaignTopic, (payload) => {
      console.log('mqtt subscribe campaign payload', payload)
      if (payload.topic !== campaignTopic) {
        console.warn('mqtt subscribe campaign payload topic mismatch', payload.topic, campaignTopic)
        return
      }
      const campaignId = Number(payload.id)

      try {
        setProcessedData((prevData) => {
          if (!prevData.some((item) => item.id === campaignId)) {
            return prevData
          }
          return prevData.map((item) => {
            if (item.id === campaignId) {
              const updatedItem = { ...item, jobStatus: payload.status }
              if (payload.status === 'COMPLETED') {
                updatedItem.progress = 100
              }
              return updatedItem
            }
            return item
          })
        })
      } catch (err) {
        console.error('Error parsing MQTT campaign payload:', err)
      }
    })

    return () => {
      if (unsubscribeCampaign) unsubscribeCampaign()
    }
  }, [subscribe, setProcessedData])

  const handleUpdateCampaign = useCallback((id, updatedData) => {
    setProcessedData((prevData) =>
      prevData.map((item) => {
        if (item.id === id) {
          const newItem = { ...item, ...updatedData }
          // If Devices were updated, re-calculate progress
          if (updatedData.TargetGroup?.Devices) {
            newItem.progress = calculateProgress(updatedData.TargetGroup.Devices)
          }
          return newItem
        }
        return item
      })
    )
  }, [])

  useEffect(() => {
    if (!initialOrg || (session.userRole !== 'SYSTEM_MANAGER' && actualOrgs.length === 0) || allOrgs.length === 0) {
      setIsLoading(false)
      return
    }
    fetchData()
  }, [allOrgs, fetchData])

  const handleSelectOrg = useCallback((info) => {
    setOrgFilter({ actualOrgs: info.actualOrgs, matchesOrg: info.matchesOrg })
    setInitialOrg(true)
  }, [])

  const handleRowClicked = useCallback(
    (row) => {
      navigate(`/ota/campaign/detail/${row.id}?orgId=${row.Organization?.id}`)
    },
    [navigate]
  )

  return (
    <StyledPageContent className="column">
      <Title>{t('campaign')}</Title>
      <OrganizationSelector onChange={handleSelectOrg} allToTop={false} />
      <StateStatusList>
        <StateStatusCard dataValue="ALL" icon="stack" label="All campaigns" count={countOfStatus.allCampaigns} />
        <StateStatusCard dataValue="COMPLETED" icon="smile" label="Completed" count={countOfStatus.allCompleted} />
        <StateStatusCard
          dataValue="IN_PROGRESS"
          icon="in_progress"
          label="In progress"
          count={countOfStatus.allInProgress}
        />
      </StateStatusList>
      <Section>
        <HeaderTitleGroup>
          <Dropdown
            size="lg"
            label={t('status')}
            minWidth="180px"
            defaultValue={filterQuery}
            options={campaignStatusOptions}
            onChange={handleFilterChange}
          />
          <SearchContainer>
            <Search
              value={searchQuery}
              label={t('campaignName')}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder')}
              width={'300px'}
            />
          </SearchContainer>
          <ButtonWrap className="alignRight" style={{ marginBottom: '-2rem' }}>
            <Button
              onClick={() =>
                navigate(
                  `/ota/campaign/detail/?orgId=${
                    session.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0 ? defaultOrg.id : actualOrgs[0].id
                  }`
                )
              }
              disabled={orgFilter.actualOrgs.length !== 1 && session.userRole !== 'SYSTEM_MANAGER'}
            >
              {t('create')}
            </Button>
          </ButtonWrap>
        </HeaderTitleGroup>
        {!isLoading && filteredData.length === 0 ? (
          <NoData>{tCommon('noData')}</NoData>
        ) : (
          <Suspense fallback={<div>Loading...</div>}>
            <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
              {tCommon('count')} : {filteredData.length}
            </div>
            <CampaignTable
              columns={columns}
              data={filteredData}
              noData={tCommon('noData')}
              isLoading={isLoading}
              pagination
              paginationRowsPerPageOptions={[5]}
              handleAbort={handleAbort}
              handleRollback={handleRollback}
              onUpdateCampaign={handleUpdateCampaign}
              onRowClicked={handleRowClicked}
              pointerOnHover
              customStyles={hoverStyles}
            />
          </Suspense>
        )}
      </Section>
      <UITooltip id="campaign-info">
        <CampaignInfoTooltipContent
          campaign={activeCampaignTooltip}
          actualOrgs={actualOrgs}
          onUpdateCampaign={handleUpdateCampaign}
        />
      </UITooltip>
      <Modal isOpen={isProcessing} size="xs">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <ClipLoader color={'#36d7b7'} loading={true} size={50} />
          <div style={{ marginTop: '20px' }}>{t('processing')}</div>
        </div>
      </Modal>
    </StyledPageContent>
  )
}

export default Campaign
