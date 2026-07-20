import { useState, useEffect, useCallback, Suspense } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  NoData,
  Search,
  HeaderTitleGroup,
  Button,
  Table,
  OrganizationSelector,
  Modal
} from '@repo/ui'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrganizationStore } from '@repo/stores'
import { robotActionApis } from '@/apis'
import { convertDateToString } from '@repo/utils'
import { resolveOrgIds } from '@/utils/org'
import { ButtonWrap } from '@/components/common/styles'

const RobotActionList = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('embedding')
  const { t: tCommon } = useTranslation('common')
  const { actualOrgs, selectedOrgs, allOrgs } = useOrganizationStore()

  const [actions, setActions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [toggleCleared, setToggleCleared] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const orgIds = actualOrgs.map((org) => org.id).join(',')

  const fetchActions = useCallback(async () => {
    setIsLoading(true)
    try {
      const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
      const params = {}
      if (groupId) params.groupId = groupId
      if (siteId) params.siteId = siteId
      const response = await robotActionApis.getRobotActions(params)
      setActions(response?.results || [])
    } catch (error) {
      console.error('Failed to fetch robot actions:', error)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgIds, selectedOrgs, allOrgs])

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  const filteredData = actions.filter(
    (item) =>
      (item.displayName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (item.actionCode || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  )

  const handleCreate = useCallback(() => navigate('/cms/embedding/actions/detail'), [navigate])

  const handleToggleDeleteMode = useCallback(() => {
    setIsDeleteMode((prev) => !prev)
    setSelectedRows([])
    setToggleCleared((v) => !v)
  }, [])

  const handleRowSelected = useCallback(({ selectedRows: rows }) => setSelectedRows(rows), [])

  const handleConfirmDelete = useCallback(async () => {
    const ids = selectedRows.map((r) => r.id)
    if (ids.length === 0) return
    try {
      await robotActionApis.deleteRobotAction({ ids })
      toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
      setIsDeleteModalOpen(false)
      setIsDeleteMode(false)
      setSelectedRows([])
      setToggleCleared((v) => !v)
      await fetchActions()
    } catch (error) {
      console.error('Failed to delete robot actions:', error)
      toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
    }
  }, [selectedRows, tCommon, fetchActions])

  const columns = [
    {
      name: t('actionName', '액션 이름'),
      selector: (row) => (
        <Button as="NavLink" to={`/cms/embedding/actions/detail/${row.id}`} theme="link">
          {row.displayName}
        </Button>
      ),
      sortable: 'true'
    },
    {
      name: t('actionCode', '액션 코드'),
      selector: (row) => row.actionCode || '-',
      sortable: 'true'
    },
    {
      name: t('phraseCount', '발화 수'),
      selector: (row) => (row.scripts ? row.scripts.length : 0),
      sortable: 'true'
    },
    {
      name: tCommon('createdAt', '생성일'),
      selector: (row) => (row.createdAt ? convertDateToString(row.createdAt) : '-'),
      sortable: 'true'
    }
  ]

  return (
    <StyledPageContent className="column">
      <Title>{t('robotActionTitle', '로봇액션')}</Title>
      <OrganizationSelector supportAlls={[true, true]} />
      <Section>
        <HeaderTitleGroup>
          <Search
            value={searchQuery}
            label={tCommon('search', '검색')}
            width="250px"
            onChange={(e) => setSearchQuery(e?.target?.value ?? '')}
            onReset={() => setSearchQuery('')}
            placeholder={tCommon('searchPlaceHolder')}
          />
          <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
            {isDeleteMode ? (
              <>
                <Button
                  variant="contained"
                  theme="delete"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={selectedRows.length === 0}
                >
                  {t('deleteSelected', '선택 삭제')}
                  {selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                </Button>
                <Button variant="outline" onClick={handleToggleDeleteMode}>
                  {tCommon('cancel')}
                </Button>
              </>
            ) : (
              <Button variant="contained" theme="delete" onClick={handleToggleDeleteMode}>
                {tCommon('delete', '삭제')}
              </Button>
            )}
            <Button variant="contained" onClick={handleCreate} disabled={isDeleteMode}>
              {tCommon('create', '생성')}
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
            <Table
              data={filteredData}
              columns={columns}
              noData={tCommon('noData')}
              isLoading={isLoading}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
              selectableRows={isDeleteMode}
              onSelectedRowsChange={handleRowSelected}
              clearSelectedRows={toggleCleared}
            />
          </Suspense>
        )}
      </Section>

      <Modal
        isOpen={isDeleteModalOpen}
        title={tCommon('delete', '삭제')}
        onClose={() => setIsDeleteModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ButtonWrap className="alignRight" style={{ marginTop: '2rem' }}>
            <Button variant="contained" theme="delete" onClick={handleConfirmDelete}>
              {tCommon('confirm')}
            </Button>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
          </ButtonWrap>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          <p>{t('confirmDeleteAction', '선택한 액션을 삭제하시겠습니까?')}</p>
        </div>
      </Modal>
    </StyledPageContent>
  )
}

export default RobotActionList
