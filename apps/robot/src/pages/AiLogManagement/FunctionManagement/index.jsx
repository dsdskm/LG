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
  TotalCountText,
  FuncGrid,
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
import { createFunc, updateFuncById, deleteFuncById, getFuncs } from '@/apis/ai/aiApis'
import useFuncData from './hooks/useFuncData'
import FuncCard from './components/FuncCard'
import FuncDetailModal from './components/FuncDetailModal'

const createEmptyFunc = () => ({
  id: Number(`9${Date.now()}`),
  name: '',
  tags: [],
  actions: [],
  assignees: [],
  prompt: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const normalizeFuncName = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const hasDuplicatedFuncName = (funcs, nextFunc) => {
  const nextName = normalizeFuncName(nextFunc?.name)
  if (!nextName) return false

  return funcs.some((item) => item.id !== nextFunc?.id && normalizeFuncName(item.name) === nextName)
}

const FunctionManagement = () => {
  const { funcs, accountOptions, isLoading, errorMessage, setFuncs } = useFuncData()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedFuncId, setSelectedFuncId] = useState(null)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [completeMessage, setCompleteMessage] = useState('')

  const filteredFuncs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return funcs.filter((item) => {
      const matchesQuery =
        !q ||
        String(item.name || '')
          .toLowerCase()
          .includes(q) ||
        item.tags.some((tag) => String(tag).toLowerCase().includes(q)) ||
        item.assignees.some((assignee) => String(assignee).toLowerCase().includes(q))

      const isConfigured = String(item.prompt || '').trim().length > 0 && item.assignees.length > 0

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'READY' && isConfigured) ||
        (statusFilter === 'NEEDS_SETUP' && !isConfigured)

      return matchesQuery && matchesStatus
    })
  }, [funcs, searchQuery, statusFilter])

  const selectedFunc = useMemo(() => {
    if (!selectedFuncId) return null
    return funcs.find((item) => item.id === selectedFuncId) ?? null
  }, [funcs, selectedFuncId])

  const openCreateModal = useCallback(() => {
    setMutationError('')
    setSelectedFuncId(null)
    setIsCreateMode(true)
  }, [])

  const openDetailModal = useCallback((funcId) => {
    setMutationError('')
    setSelectedFuncId(funcId)
    setIsCreateMode(false)
  }, [])

  const closeModal = useCallback(() => {
    setMutationError('')
    setSelectedFuncId(null)
    setIsCreateMode(false)
  }, [])

  const closeCompleteModal = useCallback(() => {
    setCompleteMessage('')
  }, [])

  const handleSaveFunc = useCallback(
    async (nextFunc) => {
      setMutationError('')

      const normalizedFunc = {
        ...nextFunc,
        name: String(nextFunc?.name ?? '').trim()
      }

      try {
        const latestFuncsResponse = await getFuncs()
        const latestFuncs = Array.isArray(latestFuncsResponse?.data) ? latestFuncsResponse.data : []

        if (hasDuplicatedFuncName(latestFuncs, normalizedFunc)) {
          setMutationError('동일한 기능명이 이미 존재합니다.')
          return
        }

        const response = isCreateMode
          ? await createFunc(normalizedFunc)
          : await updateFuncById(normalizedFunc.id, normalizedFunc)

        const savedFunc = response?.data ?? normalizedFunc

        setFuncs((prev) => {
          const exists = prev.some((item) => item.id === savedFunc.id)

          if (exists) {
            return prev.map((item) => (item.id === savedFunc.id ? savedFunc : item))
          }

          return [savedFunc, ...prev]
        })

        closeModal()
        setCompleteMessage('기능이 저장되었습니다.')
      } catch (error) {
        const message = error?.response?.data?.message
        setMutationError(message || '기능 저장에 실패했습니다.')
      }
    },
    [closeModal, isCreateMode, setFuncs]
  )

  const handleDeleteFunc = useCallback(
    async (funcId) => {
      setMutationError('')

      try {
        await deleteFuncById(funcId)
        closeModal()
        setFuncs((prev) => prev.filter((item) => item.id !== funcId))
        setCompleteMessage('기능이 삭제되었습니다.')
      } catch (error) {
        const message = error?.response?.data?.message
        setMutationError(message || '기능 삭제에 실패했습니다.')
      }
    },
    [closeModal, setFuncs]
  )

  const modalFunc = isCreateMode ? createEmptyFunc() : selectedFunc

  return (
    <PageRoot>
      <HeaderRow>
        <TitleWrap>
          <PageDescription>기능별 Prompt, 담당자, 분류 태그를 지정해서 관리합니다.</PageDescription>
        </TitleWrap>

        <Toolbar>
          <SearchInput
            placeholder="기능명, 태그, 담당자 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">전체 상태</option>
            <option value="READY">설정 완료</option>
            <option value="NEEDS_SETUP">추가 필요</option>
          </FilterSelect>

          <PrimaryButton type="button" onClick={openCreateModal}>
            새 기능 등록
          </PrimaryButton>
        </Toolbar>
      </HeaderRow>

      {isLoading ? <LoadingBox>기능 데이터를 불러오는 중...</LoadingBox> : null}
      {!isLoading && errorMessage ? <ErrorBox>{errorMessage}</ErrorBox> : null}

      {!isLoading && !errorMessage ? (
        <>
          <TotalCountText>전체 기능 수: {funcs.length}</TotalCountText>

          <FuncGrid>
            <AddCard type="button" onClick={openCreateModal}>
              <AddCardInner>
                <AddIcon>+</AddIcon>
                <AddTitle>기능 추가</AddTitle>
                <AddDescription>새 기능을 만들고 Prompt, 담당자, tags를 설정합니다.</AddDescription>
              </AddCardInner>
            </AddCard>

            {filteredFuncs.map((func) => (
              <FuncCard key={func.id} func={func} onClick={() => openDetailModal(func.id)} />
            ))}
          </FuncGrid>

          {filteredFuncs.length === 0 ? <EmptyState>검색 조건에 맞는 기능이 없습니다.</EmptyState> : null}
        </>
      ) : null}

      {modalFunc ? (
        <FuncDetailModal
          key={`${modalFunc.id}-${isCreateMode ? 'create' : 'edit'}`}
          funcItem={modalFunc}
          errorMessage={mutationError}
          isCreateMode={isCreateMode}
          accountOptions={accountOptions}
          onClose={closeModal}
          onSave={handleSaveFunc}
          onDelete={handleDeleteFunc}
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

export default FunctionManagement
