import { useMemo, useState, useCallback } from 'react'
import {
  PageRoot,
  HeaderRow,
  TitleWrap,
  PageDescription,
  Toolbar,
  SearchInput,
  FilterSelect,
  PrimaryButton,
  SummaryGrid,
  SummaryCard,
  SummaryValue,
  SummaryLabel,
  ContentGrid,
  AddCard,
  AddCardInner,
  AddIcon,
  AddTitle,
  AddDescription,
  EmptyState,
  LoadingBox,
  ErrorBox,
  CompleteModalBackdrop,
  CompleteModalCard,
  CompleteModalTitle,
  CompleteModalDescription,
  CompleteModalActions
} from './styles'
import { createAction, updateActionById, deleteActionById, getActions } from '@/apis/ai/aiApis'
import useActionData from './hooks/useActionData'
import ActionCard from './components/ActionCard'
import ActionDetailModal from './components/ActionDetailModal'

const createEmptyAction = () => ({
  id: Number(`8${Date.now()}`),
  key: '',
  name: '',
  description: '',
  enable: true,
  funcs: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const buildSummary = (actions) => {
  const totalCount = actions.length
  const enabledCount = actions.filter((item) => item.enable).length
  const disabledCount = actions.filter((item) => !item.enable).length

  return {
    totalCount,
    enabledCount,
    disabledCount
  }
}

const normalizeActionKey = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const hasDuplicatedActionKey = (actions, nextAction) => {
  const nextKey = normalizeActionKey(nextAction?.key)
  if (!nextKey) return false

  return actions.some((item) => item.id !== nextAction?.id && normalizeActionKey(item.key) === nextKey)
}

const ActionManagement = () => {
  const { actions, setActions, isLoading, errorMessage } = useActionData()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedActionId, setSelectedActionId] = useState(null)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [completeMessage, setCompleteMessage] = useState('')

  const summary = useMemo(() => buildSummary(actions), [actions])

  const filteredActions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return actions.filter((item) => {
      const matchesQuery =
        !q ||
        String(item.key || '')
          .toLowerCase()
          .includes(q) ||
        String(item.name || '')
          .toLowerCase()
          .includes(q) ||
        String(item.description || '')
          .toLowerCase()
          .includes(q)

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ENABLED' && item.enable) ||
        (statusFilter === 'DISABLED' && !item.enable)

      return matchesQuery && matchesStatus
    })
  }, [actions, searchQuery, statusFilter])

  const selectedAction = useMemo(() => {
    if (!selectedActionId) return null
    return actions.find((item) => item.id === selectedActionId) ?? null
  }, [actions, selectedActionId])

  const openCreateModal = useCallback(() => {
    setMutationError('')
    setSelectedActionId(null)
    setIsCreateMode(true)
  }, [])

  const openDetailModal = useCallback((actionId) => {
    setMutationError('')
    setSelectedActionId(actionId)
    setIsCreateMode(false)
  }, [])

  const closeModal = useCallback(() => {
    setMutationError('')
    setSelectedActionId(null)
    setIsCreateMode(false)
  }, [])

  const closeCompleteModal = useCallback(() => {
    setCompleteMessage('')
  }, [])

  const handleSaveAction = useCallback(
    async (nextAction) => {
      setMutationError('')

      const normalizedAction = {
        ...nextAction,
        key: String(nextAction?.key ?? '').trim()
      }

      try {
        const latestActionsResponse = await getActions()
        const latestActions = Array.isArray(latestActionsResponse?.data) ? latestActionsResponse.data : []

        if (hasDuplicatedActionKey(latestActions, normalizedAction)) {
          setMutationError('동일한 action_key가 이미 존재합니다.')
          return
        }

        const response = isCreateMode
          ? await createAction(normalizedAction)
          : await updateActionById(normalizedAction.id, normalizedAction)

        const savedAction = response?.data ?? normalizedAction

        setActions((prev) => {
          const exists = prev.some((item) => item.id === savedAction.id)

          if (exists) {
            return prev.map((item) => (item.id === savedAction.id ? savedAction : item))
          }

          return [savedAction, ...prev]
        })

        closeModal()
        setCompleteMessage('액션이 저장되었습니다.')
      } catch (error) {
        const message = error?.response?.data?.message
        setMutationError(message || '액션 저장에 실패했습니다.')
      }
    },
    [closeModal, isCreateMode, setActions]
  )

  const handleDeleteAction = useCallback(
    async (actionId) => {
      setMutationError('')

      try {
        await deleteActionById(actionId)
        closeModal()
        setActions((prev) => prev.filter((item) => item.id !== actionId))
        setCompleteMessage('액션이 삭제되었습니다.')
      } catch (error) {
        const message = error?.response?.data?.message
        setMutationError(message || '액션 삭제에 실패했습니다.')
      }
    },
    [closeModal, setActions]
  )

  const modalAction = isCreateMode ? createEmptyAction() : selectedAction

  return (
    <PageRoot>
      <HeaderRow>
        <TitleWrap>
          <PageDescription>액션 key, 이름, 설명, 사용 여부를 관리합니다.</PageDescription>
        </TitleWrap>

        <Toolbar>
          <SearchInput
            placeholder="액션 key, 이름, 설명 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">전체 상태</option>
            <option value="ENABLED">사용</option>
            <option value="DISABLED">미사용</option>
          </FilterSelect>

          <PrimaryButton type="button" onClick={openCreateModal}>
            새 액션 등록
          </PrimaryButton>
        </Toolbar>
      </HeaderRow>

      {isLoading ? <LoadingBox>액션 데이터를 불러오는 중...</LoadingBox> : null}
      {!isLoading && errorMessage ? <ErrorBox>{errorMessage}</ErrorBox> : null}

      {!isLoading && !errorMessage ? (
        <>
          <SummaryGrid>
            <SummaryCard>
              <SummaryValue>{summary.totalCount}</SummaryValue>
              <SummaryLabel>전체 액션</SummaryLabel>
            </SummaryCard>

            <SummaryCard>
              <SummaryValue $tone="success">{summary.enabledCount}</SummaryValue>
              <SummaryLabel>사용 액션</SummaryLabel>
            </SummaryCard>

            <SummaryCard>
              <SummaryValue $tone="warning">{summary.disabledCount}</SummaryValue>
              <SummaryLabel>미사용 액션</SummaryLabel>
            </SummaryCard>
          </SummaryGrid>

          <ContentGrid>
            <AddCard type="button" onClick={openCreateModal}>
              <AddCardInner>
                <AddIcon>+</AddIcon>
                <AddTitle>액션 추가</AddTitle>
                <AddDescription>새 액션의 key, 이름, 설명, 사용 여부를 설정합니다.</AddDescription>
              </AddCardInner>
            </AddCard>

            {filteredActions.map((action) => (
              <ActionCard key={action.id} action={action} onClick={() => openDetailModal(action.id)} />
            ))}
          </ContentGrid>

          {filteredActions.length === 0 ? <EmptyState>검색 조건에 맞는 액션이 없습니다.</EmptyState> : null}
        </>
      ) : null}

      {modalAction ? (
        <ActionDetailModal
          key={`${modalAction.id}-${isCreateMode ? 'create' : 'edit'}`}
          actionItem={modalAction}
          errorMessage={mutationError}
          isCreateMode={isCreateMode}
          onClose={closeModal}
          onSave={handleSaveAction}
          onDelete={handleDeleteAction}
        />
      ) : null}

      {completeMessage ? (
        <CompleteModalBackdrop onClick={closeCompleteModal}>
          <CompleteModalCard onClick={(e) => e.stopPropagation()}>
            <CompleteModalTitle>완료</CompleteModalTitle>
            <CompleteModalDescription>{completeMessage}</CompleteModalDescription>
            <CompleteModalActions>
              <PrimaryButton type="button" onClick={closeCompleteModal}>
                확인
              </PrimaryButton>
            </CompleteModalActions>
          </CompleteModalCard>
        </CompleteModalBackdrop>
      ) : null}
    </PageRoot>
  )
}

export default ActionManagement
