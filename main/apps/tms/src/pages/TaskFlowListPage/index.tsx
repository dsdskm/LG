import { Suspense, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTaskFlowStore } from '@/store/taskflow.store'
import TaskFlowListRow from './TaskFlowListRow'
import {
  StyledPageContent,
  Section,
  Title,
  NoData,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Button,
  OrganizationSelector
} from '@repo/ui'
import { ButtonWrap } from './styles'
import { useOrganizationStore, useResponsiveStore } from '@repo/stores'
import { TOTAL_GROUP_ID, TOTAL_SITE_ID } from '@/common/constants'
import ConfirmModal from '@/pages/components/modal/ConfirmModal'

export default function TaskFlowListPage() {
  const { t } = useTranslation(['tms', 'common'])
  const navigate = useNavigate()
  const flows = useTaskFlowStore((state) => state.flows)
  const refreshFlows = useTaskFlowStore((state) => state.refreshFlows)
  const copyFlow = useTaskFlowStore((state) => state.copyFlow)
  const { allOrgs, selectedOrgs } = useOrganizationStore()

  const [copyResultMessage, setCopyResultMessage] = useState('')
  const [copyErrorMessage, setCopyErrorMessage] = useState('')

  // 선택 모드: 여러 Task Flow 를 골라 한 번에 복제한다.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkCopying, setBulkCopying] = useState(false)

  // 그룹=전체(all)인데 특정 사이트가 선택된 경우, 사이트의 상위 그룹 코드를 찾아 함께 전달한다.
  const handleOrgChange = ({ values }: any) => {
    let groupId = values?.[0] ?? null
    const siteId = values?.[1] ?? null

    const isGroupAll = groupId == null || groupId === TOTAL_GROUP_ID
    const isSiteSelected = siteId != null && siteId !== TOTAL_SITE_ID && siteId !== 'none'

    if (isGroupAll && isSiteSelected) {
      const site = allOrgs.find((org: any) => String(org.code) === String(siteId))
      if (site?.parentCode != null) {
        groupId = site.parentCode
      }
    }

    setSelectedIds([])
    refreshFlows(groupId, siteId)
  }

  const [searchQuery, setSearchQuery] = useState('')
  const orderedFlows = useMemo(
    () => [...flows].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
    [flows]
  )

  const filteredFlows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (query === '') return orderedFlows

    return orderedFlows.filter((flow) => {
      const name = String(flow?.name ?? '').toLowerCase()
      const description = String(flow?.description ?? '').toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [orderedFlows, searchQuery])

  const { responsiveMode } = useResponsiveStore()
  const isMobile = responsiveMode !== 'PC' ? true : false

  const total = filteredFlows.length

  const handleClickCanvas = (flowId: number) => {
    navigate(`/tms/taskflows/${flowId}/canvas`)
  }

  const handleClickDetail = (flowId: number) => {
    navigate(`/tms/taskflows/${flowId}/detail`)
  }

  const handleCreate = () => {
    navigate('/tms/taskflows/0/canvas')
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds([])
  }

  const handleToggleSelect = (flowId: number) => {
    setSelectedIds((prev) => (prev.includes(flowId) ? prev.filter((id) => id !== flowId) : [...prev, flowId]))
  }

  /**
   * 선택한 Task Flow 들을 한 번에 복제한다.
   * 복제 이름("원본 복제1, 복제2")이 목록 기준으로 매겨지므로 순차로 처리해야 번호가 겹치지 않는다.
   */
  const handleCopySelected = async () => {
    if (bulkCopying) return

    const targets = selectedIds.filter((id) => flows.some((flow) => flow.id === id))
    if (targets.length === 0) return

    setBulkCopying(true)

    let successCount = 0
    let firstError = ''

    for (const id of targets) {
      try {
        await copyFlow(id)
        successCount += 1
      } catch (e: any) {
        console.error('[TaskFlow 복제 실패]', id, e)
        if (!firstError) firstError = e?.response?.data?.message || e?.message || ''
      }
    }

    const failCount = targets.length - successCount

    if (failCount > 0) {
      setCopyErrorMessage(
        `${t('list.copyBulkPartialDesc', { successCount, failCount })}${
          firstError
            ? `
${firstError}`
            : ''
        }`
      )
    } else {
      setCopyResultMessage(t('list.copyBulkDoneDesc', { count: successCount }))
    }

    await refreshFlows(selectedOrgs?.[0] ?? null, selectedOrgs?.[1] ?? null)

    setBulkCopying(false)
    exitSelectMode()
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  return (
    <StyledPageContent className="column">
      <Title>{t('list.title')}</Title>
      <OrganizationSelector onChange={handleOrgChange} supportAlls={[true, true]} />

      <Section>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              label={t('common:searchPlaceHolder')}
              width="250px"
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={t('list.searchPlaceholder')}
            />
          </SearchContainer>

          {!isMobile && (
            <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
              <Button variant="contained" style={{ whiteSpace: 'nowrap' }} onClick={handleCreate}>
                {t('list.create')}
              </Button>

              {selectMode && selectedIds.length > 0 && (
                <Button
                  theme="primary"
                  type="button"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={handleCopySelected}
                  disabled={bulkCopying}
                >
                  {bulkCopying ? t('list.copying') : t('list.copySelected', { count: selectedIds.length })}
                </Button>
              )}

              <Button
                theme="tertiary"
                type="button"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                disabled={bulkCopying}
              >
                {selectMode ? t('list.selectCancel') : t('list.select')}
              </Button>
            </ButtonWrap>
          )}
        </HeaderTitleGroup>

        {filteredFlows.length === 0 ? (
          <NoData>{t('list.noData')}</NoData>
        ) : (
          <Suspense fallback={<div>Loading...</div>}>
            <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
              {t('list.totalCount', { count: total })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredFlows.map((flow, idx) => (
                <TaskFlowListRow
                  key={flow.id ?? idx}
                  flow={flow}
                  onClickCanvas={handleClickCanvas}
                  onClickDetail={handleClickDetail}
                  selectMode={selectMode}
                  selected={selectedIds.includes(flow.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          </Suspense>
        )}
      </Section>

      <ConfirmModal
        open={copyResultMessage !== ''}
        title={t('list.copyDoneTitle')}
        description={copyResultMessage}
        showCancelButton={false}
        closeOnOverlayClick
        onCancel={() => setCopyResultMessage('')}
        onConfirm={() => setCopyResultMessage('')}
      />

      <ConfirmModal
        open={copyErrorMessage !== ''}
        title={t('list.copyFailTitle')}
        description={copyErrorMessage}
        showCancelButton={false}
        closeOnOverlayClick
        onCancel={() => setCopyErrorMessage('')}
        onConfirm={() => setCopyErrorMessage('')}
      />
    </StyledPageContent>
  )
}
