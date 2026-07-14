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
  Button,
  Table,
  OrganizationSelector
} from '@repo/ui'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ButtonWrap } from './styles'
import { useOrganizationStore } from '@repo/stores'
import { contentTypeApis, categoryTreeApis } from '@/apis'
import { convertDateToString } from '@repo/utils'

const ContentType = () => {
  const [filterCategoryQuery, setFilterCategoryQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { company, actualOrgs, setForcedNone } = useOrganizationStore()
  const orgIds = actualOrgs.map((org) => org.id).join(',')

  const [processedData, setProcessedData] = useState([
    {
      id: 1,
      displayName: 'Image',
      type: 'image',
      category: 'face'
    },
    {
      id: 2,
      displayName: 'TTS',
      type: 'sound',
      category: 'tts'
    },
    {
      id: 3,
      displayName: 'Sound',
      type: 'sound',
      category: 'sound-effect'
    },
    {
      id: 4,
      displayName: 'FBX',
      type: 'fbx',
      category: 'face'
    }
  ])
  const [categoryOptions, setCategoryOptions] = useState([
    { value: 'all', name: 'All' },
    { value: 'move', name: 'Move' },
    { value: 'motion', name: 'Motion' },
    { value: 'control', name: 'Control' }
  ])
  const navigate = useNavigate()
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')

  const filteredData = processedData.filter((item) => {
    const typeStr = item.type || ''
    const displayNameStr = item.displayName || ''
    const searchQueryStr = searchQuery || ''

    const matchesCategory = filterCategoryQuery === 'all' || typeStr.toLowerCase() === filterCategoryQuery
    const matchesSearch = displayNameStr.toLowerCase().includes(searchQueryStr.toLowerCase())

    return matchesCategory && matchesSearch
  })

  const handleFilterCategoryChange = useCallback((value) => {
    setFilterCategoryQuery(value)
  }, [])

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value)
  }, [])

  const handleResetSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  const handleCreate = useCallback(() => {
    navigate('/cms/settings/contentType/detail')
  }, [navigate])

  const tableHeader = () => {
    return {
      columns: [
        {
          name: t('contentTypeName') || 'Content Type Name',
          selector: (row) => (
            <Button as="NavLink" to={`/cms/settings/contentType/detail/${row.id}`} theme="link">
              {row.displayName}
            </Button>
          ),
          sortable: 'true'
        },
        {
          name: t('category') || 'Category',
          selector: (row) => row.code,
          sortable: 'true'
        },
        {
          name: t('createdAt') || 'Created At',
          selector: (row) => convertDateToString(row.createdAt),
          sortable: 'true'
        }
      ]
    }
  }

  useEffect(() => {
    if (company?.orgLinkage) {
      setForcedNone(true)
      return () => {
        setForcedNone(false)
      }
    }
  }, [company?.orgLinkage, setForcedNone])

  useEffect(() => {
    if (actualOrgs.length === 0) {
      setIsLoading(false)
      return
    }
    const fetchData = async () => {
      setIsLoading(true)
      const response = await contentTypeApis.retrieveContentTypes(orgIds)
      setProcessedData(response.results)
      setIsLoading(false)
    }
    fetchData()
  }, [orgIds])

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const response = await categoryTreeApis.retrieveCategories(orgIds)
      setCategoryOptions(response.results.map((item) => ({ value: item.code, name: item.displayName })))
      setIsLoading(false)
    }
    fetchData()
  }, [])

  return (
    <StyledPageContent className="column">
      <Title>{t('contentType')}</Title>
      <OrganizationSelector />
      <Section>
        <HeaderTitleGroup>
          <Dropdown
            size="lg"
            minWidth="180px"
            defaultValue={filterCategoryQuery}
            placeholder={t('selectCategory')}
            options={categoryOptions}
            onChange={handleFilterCategoryChange}
          />
          <SearchContainer>
            <Search
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder')}
            />
          </SearchContainer>
          <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
            <Button variant="contained" onClick={handleCreate} disabled={actualOrgs.length !== 1}>
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
              columns={tableHeader().columns}
              noData={tCommon('noData')}
              isLoading={isLoading}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
            />
          </Suspense>
        )}
      </Section>
    </StyledPageContent>
  )
}

export default ContentType
