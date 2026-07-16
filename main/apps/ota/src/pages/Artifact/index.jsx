import React, { useState, useEffect, Suspense, useCallback } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  NoData,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Dropdown,
  OrganizationSelector,
  StyledTag
} from '@repo/ui'
import { useNavigate } from 'react-router-dom'
import ArtifactTable from '@/components/Artifact/ArtifactTable'
import { moduleApis, mqttApis } from '@/apis'
import { artifactApis } from '@repo/apis'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui'
import { convertDateToString } from '@repo/utils'
import { useMqtt } from '@repo/hooks'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { ButtonWrap } from '@/components/common/styles'
import { statusToColor, statusToBgColor } from '@/utils/common'

const hoverStyles = {
  rows: {
    highlightOnHoverStyle: {
      backgroundColor: 'var(--color-neutral-20)',
      transitionDuration: '0.15s',
      transitionProperty: 'background-color'
    }
  }
}

const Artifact = () => {
  const navigate = useNavigate()
  const session = useUserStore((state) => state.session)
  const [processedData, setProcessedData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { t } = useTranslation('artifact')
  const { t: tCommon } = useTranslation('common')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterQuery, setFilterQuery] = useState('all')
  const [moduleOptions, setModuleOptions] = useState([])
  const [orgFilter, setOrgFilter] = useState({ actualOrgs: [], matchesOrg: () => true })
  const { actualOrgs, company, allOrgs, defaultOrg } = useOrganizationStore()

  const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL
  const region = import.meta.env.VITE_AWS_REGION
  const { subscribe } = useMqtt({ brokerUrl, region, fetchCredentials: mqttApis.getMqttCredentials })

  useEffect(() => {
    const artifactTopic = `${import.meta.env.VITE_MODE}/ota/artifact/status`
    const unsubscribe = subscribe(artifactTopic, (payload) => {
      try {
        if (payload.topic !== artifactTopic) {
          console.warn('mqtt subscribe artifact payload topic mismatch', payload.topic, artifactTopic)
          return
        }

        setProcessedData((prevData) =>
          prevData.map((item) => (item.id === Number(payload.id) ? { ...item, status: payload.status } : item))
        )
      } catch (err) {
        console.error('Error parsing MQTT payload:', err)
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [subscribe, setProcessedData])

  const filteredData = processedData.filter((artifact) => {
    const matchesModule = filterQuery === 'all' || artifact.Module?.id === filterQuery
    const matchesSearch = artifact.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesOrg =
      session.userRole === 'SYSTEM_MANAGER' && orgFilter.actualOrgs.length === 0
        ? true
        : artifact.Organization
          ? orgFilter.matchesOrg(artifact.Organization)
          : false

    return matchesModule && matchesSearch && matchesOrg
  })

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleSelectOrg = useCallback((info) => {
    setOrgFilter({ actualOrgs: info.actualOrgs, matchesOrg: info.matchesOrg })
  }, [])

  const handleFilterChange = (value) => {
    setFilterQuery(value)
  }

  const handleRowClicked = useCallback(
    (row) => {
      navigate(`/ota/artifact/detail/${row.id}?orgId=${row.Organization?.id}`)
    },
    [navigate]
  )

  const tableHeader = () => {
    return {
      columns: [
        {
          name: t('artifactName'),
          selector: (row) => row.displayName,
          sortable: 'true'
        },
        {
          name: t('organizationName'),
          selector: (row) => allOrgs.find((org) => org.id === row.Organization.id)?.displayName,
          sortable: 'true'
        },
        {
          name: t('memo'),
          selector: (row) => row.memo,
          sortable: 'true'
        },
        {
          name: t('module'),
          selector: (row) => row.Module.displayName,
          sortable: 'true'
        },
        {
          name: t('version_tag'),
          selector: (row) =>
            row.Versions ? row.Versions.map((v) => <StyledTag key={v.id}>{v.displayName}</StyledTag>) : '',
          sortable: 'true',
          sortFunction: (a, b) => {
            if (!a.Versions && !b.Versions) return 0
            if (!a.Versions) return -1
            if (!b.Versions) return 1
            return a.Versions.map((v) => v.displayName)
              .join(', ')
              .localeCompare(b.Versions.map((v) => v.displayName).join(', '))
          }
        },
        {
          name: t('status'),
          selector: (row) => (
            <StyledTag color={statusToColor(row.status)} bgColor={statusToBgColor(row.status)}>
              {row.status}
            </StyledTag>
          ),
          sortable: 'true',
          sortFunction: (a, b) => {
            if (!a.status && !b.status) return 0
            if (!a.status) return -1
            if (!b.status) return 1
            return a.status.localeCompare(b.status)
          }
        },
        {
          name: t('date'),
          selector: (row) => (row.createdAt ? convertDateToString(row.createdAt) : '-'),
          sortable: 'true'
        }
      ]
    }
  }

  const handleCreate = () => {
    navigate(
      `/ota/artifact/detail?orgId=${session.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0 ? defaultOrg.id : actualOrgs[0].id}`
    )
  }

  useEffect(() => {
    if (!company) return

    const retrieveModules = async () => {
      const moduleResponse = await moduleApis.retrieveModules(company.id)
      setModuleOptions([
        { value: 'all', name: t('all') },
        ...moduleResponse.results.map((item) => ({ value: item.id, name: item.displayName }))
      ])
    }
    retrieveModules()
  }, [company, t])

  const orgIds =
    session.userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0
      ? [...allOrgs, defaultOrg].map((org) => org.id).join(',')
      : actualOrgs.map((org) => org.id).join(',')

  useEffect(() => {
    if (actualOrgs.length === 0 && session.userRole !== 'SYSTEM_MANAGER') {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const retrieveArtifacts = async () => {
      try {
        const response = await artifactApis.retrieveArtifacts(orgIds.split(',').sort((a, b) => a - b))
        const mappedData = response.results.map((item) => ({
          ...item,
          target: 'N/A', // or some other field if available
          date: convertDateToString(item.createdAt)
        }))
        setProcessedData(mappedData)
      } catch (error) {
        console.error('Error retrieving artifacts:', error)
      } finally {
        setIsLoading(false)
      }
    }
    retrieveArtifacts()
  }, [orgIds])

  return (
    <StyledPageContent className="column">
      <Title>{t('artifactTitle')}</Title>
      <OrganizationSelector onChange={handleSelectOrg} allToTop={false} />
      <Section>
        <HeaderTitleGroup>
          <Dropdown
            size="lg"
            minWidth="180px"
            label={t('module')}
            defaultValue={filterQuery}
            placeholder={t('selectModule')}
            options={moduleOptions}
            onChange={handleFilterChange}
          />
          <SearchContainer>
            <Search
              value={searchQuery}
              label={t('artifactName')}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder')}
              width={'300px'}
            />
          </SearchContainer>
          <ButtonWrap className="alignRight" style={{ marginBottom: '-2rem' }}>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={actualOrgs.length !== 1 && session.userRole !== 'SYSTEM_MANAGER'}
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
            <ArtifactTable
              data={filteredData}
              columns={tableHeader().columns}
              noData={tCommon('noData')}
              isLoading={isLoading}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
              onRowClicked={handleRowClicked}
              pointerOnHover
              customStyles={hoverStyles}
            />
          </Suspense>
        )}
      </Section>
    </StyledPageContent>
  )
}

export default Artifact
