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
import { embeddingApis } from '@/apis'
import { convertDateToString } from '@repo/utils'
import { resolveOrgIds } from '@/utils/org'
import { ButtonWrap } from '@/components/common/styles'

const Embedding = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('embedding')
  const { t: tCommon } = useTranslation('common')
  const { actualOrgs, selectedOrgs, allOrgs } = useOrganizationStore()

  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [toggleCleared, setToggleCleared] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const orgIds = actualOrgs.map((org) => org.id).join(',')

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
      const params = {}
      if (groupId) params.groupId = groupId
      if (siteId) params.siteId = siteId
      const response = await embeddingApis.getEmbeddingDocuments(params)
      setDocuments(response?.results || [])
    } catch (error) {
      console.error('Failed to fetch embedding documents:', error)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgIds, selectedOrgs, allOrgs])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const filteredData = documents.filter((item) =>
    (item.displayName || '').toLowerCase().includes((searchQuery || '').toLowerCase()),
  )

  const handleCreate = useCallback(() => navigate('/cms/embedding/detail'), [navigate])

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
      await embeddingApis.deleteEmbeddingDocument({ ids })
      toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
      setIsDeleteModalOpen(false)
      setIsDeleteMode(false)
      setSelectedRows([])
      setToggleCleared((v) => !v)
      await fetchDocuments()
    } catch (error) {
      console.error('Failed to delete embedding documents:', error)
      toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
    }
  }, [selectedRows, tCommon, fetchDocuments])

  const columns = [
    {
      name: t('documentName', '문서 이름'),
      selector: (row) => (
        <Button as="NavLink" to={`/cms/embedding/detail/${row.id}`} theme="link">
          {row.displayName}
        </Button>
      ),
      sortable: 'true'
    },
    {
      name: t('paragraphCount', '단락 수'),
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
      <Title>{t('title', '음성대화 문서')}</Title>
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
          <p>{t('confirmDelete', '선택한 문서를 삭제하시겠습니까?')}</p>
        </div>
      </Modal>
    </StyledPageContent>
  )
}

export default Embedding
