import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Table,
  Button,
  Radio,
  Icon,
  UITooltip,
  StyledTag,
  Dropdown,
  Search,
  SearchContainer,
  HeaderTitleGroup
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { forgeApis } from '@/apis'
import { convertDateToString } from '@repo/utils'
import { ButtonWrap } from '@/components/common/styles'

const ForgeListModal = ({ isOpen, onClose, onConfirm, companyId }) => {
  const { t } = useTranslation('artifact')
  const { t: tCommon } = useTranslation('common')
  const [forgeModels, setForgeModels] = useState([])
  const [selectedRow, setSelectedRow] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filterFoundationModel, setFilterFoundationModel] = useState('all')
  const [searchTaskName, setSearchTaskName] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const fetchForgeModels = async () => {
      setIsLoading(true)
      try {
        const response = await forgeApis.retrieveForgeArtifacts(companyId)
        setForgeModels(response?.results?.forgeModels || [])
      } catch (error) {
        console.error('Failed to retrieve forge models:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchForgeModels()
  }, [isOpen, companyId])

  useEffect(() => {
    if (isOpen) {
      setSelectedRow(null)
      setFilterFoundationModel('all')
      setSearchTaskName('')
    }
  }, [isOpen])

  const foundationModelOptions = useMemo(() => {
    const models = forgeModels
      .map((row) => row.trainedModelMetadata?.trainingBase?.foundationModelName)
      .filter((name) => name && name !== '-')
    const uniqueModels = Array.from(new Set(models))
    return [{ value: 'all', name: t('all') || 'All' }, ...uniqueModels.map((model) => ({ value: model, name: model }))]
  }, [forgeModels, t])

  const filteredForgeModels = useMemo(() => {
    return forgeModels.filter((row) => {
      const taskName = row.trainedModelMetadata?.trainedFor?.taskName || ''
      const matchesSearch = taskName.toLowerCase().includes(searchTaskName.toLowerCase())

      const foundationModel = row.trainedModelMetadata?.trainingBase?.foundationModelName || ''
      const matchesFilter = filterFoundationModel === 'all' || foundationModel === filterFoundationModel

      return matchesSearch && matchesFilter
    })
  }, [forgeModels, searchTaskName, filterFoundationModel])

  const columns = useMemo(
    () => [
      {
        name: t('taskName') || 'Task Name',
        selector: (row) => row.trainedModelMetadata?.trainedFor?.taskName || '-',
        sortable: true
      },
      {
        name: t('primarySkillName') || 'Primary Skill Name',
        selector: (row) => row.trainedModelMetadata?.trainedFor?.primarySkillName || '-',
        sortable: true
      },
      {
        name: t('taskInstruction') || 'Task Instruction',
        cell: (row) => (
          <div
            style={{ display: 'flex', justifyContent: 'center' }}
            data-tooltip-id="task-instruction-tooltip"
            data-tooltip-desc={`${row.trainedModelMetadata?.trainedFor?.taskInstruction}\n${row.trainedModelMetadata?.trainedFor?.subtaskInstruction}`}
          >
            <Icon name="info" size={20} />
          </div>
        ),
        sortable: true,
        width: '100px'
      },
      {
        name: t('foundationModelName') || 'Foundation Model',
        selector: (row) => row.trainedModelMetadata?.trainingBase?.foundationModelName || '-',
        sortable: true,
        minWidth: '100px'
      },
      {
        name: t('tags') || 'Tags',
        selector: (row) => row.trainedModelMetadata?.tags?.map((tag) => <StyledTag key={tag}>{tag}</StyledTag>) || '-',
        sortable: true,
        grow: 2
      },
      {
        name: t('createdAt') || 'Created Date',
        selector: (row) => (row.createdAt ? convertDateToString(row.createdAt) : '-'),
        sortable: true
      }
    ],
    [t]
  )

  const handleRowSelected = ({ selectedRows }) => {
    setSelectedRow(selectedRows[0] || null)
  }

  const handleConfirm = () => {
    if (selectedRow) {
      onConfirm(selectedRow)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={t('forgeArtifact')}
      onClose={onClose}
      size="xl"
      renderButtonComponent={
        <ButtonWrap className="alignRight" style={{ marginTop: '2rem' }}>
          <Button variant="contained" onClick={handleConfirm} disabled={!selectedRow || isLoading}>
            {tCommon('confirm')}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {tCommon('cancel')}
          </Button>
        </ButtonWrap>
      }
    >
      <HeaderTitleGroup style={{ marginBottom: '1.5rem', gap: '1rem' }}>
        <Dropdown
          size="lg"
          minWidth="180px"
          label={t('foundationModelName')}
          value={filterFoundationModel}
          placeholder={t('selectFoundationModel')}
          options={foundationModelOptions}
          onChange={setFilterFoundationModel}
        />
        <SearchContainer style={{ width: 'auto' }}>
          <Search
            value={searchTaskName}
            label={t('taskName')}
            onChange={(e) => setSearchTaskName(e.target.value)}
            onReset={() => setSearchTaskName('')}
            placeholder={t('searchTaskName')}
            width={'300px'}
          />
        </SearchContainer>
      </HeaderTitleGroup>
      <Table
        key={isOpen ? 'open' : 'closed'}
        data={filteredForgeModels}
        columns={columns}
        isLoading={isLoading}
        noData={t('noData')}
        selectableRows
        selectableRowsSingle
        selectableRowsComponent={Radio}
        onSelectedRowsChange={handleRowSelected}
        pagination
        paginationRowsPerPageOptions={[5, 10, 20]}
        paginationPerPage={5}
      />
      <UITooltip id="task-instruction-tooltip" />
      <UITooltip id="subtask-instruction-tooltip" />
    </Modal>
  )
}

export default ForgeListModal
