import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  NoData,
  Search,
  HeaderTitleGroup,
  Dropdown,
  Button,
  Table,
  OrganizationSelector,
  Icon,
  StyledTag,
  Modal
} from '@repo/ui'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ButtonWrap } from './styles'
import { useOrganizationStore } from '@repo/stores'
import { contentApis, categoryNodeApis, externalServiceApis, languageApis } from '@/apis'
import { convertDateToString } from '@repo/utils'
import CategorySelector from '@/components/common/CategorySelector'
import {
  buildLangCodeMap,
  buildCategorySelectorTree,
  pickLocalizedName
} from '@/components/common/CategorySelector/categoryNodeAdapter'
import { resolveOrgIds, resolveOrgQuery } from '@/utils/org'
import { CONTENT_TYPE_MAP } from './contentTypeMeta'

// 버전 라벨(LATEST/PREV) → 해시태그 배지 색상 매핑
const VERSION_LABEL_META = {
  LATEST: { color: 'var(--color-primary-80)', bgColor: 'var(--color-primary-10)' },
  PREV: { color: 'var(--color-neutral-70)', bgColor: 'var(--color-neutral-20)' }
}

const Content = () => {
  const [filterQuery, setFilterQuery] = useState('all')
  const [filterServiceId, setFilterServiceId] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState([
    { value: 'all', name: 'All' },
    { value: 'face', name: 'Face' },
    { value: 'tts', name: 'TTS' },
    { value: 'sound-effect', name: 'Sound Effect' },
    { value: 'motion', name: 'Motion' }
  ])
  const [serviceList, setServiceList] = useState([])
  const [selectedServiceId, setSelectedServiceId] = useState('all')
  const [serviceOptions, setServiceOptions] = useState([])
  const [categoryTree, setCategoryTree] = useState([])
  const [selectedLevelCategories, setSelectedLevelCategories] = useState([null, null])

  const [processedData, setProcessedData] = useState([])
  const [languages, setLanguages] = useState([])
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [toggleCleared, setToggleCleared] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('content')
  const { t: tCommon } = useTranslation('common')

  // 카테고리명: 현재언어 → default → en-US → 설정된 값 아무거나, 그래도 없으면 '-'
  const catName = (cat) => pickLocalizedName(cat?.displayName, i18n.language) || '-'
  const { selectedOrgs, allOrgs, setSelectedOrgs } = useOrganizationStore()

  const filteredData = processedData.filter((item) => {
    const typeStr = item.contentType?.displayName || ''
    const displayNameStr = item.displayName || ''
    const searchQueryStr = typeof searchQuery === 'string' ? searchQuery : ''

    const matchesFileType = filterQuery === 'all' || typeStr.toLowerCase() === filterQuery
    const matchesSearch = displayNameStr.toLowerCase().includes(searchQueryStr.toLowerCase())
    // org(그룹/사이트) 필터는 서버에서 처리하므로 클라이언트에선 서비스/카테고리/검색만 필터
    const matchesService = selectedServiceId === 'all' || item.externalService?.id === selectedServiceId
    const matchesCategory = selectedLevelCategories.every((cat, index) => {
      if (!cat || cat === 'all') return true
      const code = index === 0 ? item.category1?.categoryCode : item.category2?.categoryCode
      return code === cat
    })

    return matchesFileType && matchesSearch && matchesService && matchesCategory
  })

  // OrganizationSelector 선택 조합 → 서버 필터 쿼리 (전체/그룹/그룹직접/특정site)
  const orgQuery = useMemo(() => resolveOrgQuery(selectedOrgs, allOrgs), [selectedOrgs, allOrgs])

  // 생성은 (groupId, siteId) 대상이 하나로 특정될 때만 가능 → '전체(all)'가 포함되면 비활성
  const canCreate = useMemo(() => selectedOrgs?.[0] !== 'all' && selectedOrgs?.[1] !== 'all', [selectedOrgs])

  const fetchContents = useCallback(async () => {
    // 그룹 '-'(미지정) 선택 → 조회 없이 빈 목록
    if (!orgQuery) {
      setProcessedData([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      // 선택 조합에 맞춰 서버 필터링 (undefined/false 는 axios 가 파라미터에서 제외)
      const response = await contentApis.getContentList(orgQuery)
      setProcessedData(response?.results || [])
    } catch (error) {
      console.error('Failed to fetch contents:', error)
    } finally {
      setIsLoading(false)
    }
  }, [orgQuery])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  // 목록 진입 시 기본 선택을 '전체'로 자동 설정 (기본 store 값 ['none','none'] 이면)
  useEffect(() => {
    if (!selectedOrgs || selectedOrgs[0] === 'none') {
      setSelectedOrgs(['all', 'all'])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 지원 언어 목록 (categoryNode displayName 의 languageId → langCode 변환용)
  useEffect(() => {
    const fetchLanguages = async () => {
      const res = await languageApis.getLanguages()
      setLanguages(res?.results || [])
    }
    fetchLanguages()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (selectedServiceId === 'all') {
        setCategoryTree([{ name: tCommon('all'), value: 'all', tree: [] }])
        return
      }
      const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
      const categoryResponse = await categoryNodeApis.getCategoryNode({
        siteId,
        groupId,
        externalServiceId: selectedServiceId
      })
      const roots = categoryResponse?.results || []
      const tree = buildCategorySelectorTree(roots, {
        langCodeById: buildLangCodeMap(languages),
        currentLanguage: i18n.language,
        withAll: true,
        allLabel: tCommon('all')
      })
      setCategoryTree(tree)
    }
    fetchData()
  }, [selectedServiceId, languages, selectedOrgs, allOrgs, i18n.language])

  useEffect(() => {
    const fetchServiceList = async () => {
      const response = await externalServiceApis.getExternalServices()
      const mappedServices = (response?.results || []).map((service) => ({
        ...service,
        displayName: service.displayName || service.code
      }))
      setServiceList(mappedServices)
      setServiceOptions([
        { value: 'all', name: t('all') },
        ...mappedServices.map((item) => ({ value: item.id, name: item.displayName }))
      ])
    }
    fetchServiceList()
  }, [])

  const columns = [
    {
      name: t('group') || 'Group',
      selector: (row) => row.group?.displayName || '-',
      sortable: 'true'
    },
    {
      name: t('site') || 'Site',
      selector: (row) => row.site?.displayName || '-',
      sortable: 'true'
    },
    {
      name: t('contentName') || 'Content Name',
      selector: (row) => (
        <Button as="NavLink" to={`/cms/content/detail/${row.id}`} theme="link">
          {row.displayName}
        </Button>
      ),
      sortable: 'true'
    },
    {
      name: t('memo') || 'Memo',
      selector: (row) => row.memo,
      sortable: 'true'
    },
    {
      name: t('contentType') || 'Type',
      cell: (row) => {
        const meta = CONTENT_TYPE_MAP[row.contentType?.contentTypeCode || '']
        if (!meta) return <span>-</span>
        return (
          <span
            title={row.contentType?.displayName}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '3.2rem',
              height: '3.2rem',
              borderRadius: '50%',
              background: meta.bg,
              border: `1px solid ${meta.border}`
            }}
          >
            <Icon name={meta.icon} size={18} color={meta.color} />
          </span>
        )
      },
      width: '140px',
      center: true,
      sortable: 'false'
    },
    {
      name: t('service') || 'Service',
      selector: (row) => row.externalService?.displayName || '-',
      sortable: 'true'
    },
    {
      name: t('category1') || 'Category 1',
      selector: (row) => catName(row.category1),
      sortable: 'true'
    },
    {
      name: t('category2') || 'Category 2',
      selector: (row) => catName(row.category2),
      sortable: 'true'
    },
    {
      name: t('label') || 'Label',
      cell: (row) => {
        const names = (row.labels || []).map((l) => l.displayName)
        const key = names.includes('LATEST') ? 'LATEST' : names.includes('PREV') ? 'PREV' : null
        const meta = key && VERSION_LABEL_META[key]
        return (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {meta ? (
              <StyledTag color={meta.color} bgColor={meta.bgColor}>
                {key}
              </StyledTag>
            ) : null}
          </div>
        )
      },
      center: true,
      width: '110px',
      sortable: 'false'
    },
    {
      name: t('date') || 'Date',
      selector: (row) => convertDateToString(row.createdAt),
      sortable: 'true'
    }
  ]

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e?.target?.value ?? '')
  }, [])

  const handleResetSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  const handleCreate = useCallback(() => {
    navigate('/cms/content/detail')
  }, [navigate])

  // 삭제 모드 토글 (끌 때 선택 초기화)
  const handleToggleDeleteMode = useCallback(() => {
    setIsDeleteMode((prev) => !prev)
    setSelectedRows([])
    setToggleCleared((t) => !t)
  }, [])

  const handleRowSelected = useCallback(({ selectedRows: rows }) => {
    setSelectedRows(rows)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    const ids = selectedRows.map((r) => r.id)
    if (ids.length === 0) return
    try {
      await contentApis.deleteContent({ ids })
      toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
      setIsDeleteModalOpen(false)
      setIsDeleteMode(false)
      setSelectedRows([])
      setToggleCleared((t) => !t)
      await fetchContents()
    } catch (error) {
      console.error('Failed to delete contents:', error)
      toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
    }
  }, [selectedRows, tCommon, fetchContents])

  // 선택값은 store(selectedOrgs/allOrgs)로 반영되어 resolveOrgIds → 서버 재조회를 트리거한다.
  // onChange 는 OrganizationSelector 가 actualOrgs 를 갱신하도록 유지용(no-op).
  const handleSelectOrg = useCallback(() => {}, [])

  const handleServiceChange = useCallback((value) => {
    setSelectedServiceId(value)
  }, [])

  const handleCategoryChange = (index, value) => {
    const nextLevels = [...selectedLevelCategories]
    nextLevels[index] = value
    if (index === 0) {
      nextLevels[1] = null
    }

    setSelectedLevelCategories(nextLevels)
  }

  return (
    <StyledPageContent className="column">
      <Title>{t('content')}</Title>
      <OrganizationSelector onChange={handleSelectOrg} supportAlls={[true, true]} />
      <Section>
        <HeaderTitleGroup>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Service */}
            <Dropdown
              label={t('service')}
              size="lg"
              minWidth="180px"
              defaultValue={filterServiceId}
              placeholder={t('selectService')}
              options={serviceOptions}
              onChange={handleServiceChange}
            />
            {/* Category */}
            <CategorySelector
              categoryTree={categoryTree}
              selectedLevelCategories={selectedLevelCategories}
              handleValueChange={handleCategoryChange}
              isDisabled={(info, index) => false}
            />
            {/* Search */}
            <Search
              value={searchQuery}
              label={t('search')}
              width="250px"
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder')}
            />
          </div>
          {/* Delete + Create Buttons */}
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
                {t('delete', '삭제')}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={isDeleteMode || !canCreate}
              title={!canCreate ? t('selectOrgToCreate', '그룹/사이트를 특정하거나 미지정(-)으로 선택하세요') : undefined}
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
        title={t('delete', '삭제')}
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
          <p>
            {t('confirmDeleteContents', {
              count: selectedRows.length,
              defaultValue: '선택한 콘텐츠를 삭제하시겠습니까?'
            })}
          </p>
        </div>
      </Modal>
    </StyledPageContent>
  )
}

export default Content
