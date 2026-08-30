import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  StyledPageContent,
  Section,
  SectionTitle,
  Title,
  Button,
  Input,
  Textarea,
  TransferList,
  RadioCard,
  Dropdown,
  Tag,
  Table,
  Search,
  SearchContainer,
  Checkbox,
  IconButton,
  Icon,
  Modal
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { targetGroupApis, deviceApis, deviceTypeApis, moduleApis } from '@/apis'
import { convertDateToString } from '@repo/utils'
import { toast } from 'react-toastify'
import { useUserStore, useOrganizationStore } from '@repo/stores'
import { useOrgIds } from '@/hooks/useOrgIds'
import { ButtonWrap } from '@/components/common/styles'
import {
  SelectionTypeContainer,
  SelectionItemContainer,
  SelectionRow,
  VersionContainer,
  DeviceToolbar,
  ModalFilterContainer,
  ModalSelectionBanner,
  WizardHead,
  StepIndicator,
  WizardBody,
  CardHead,
  ModeSummary,
  RobotFilterRow
} from './styles'

const STEP = {
  INFORMATION: 1,
  TARGETS: 2
}

const TargetGroupDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation('targetGroup')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()

  // 생성은 2단계 마법사, 조회/수정은 한 화면
  const isEditMode = !!id
  const [step, setStep] = useState(STEP.INFORMATION)
  const [targetGroupName, setTargetGroupName] = useState('')
  const [memo, setMemo] = useState('')
  const [mode, setMode] = useState('static')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedSearchQuery, setSelectedSearchQuery] = useState('')

  const [allDevices, setAllDevices] = useState([])
  const [selectedDevices, setSelectedDevices] = useState([])
  const [checkedDeviceIds, setCheckedDeviceIds] = useState(() => new Set())
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('')
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [modalCheckedIds, setModalCheckedIds] = useState(() => new Set())
  const [modalPage, setModalPage] = useState(1)
  const [modalPerPage, setModalPerPage] = useState(10)
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false)
  const [selectedDeviceTypeIds, setSelectedDeviceTypeIds] = useState([])
  const [selectedModuleIds, setSelectedModuleIds] = useState([])
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState([])
  const [allModules, setAllModules] = useState([])
  const [allDeviceTypes, setAllDeviceTypes] = useState([])
  const [orgName, setOrgName] = useState('')

  const { allOrgs, actualOrgs, company, defaultOrg } = useOrganizationStore()
  const { orgIds } = useOrgIds()

  const { session } = useUserStore()
  const userRole = session?.userRole

  const orgIdParam = new URLSearchParams(window.location.search).get('orgId')
  const currentOrg = useMemo(
    () =>
      orgIdParam
        ? allOrgs.concat(defaultOrg).find((org) => org?.id === Number(orgIdParam))
        : userRole === 'SYSTEM_MANAGER' && actualOrgs.length === 0
          ? defaultOrg
          : actualOrgs[0],
    [orgIdParam, allOrgs, actualOrgs, defaultOrg, userRole]
  )

  const handleSave = () => {
    const payload = {
      orgId: orgIdParam,
      displayName: targetGroupName,
      memo,
      mode,
      ...(mode === 'static' ? { deviceIds: selectedDevices.map((d) => d.id) } : {}),
      ...(mode === 'dynamic'
        ? {
            ...(selectedDeviceTypeIds.length > 0 && { deviceTypeIds: selectedDeviceTypeIds }),
            ...(selectedModuleIds.length > 0 && { moduleIds: selectedModuleIds }),
            ...(selectedOrganizationIds?.length > 0 && { orgIds: selectedOrganizationIds })
          }
        : {})
    }
    if (id) payload.id = Number(id)

    targetGroupApis
      .saveGroup(payload)
      .then(() => {
        toast.success(tCommon('success'), { autoClose: 2000 })
        navigate('/ota/target-group')
      })
      .catch((error) => {
        console.error(error)
        toast.error(tCommon('error.description'), { autoClose: 2000 })
      })
  }

  const handleCancel = () => {
    navigate('/ota/target-group')
  }

  const isDisabled = () => {
    return (
      !targetGroupName ||
      (mode === 'static' && selectedDevices.length === 0) ||
      (mode === 'dynamic' &&
        (selectedOrganizationIds.length === 0 || selectedDeviceTypeIds.length === 0 || selectedModuleIds.length === 0))
    )
  }

  const resetModalPagination = () => {
    setModalPage(1)
    setResetPaginationToggle((prev) => !prev)
  }

  const handleDeviceSearchChange = (e) => {
    setDeviceSearchQuery(e.target.value)
    resetModalPagination()
  }

  const handleResetDeviceSearch = () => {
    setDeviceSearchQuery('')
    resetModalPagination()
  }

  const handleOrganizationChange = (_nextAvailable, nextSelected) => {
    setSelectedOrganizationIds(nextSelected.map((org) => org.id))
  }

  const orgNameById = useMemo(() => {
    const map = new Map()
    allOrgs.forEach((org) => map.set(org.id, org.displayName))
    return map
  }, [allOrgs])

  const filteredDevices = useMemo(() => {
    const query = deviceSearchQuery.trim().toLowerCase()
    if (!query) return allDevices
    return allDevices.filter((device) => (device.displayName || '').toLowerCase().includes(query))
  }, [allDevices, deviceSearchQuery])

  // --- Selected device table (main view) ---
  // 선택된 로봇 목록 내 검색
  const visibleSelectedDevices = useMemo(() => {
    const query = selectedSearchQuery.trim().toLowerCase()
    if (!query) return selectedDevices
    return selectedDevices.filter((device) =>
      [device.displayName, device.DeviceType?.displayName, orgNameById.get(device.Organization?.id)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [selectedDevices, selectedSearchQuery, orgNameById])

  const handleRefreshDevices = async () => {
    if (orgIds.length === 0) return
    setIsRefreshing(true)
    try {
      const deviceRes = await deviceApis.retrieveDevices(orgIds)
      setAllDevices([...(deviceRes.results || [])].sort((a, b) => a.id - b.id))
    } catch (error) {
      console.error(error)
      toast.error(tCommon('error.description'), { autoClose: 2000 })
    } finally {
      setIsRefreshing(false)
    }
  }

  const isAllSelectedChecked =
    visibleSelectedDevices.length > 0 && visibleSelectedDevices.every((device) => checkedDeviceIds.has(device.id))

  const toggleCheckedDevice = useCallback((device) => {
    setCheckedDeviceIds((prev) => {
      const next = new Set(prev)
      if (next.has(device.id)) next.delete(device.id)
      else next.add(device.id)
      return next
    })
  }, [])

  const toggleCheckAllSelected = useCallback(() => {
    setCheckedDeviceIds((prev) =>
      visibleSelectedDevices.length > 0 && visibleSelectedDevices.every((device) => prev.has(device.id))
        ? new Set()
        : new Set(visibleSelectedDevices.map((device) => device.id))
    )
  }, [visibleSelectedDevices])

  const handleDeleteChecked = () => {
    setSelectedDevices((prev) => prev.filter((device) => !checkedDeviceIds.has(device.id)))
    setCheckedDeviceIds(new Set())
  }

  const handleClearAll = () => {
    setSelectedDevices([])
    setCheckedDeviceIds(new Set())
  }

  // --- Device selection modal ---
  const openDeviceModal = () => {
    setModalCheckedIds(new Set(selectedDevices.map((device) => device.id)))
    setDeviceSearchQuery('')
    resetModalPagination()
    setModalPerPage(10)
    setIsDeviceModalOpen(true)
  }

  const closeDeviceModal = () => {
    setIsDeviceModalOpen(false)
    setDeviceSearchQuery('')
  }

  const toggleModalDevice = useCallback((device) => {
    setModalCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(device.id)) next.delete(device.id)
      else next.add(device.id)
      return next
    })
  }, [])

  // Items shown on the current page of the modal table.
  const currentPageDevices = useMemo(() => {
    const start = (modalPage - 1) * modalPerPage
    return filteredDevices.slice(start, start + modalPerPage)
  }, [filteredDevices, modalPage, modalPerPage])

  // All matched devices (across every page) are selected.
  const isAllMatchedChecked =
    filteredDevices.length > 0 && filteredDevices.every((device) => modalCheckedIds.has(device.id))

  // Every item on the current page is selected (drives the table header checkbox).
  const isAllPageChecked =
    currentPageDevices.length > 0 && currentPageDevices.every((device) => modalCheckedIds.has(device.id))

  // Header checkbox: toggle only the items on the current page.
  const togglePageCheckAll = useCallback(() => {
    const pageIds = currentPageDevices.map((device) => device.id)
    const allChecked = pageIds.length > 0 && pageIds.every((deviceId) => modalCheckedIds.has(deviceId))
    setModalCheckedIds((prev) => {
      const next = new Set(prev)
      if (allChecked) pageIds.forEach((deviceId) => next.delete(deviceId))
      else pageIds.forEach((deviceId) => next.add(deviceId))
      return next
    })
  }, [currentPageDevices, modalCheckedIds])

  // Banner action: toggle all matched devices, including those not visible on the current page.
  const toggleAllMatchedChecked = useCallback(() => {
    const matchedIds = filteredDevices.map((device) => device.id)
    const allChecked = matchedIds.length > 0 && matchedIds.every((deviceId) => modalCheckedIds.has(deviceId))
    setModalCheckedIds((prev) => {
      const next = new Set(prev)
      if (allChecked) matchedIds.forEach((deviceId) => next.delete(deviceId))
      else matchedIds.forEach((deviceId) => next.add(deviceId))
      return next
    })
  }, [filteredDevices, modalCheckedIds])

  const handleAddSelected = () => {
    setSelectedDevices(allDevices.filter((device) => modalCheckedIds.has(device.id)))
    setCheckedDeviceIds(new Set())
    closeDeviceModal()
  }

  const baseDeviceColumns = useMemo(
    () => [
      {
        name: t('deviceName'),
        selector: (row) => row.displayName || '-',
        sortable: 'true'
      },
      {
        name: t('organizationName'),
        selector: (row) => orgNameById.get(row.Organization?.id) || '-',
        sortable: 'true'
      },
      {
        name: t('deviceType'),
        selector: (row) => row.DeviceType?.displayName || '-',
        sortable: 'true'
      },
      {
        name: t('updatedAt'),
        selector: (row) => (row.updatedAt ? convertDateToString(row.updatedAt) : '-'),
        sortable: 'true'
      }
    ],
    [t, orgNameById]
  )

  const selectedColumns = useMemo(
    () => [
      {
        name: <Checkbox checked={isAllSelectedChecked} onChange={toggleCheckAllSelected} />,
        cell: (row) => <Checkbox checked={checkedDeviceIds.has(row.id)} onChange={() => toggleCheckedDevice(row)} />,
        width: '64px',
        center: 'true'
      },
      ...baseDeviceColumns
    ],
    [baseDeviceColumns, checkedDeviceIds, isAllSelectedChecked, toggleCheckAllSelected, toggleCheckedDevice]
  )

  const modalColumns = useMemo(
    () => [
      {
        name: <Checkbox checked={isAllPageChecked} onChange={togglePageCheckAll} />,
        cell: (row) => <Checkbox checked={modalCheckedIds.has(row.id)} onChange={() => toggleModalDevice(row)} />,
        width: '64px',
        center: 'true'
      },
      ...baseDeviceColumns
    ],
    [baseDeviceColumns, modalCheckedIds, isAllPageChecked, togglePageCheckAll, toggleModalDevice]
  )

  const deviceTypeOptions = useMemo(() => {
    return [
      { value: 'all', name: t('all') },
      ...allDeviceTypes
        .filter((deviceType) => !selectedDeviceTypeIds.includes(deviceType.id))
        .map((deviceType) => ({
          name: deviceType.displayName,
          value: deviceType.id
        }))
    ]
  }, [allDeviceTypes, selectedDeviceTypeIds, t])

  const moduleOptions = useMemo(() => {
    return [
      { value: 'all', name: t('all') },
      ...allModules
        .filter((module) => !selectedModuleIds.includes(module.id))
        .map((module) => ({
          name: module.displayName,
          value: module.id
        }))
    ]
  }, [allModules, selectedModuleIds, t])

  const handleSelectDeviceType = (val) => {
    if (val === 'all') {
      const allIds = allDeviceTypes.map((dt) => dt.id)
      setSelectedDeviceTypeIds([...new Set([...selectedDeviceTypeIds, ...allIds])].filter((id) => id !== 'all'))
    } else if (val && !selectedDeviceTypeIds.includes(val)) {
      setSelectedDeviceTypeIds([...selectedDeviceTypeIds, val])
    }
  }

  const handleSelectModule = (val) => {
    if (val === 'all') {
      const allIds = allModules.map((m) => m.id)
      setSelectedModuleIds([...new Set([...selectedModuleIds, ...allIds])].filter((id) => id !== 'all'))
    } else if (val && !selectedModuleIds.includes(val)) {
      setSelectedModuleIds([...selectedModuleIds, val])
    }
  }

  useEffect(() => {
    setOrgName(currentOrg?.displayName)
    const fetchData = async () => {
      if (orgIds.length === 0) return

      const [moduleRes, deviceRes, deviceTypeRes] = await Promise.all([
        moduleApis.retrieveModules(company.id),
        deviceApis.retrieveDevices(orgIds),
        deviceTypeApis.retrieveDeviceTypes(company.id)
      ])

      const modules = moduleRes.results || []
      setAllModules(modules)

      const allDevicesInOrgs = deviceRes.results || []
      setAllDeviceTypes(deviceTypeRes.results || [])
      setIsLoading(true)

      const targetOrgIds = orgIdParam ? [Number(orgIdParam)] : orgIds
      try {
        let initialSelectedDevices = []
        if (id) {
          const groupRes = await targetGroupApis.retrieveTargetGroup(targetOrgIds, id)
          const groupData = groupRes.results[0]
          setTargetGroupName(groupData.displayName)
          setMemo(groupData.memo)
          setMode(groupData.mode)
          if (groupData.mode === 'dynamic') {
            setSelectedDeviceTypeIds(groupData.config.deviceTypeIds || [])
            setSelectedModuleIds(groupData.config.moduleIds || [])
            setSelectedOrganizationIds(groupData.config.orgIds)
          }
          initialSelectedDevices = groupData.Devices
        }

        setAllDevices([...allDevicesInOrgs].sort((a, b) => a.id - b.id))
        setSelectedDevices(initialSelectedDevices || [])
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, orgIds])

  const detailsCard = (
    <Section gap="1.6rem">
      <SectionTitle title={t('targetGroupDetails')} />
      <Input
        label={t('targetGroupName')}
        size="lg"
        placeholder={t('enterTitle')}
        value={targetGroupName}
        onChange={(e) => setTargetGroupName(e.target.value)}
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
  )

  // 생성 시에는 선택 가능한 카드, 조회 시에는 이미 정해진 방식을 읽기 전용으로 노출
  const modeCard = isEditMode ? (
    <Section>
      <ModeSummary>
        <div className="modeHead">
          <h3 className="typographyHeading3">{mode === 'static' ? t('staticMode') : t('dynamicMode')}</h3>
          <span className="modeSubtitle typographyBody5">
            {mode === 'static' ? t('staticModeSubtitle') : t('dynamicModeSubtitle')}
          </span>
        </div>
        <p className="modeDesc typographyBody6">
          {mode === 'static' ? t('staticModeDescription') : t('dynamicModeDescription')}
        </p>
      </ModeSummary>
    </Section>
  ) : (
    <SelectionTypeContainer>
      <div className="selection-cards">
        <RadioCard
          name="targetGroupMode"
          value="static"
          checked={mode === 'static'}
          onChange={(e) => setMode(e.target.value)}
          title={t('staticMode')}
          subtitle={t('staticModeSubtitle')}
          description={t('staticModeDescription')}
        />
        <RadioCard
          name="targetGroupMode"
          value="dynamic"
          checked={mode === 'dynamic'}
          onChange={(e) => setMode(e.target.value)}
          title={t('dynamicMode')}
          subtitle={t('dynamicModeSubtitle')}
          description={t('dynamicModeDescription')}
        />
      </div>
    </SelectionTypeContainer>
  )

  const targetsCard =
    mode === 'static' ? (
      // Static
      <Section gap="1.6rem">
        <CardHead>
          <h3 className="typographyHeading3">{t('selectedRobots')}</h3>
          <span className="countBadge">{selectedDevices.length}</span>
        </CardHead>
        <RobotFilterRow>
          <SearchContainer>
            <Search
              label={t('search')}
              value={selectedSearchQuery}
              onChange={(e) => setSelectedSearchQuery(e.target.value)}
              onReset={() => setSelectedSearchQuery('')}
              placeholder={t('deviceName')}
              width="320px"
            />
          </SearchContainer>
          <IconButton
            size="md"
            theme="outlined"
            onClick={handleRefreshDevices}
            disabled={isRefreshing}
            aria-label={t('refresh')}
          >
            <Icon name="refresh" size={20} color="var(--color-neutral-80)" />
          </IconButton>
        </RobotFilterRow>
        <DeviceToolbar>
          <div className="toolbar-left">
            <IconButton
              size="md"
              theme="outlined"
              onClick={handleDeleteChecked}
              disabled={checkedDeviceIds.size === 0}
              aria-label={t('delete')}
            >
              <Icon name="delete" size={20} color="var(--color-neutral-80)" />
            </IconButton>
            <button
              type="button"
              className="clear-all"
              onClick={handleClearAll}
              disabled={selectedDevices.length === 0}
            >
              {t('clearAll')}
            </button>
          </div>
          <div className="toolbar-actions">
            <Button onClick={openDeviceModal}>{t('addDevice')}</Button>
          </div>
        </DeviceToolbar>
        <Table
          columns={selectedColumns}
          data={visibleSelectedDevices}
          keyField="id"
          noData={`${t('noRobotsSelected')}<br />${t('noRobotsSelectedDescription')}`}
          isLoading={isLoading}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </Section>
    ) : (
      // Dynamic
      <Section gap="1.6rem">
        <SectionTitle title={t('dynamicRules')} />
        <SelectionRow>
          {/* Device Type */}
          <SelectionItemContainer>
            <Dropdown
              label={t('deviceType')}
              size="lg"
              minWidth="250px"
              placeholder={t('selectDeviceType')}
              options={deviceTypeOptions}
              defaultValue=""
              onChange={handleSelectDeviceType}
              disabled={selectedDeviceTypeIds.length === allDeviceTypes.length}
            />
            <VersionContainer>
              {selectedDeviceTypeIds.map((id) => {
                const deviceTypeObj = allDeviceTypes.find((o) => o.id === id)
                return (
                  <Tag key={id} theme="light">
                    {id === 'all' ? t('all') : deviceTypeObj?.displayName}
                    <span
                      style={{ marginLeft: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => setSelectedDeviceTypeIds(selectedDeviceTypeIds.filter((itemId) => itemId !== id))}
                    >
                      ✕
                    </span>
                  </Tag>
                )
              })}
            </VersionContainer>
          </SelectionItemContainer>

          {/* Module */}
          <SelectionItemContainer>
            <Dropdown
              label={t('module')}
              size="lg"
              minWidth="250px"
              placeholder={t('selectModule')}
              options={moduleOptions}
              defaultValue=""
              onChange={handleSelectModule}
              disabled={selectedModuleIds.length === allModules.length}
            />
            <VersionContainer>
              {selectedModuleIds.map((id) => {
                const moduleObj = allModules.find((m) => m.id === id)
                return (
                  <Tag key={id} theme="light">
                    {id === 'all' ? t('all') : moduleObj?.displayName}
                    <span
                      style={{ marginLeft: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => setSelectedModuleIds(selectedModuleIds.filter((mId) => mId !== id))}
                    >
                      ✕
                    </span>
                  </Tag>
                )
              })}
            </VersionContainer>
          </SelectionItemContainer>
        </SelectionRow>

        {/* Organization */}
        <span
          className="label typographyBody6"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            color: 'var(--color-neutral-70)',
            marginTop: '2.4rem'
          }}
        >
          {t('organization')}
          <TransferList
            availableItems={allOrgs.filter((org) => !selectedOrganizationIds.includes(org.id))}
            selectedItems={selectedOrganizationIds.map((id) => allOrgs.find((org) => org.id === id))}
            onChange={handleOrganizationChange}
            searchPlaceholder={tCommon('searchPlaceHolder')}
          />
        </span>
      </Section>
    )

  return (
    <StyledPageContent className="column">
      <WizardHead>
        <div className="titleGroup">
          <Title>{isEditMode ? t('targetGroupDetail') : t('targetGroupCreation')}</Title>
          <span className="orgName typographyBody5">{`${tCommon('organizationName')} : ${orgName}`}</span>
        </div>
        <ButtonWrap className="alignRight">
          {isEditMode || step === STEP.TARGETS ? (
            <>
              <Button
                theme="secondary"
                onClick={isEditMode ? handleCancel : () => setStep(STEP.INFORMATION)}
                disabled={isLoading}
              >
                {isEditMode ? t('cancel') : t('back')}
              </Button>
              <Button onClick={handleSave} disabled={isLoading || isDisabled()}>
                {t('save')}
              </Button>
            </>
          ) : (
            <>
              <Button theme="secondary" onClick={handleCancel} disabled={isLoading}>
                {t('cancel')}
              </Button>
              <Button onClick={() => setStep(STEP.TARGETS)} disabled={isLoading || !targetGroupName}>
                {t('next')}
              </Button>
            </>
          )}
        </ButtonWrap>
      </WizardHead>
      {isEditMode ? (
        // 조회/수정 : 단계 구분 없이 한 화면에 모두 노출
        <WizardBody>
          {detailsCard}
          {modeCard}
          {targetsCard}
        </WizardBody>
      ) : (
        <>
          <StepIndicator aria-label={t('targetGroupCreation')}>
            <button
              type="button"
              className={`step ${step === STEP.INFORMATION ? 'active' : 'done'}`}
              onClick={() => setStep(STEP.INFORMATION)}
            >
              <span className="circle">
                {step > STEP.INFORMATION ? <Icon name="check" size={16} /> : STEP.INFORMATION}
              </span>
              <span className="stepTitle typographyBody4">{t('stepInformation')}</span>
              <span className="stepDesc typographyBody6">{t('stepInformationDescription')}</span>
            </button>
            <span className="connector" aria-hidden="true" />
            <button
              type="button"
              className={`step ${step === STEP.TARGETS ? 'active' : ''}`}
              onClick={() => setStep(STEP.TARGETS)}
              disabled={!targetGroupName}
            >
              <span className="circle">{STEP.TARGETS}</span>
              <span className="stepTitle typographyBody4">{t('stepTargets')}</span>
              <span className="stepDesc typographyBody6">{t('stepTargetsDescription')}</span>
            </button>
          </StepIndicator>
          {step === STEP.INFORMATION ? (
            <WizardBody>
              {detailsCard}
              {modeCard}
            </WizardBody>
          ) : (
            targetsCard
          )}
        </>
      )}

      <Modal
        isOpen={isDeviceModalOpen}
        title={t('selectDevice')}
        closeButton
        size="xl"
        onClose={closeDeviceModal}
        renderButtonComponent={
          <ButtonWrap className="alignRight" style={{ marginTop: '2rem' }}>
            <Button variant="contained" onClick={handleAddSelected} disabled={modalCheckedIds.size === 0}>
              {t('addSelected')}
            </Button>
            <Button variant="outline" onClick={closeDeviceModal}>
              {tCommon('cancel')}
            </Button>
          </ButtonWrap>
        }
      >
        <ModalFilterContainer>
          <SearchContainer>
            <Search
              label={t('search')}
              value={deviceSearchQuery}
              onChange={handleDeviceSearchChange}
              onReset={handleResetDeviceSearch}
              placeholder={t('deviceName')}
            />
          </SearchContainer>
          <ModalSelectionBanner>
            <span>
              <strong>{modalCheckedIds.size}</strong> {t('devicesSelected')}
            </span>
            {filteredDevices.length > 0 && (
              <button type="button" className="select-all" onClick={toggleAllMatchedChecked}>
                {isAllMatchedChecked
                  ? t('deselectAllMatched', { count: filteredDevices.length })
                  : t('selectAllMatched', { count: filteredDevices.length })}
              </button>
            )}
          </ModalSelectionBanner>
          <Table
            columns={modalColumns}
            data={filteredDevices}
            keyField="id"
            noData={tCommon('noData')}
            pagination
            paginationRowsPerPageOptions={[10, 30, 50, 100]}
            paginationPerPage={modalPerPage}
            paginationResetDefaultPage={resetPaginationToggle}
            onChangePage={(page) => setModalPage(page)}
            onChangeRowsPerPage={(perPage, page) => {
              setModalPerPage(perPage)
              setModalPage(page)
            }}
          />
        </ModalFilterContainer>
      </Modal>
    </StyledPageContent>
  )
}

export default TargetGroupDetail
