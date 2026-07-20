import React, { useState, useMemo, useEffect } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Button,
  OrganizationSelector
} from '@repo/ui'
import LabelTable from '@/components/Label/LabelTable'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { convertDateToString } from '@repo/utils'
import { useOrganizationStore } from '@repo/stores'
import { labelApis } from '@/apis'
import { ButtonWrap } from '@/components/common/styles'

const Label = () => {
  const { t } = useTranslation('label')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const { company, actualOrgs, setForcedNone } = useOrganizationStore()

  const [lables, setLabels] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState('view')

  const fetchLabels = async () => {
    try {
      setIsLoading(true)
      const response = await labelApis.retrieveLabels(company.id)
      setLabels(response.results)
    } catch (error) {
      console.error('Failed to fetch lables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const orgIds = actualOrgs.map((org) => org.id).join(',')

  useEffect(() => {
    fetchLabels()
  }, [orgIds])

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const handleCreate = () => {
    navigate('/cms/label/detail')
  }

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      await labelApis.deleteLabel(company.id)
      fetchLabels()
      setMode('view')
    } catch (error) {
      console.error('Failed to fetch lables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRowClick = (row) => {
    setSelectedLabels((prev) => {
      const isSelected = prev.find((item) => item.id === row.id)
      if (isSelected) {
        return prev.filter((item) => item.id !== row.id)
      }
      return [...prev, row]
    })
  }

  const filteredData = useMemo(() => {
    return lables.filter((item) => {
      const matchesSearch = item.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [lables, searchQuery])

  useEffect(() => {
    if (company?.orgLinkage) {
      setForcedNone(true)
      return () => {
        setForcedNone(false)
      }
    }
  }, [company?.orgLinkage, setForcedNone])

  const columns = [
    {
      name: t('labelName'),
      selector: (row) => row.displayName,
      cell: (row) => (
        <Button as="NavLink" to={`/cms/label/detail/${row.id}`} theme="link">
          {row.displayName}
        </Button>
      ),
      sortable: 'true'
    },
    {
      name: t('systemLabel'),
      selector: (row) => (row.reserved ? 'O' : 'X'),
      sortable: 'true'
    },
    {
      name: t('createdAt'),
      selector: (row) => (row.createdAt ? convertDateToString(row.createdAt) : '-'),
      sortable: 'true'
    }
  ]

  return (
    <StyledPageContent className="column">
      <Title>{t('labelTitle')}</Title>
      <OrganizationSelector disabled={company?.orgLinkage} />
      <Section>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder')}
            />
          </SearchContainer>
          <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
            <Button variant="contained" onClick={mode === 'view' ? () => setMode('delete') : handleDelete}>
              {t('delete')}
            </Button>
            <Button variant="contained" onClick={mode === 'view' ? handleCreate : () => setMode('view')}>
              {t(mode === 'view' ? 'create' : 'cancel')}
            </Button>
          </ButtonWrap>
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count') || 'Count'} : {filteredData.length}
        </div>

        <LabelTable
          columns={columns}
          data={filteredData}
          mode={mode}
          noData={tCommon('noData')}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />
      </Section>
    </StyledPageContent>
  )
}

export default Label
