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
import { useOrganizationStore } from '@repo/stores'
import { TOTAL_GROUP_ID, TOTAL_SITE_ID } from '@/common/constants'

export default function TaskFlowListPage() {
  const { t } = useTranslation(['tms', 'common'])
  const navigate = useNavigate()
  const flows = useTaskFlowStore((state) => state.flows)
  const refreshFlows = useTaskFlowStore((state) => state.refreshFlows)
  const { allOrgs } = useOrganizationStore()

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

          <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
            <Button variant="contained" style={{ whiteSpace: 'nowrap' }} onClick={handleCreate}>
              {t('list.create')}
            </Button>
          </ButtonWrap>
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
                />
              ))}
            </div>
          </Suspense>
        )}
      </Section>
    </StyledPageContent>
  )
}
