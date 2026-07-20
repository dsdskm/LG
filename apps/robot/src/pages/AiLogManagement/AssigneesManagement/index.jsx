import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { getFuncs, getAssignees, putFuncAssignees, deleteFuncAssignees } from '@/apis/ai/aiApis'
import {
  PageRoot,
  HeaderRow,
  TitleWrap,
  PageDescription,
  Toolbar,
  SearchInput,
  TeamSelect,
  FuncFilterSelect,
  SummaryText,
  ListPanel,
  ListHeader,
  HeaderCell,
  ListBody,
  ListRow,
  Cell,
  MobileLabel,
  ProfileCell,
  Avatar,
  AvatarImage,
  NameWrap,
  NameText,
  ProfileHint,
  ActionRow,
  ActionButton,
  AddButton,
  DeleteButton,
  EmptyState,
  LoadingBox,
  ErrorBox,
  FormModalBackdrop,
  FormModalCard,
  FormModalTitle,
  FormGrid,
  FieldGroup,
  FieldLabel,
  FieldInput,
  FieldSelect,
  FileInput,
  FileMeta,
  ClearFileButton,
  FormModalError,
  FormModalActions,
  SecondaryButton,
  ConfirmDeleteButton,
  CompleteModalBackdrop,
  CompleteModalCard,
  CompleteModalTitle,
  CompleteModalDescription,
  CompleteModalActions,
  PrimaryButton
} from './styles'

const isLikelyImageSource = (value) => {
  const profile = String(value ?? '').trim()
  if (!profile) return false

  return /^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/)/i.test(profile) || /\.(png|jpe?g|gif|webp|svg)$/i.test(profile)
}

const toInitial = (name) => {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1).toUpperCase()
}

const normalizeFuncKey = (value) => String(value ?? '').trim()

const createEmptyAssignee = () => ({
  id: `local-${Date.now()}`,
  email: '',
  name: '',
  team: '',
  func: '',
  profile: '',
  profileFileName: ''
})

const TEAM_OPTIONS = ['1팀', '2팀', '3팀', '4팀', '5팀']

const revokeObjectUrlSafely = (value) => {
  const url = String(value ?? '').trim()
  if (!url.startsWith('blob:')) return

  try {
    URL.revokeObjectURL(url)
  } catch (error) {
    // no-op: safe cleanup only
  }
}

const AssigneesManagement = () => {
  const [assignees, setAssignees] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [funcFilter, setFuncFilter] = useState('ALL')
  const [funcOptions, setFuncOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [completeMessage, setCompleteMessage] = useState('')
  const [pendingDeleteAssignee, setPendingDeleteAssignee] = useState(null)
  const [editingDraft, setEditingDraft] = useState(null)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const profileFileInputRef = useRef(null)

  const loadAssignees = useCallback(async () => {
    const response = await getAssignees()
    const rows = Array.isArray(response?.data) ? response.data : []
    return rows
  }, [])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [nextRows, funcsResponse] = await Promise.all([loadAssignees(), getFuncs()])
        if (!isMounted) return
        const nextFuncs = Array.isArray(funcsResponse?.data?.data)
          ? funcsResponse.data.data
          : []

        setFuncOptions(
          nextFuncs
            .map((item) => String(item?.name || '').trim())
            .filter(Boolean)
        )

        setAssignees(nextRows)
      } catch (error) {
        if (!isMounted) return
        const message = error?.response?.data?.message
        setAssignees([])
        setFuncOptions([])
        setErrorMessage(message || '담당자 데이터를 불러오지 못했습니다.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [loadAssignees])

  const funcSelectOptions = useMemo(() => {
    const fromApi = Array.isArray(funcOptions) ? funcOptions : []
    const current = String(editingDraft?.func || '').trim()

    if (!current) return fromApi
    if (fromApi.includes(current)) return fromApi
    return [current, ...fromApi]
  }, [editingDraft?.func, funcOptions])

  const teams = useMemo(() => {
    const values = assignees.map((item) => String(item.team || '').trim()).filter(Boolean)

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
  }, [assignees])

  const teamFilterOptions = useMemo(() => {
    const extraTeams = teams.filter((team) => !TEAM_OPTIONS.includes(team))
    return [...TEAM_OPTIONS, ...extraTeams]
  }, [teams])

  const filteredAssignees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return assignees.filter((item) => {
      const matchesQuery =
        !q ||
        String(item.name || '')
          .toLowerCase()
          .includes(q) ||
        String(item.email || '')
          .toLowerCase()
          .includes(q) ||
        String(item.team || '')
          .toLowerCase()
          .includes(q) ||
        String(item.func || '')
          .toLowerCase()
          .includes(q) ||
        String(item.profileFileName || '')
          .toLowerCase()
          .includes(q)

      const matchesTeam = teamFilter === 'ALL' || String(item.team || '') === teamFilter
      const matchesFunc = funcFilter === 'ALL' || String(item.func || '') === funcFilter

      return matchesQuery && matchesTeam && matchesFunc
    })
  }, [assignees, funcFilter, searchQuery, teamFilter])

  const funcs = useMemo(() => {
    const values = assignees.map((item) => String(item.func || '').trim()).filter(Boolean)

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
  }, [assignees])

  const openCreateModal = useCallback(() => {
    setIsCreateMode(true)
    setFormError('')
    setEditingDraft(createEmptyAssignee())
  }, [])

  const openEditModal = useCallback((assignee) => {
    setIsCreateMode(false)
    setFormError('')
    setEditingDraft({
      ...assignee,
      func: String(assignee.func || ''),
      profileFileName: String(assignee.profileFileName || '')
    })
  }, [])

  const closeFormModal = useCallback(() => {
    setEditingDraft(null)
    setFormError('')
  }, [])

  const updateDraftField = useCallback((key, value) => {
    setEditingDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [key]: value
      }
    })
  }, [])

  const handleSaveDraft = useCallback(() => {
    const run = async () => {
      if (!editingDraft) return

      const email = String(editingDraft.email || '').trim()
      const name = String(editingDraft.name || '').trim()
      const team = String(editingDraft.team || '').trim()
      const func = String(editingDraft.func || '').trim()
      const profile = String(editingDraft.profile || '').trim()
      const profileFileName = String(editingDraft.profileFileName || '').trim()

      if (!email || !name) {
        setFormError('이름과 이메일은 필수입니다.')
        return
      }

      if (!func) {
        setFormError('기능은 필수입니다.')
        return
      }

      const hasDuplicateEmail = assignees.some(
        (item) => item.id !== editingDraft.id && String(item.email || '').toLowerCase() === email.toLowerCase()
      )

      if (hasDuplicateEmail) {
        setFormError('동일한 이메일의 담당자가 이미 존재합니다.')
        return
      }

      const nextAssignee = {
        ...editingDraft,
        email,
        name,
        team,
        func,
        profile,
        profileFileName,
        job: profile
      }

      setIsSubmitting(true)
      setFormError('')

      try {
        const previous = assignees.find((item) => item.id === editingDraft.id) ?? null
        const previousFunc = normalizeFuncKey(previous?.func)
        const nextFunc = normalizeFuncKey(nextAssignee.func)

        if (previous && previousFunc && previousFunc !== nextFunc) {
          const remainingInOldFunc = assignees
            .filter((item) => item.id !== nextAssignee.id && normalizeFuncKey(item.func) === previousFunc)
            .map((item) => ({
              email: String(item.email || '').trim(),
              name: String(item.name || '').trim(),
              team: String(item.team || '').trim(),
              profile: String(item.profile || '').trim(),
              tags: []
            }))

          if (remainingInOldFunc.length === 0) {
            await deleteFuncAssignees(previousFunc)
          } else {
            await putFuncAssignees(previousFunc, { assignees: remainingInOldFunc })
          }
        }

        const assigneesInNextFunc = assignees
          .filter((item) => item.id !== nextAssignee.id && normalizeFuncKey(item.func) === nextFunc)
          .map((item) => ({
            email: String(item.email || '').trim(),
            name: String(item.name || '').trim(),
            team: String(item.team || '').trim(),
            profile: String(item.profile || '').trim(),
            tags: []
          }))

        assigneesInNextFunc.push({
          email: nextAssignee.email,
          name: nextAssignee.name,
          team: nextAssignee.team,
          profile: nextAssignee.profile,
          tags: []
        })

        await putFuncAssignees(nextFunc, { assignees: assigneesInNextFunc })

        const refreshedRows = await loadAssignees()
        setAssignees(refreshedRows)
        closeFormModal()
        setCompleteMessage(isCreateMode ? '담당자가 추가되었습니다.' : '담당자가 수정되었습니다.')
      } catch (error) {
        const message = error?.response?.data?.message
        setFormError(message || '담당자 저장에 실패했습니다.')
      } finally {
        setIsSubmitting(false)
      }
    }

    run()
  }, [assignees, closeFormModal, editingDraft, isCreateMode, loadAssignees])

  const openDeleteConfirmModal = useCallback((assignee) => {
    setPendingDeleteAssignee(assignee)
  }, [])

  const closeDeleteConfirmModal = useCallback(() => {
    setPendingDeleteAssignee(null)
  }, [])

  const handleDeleteAssignee = useCallback(() => {
    const run = async () => {
      if (!pendingDeleteAssignee) return

      const targetFunc = normalizeFuncKey(pendingDeleteAssignee.func)
      if (!targetFunc) {
        setPendingDeleteAssignee(null)
        setErrorMessage('삭제 대상의 기능 정보가 없습니다.')
        return
      }

      setIsDeleting(true)
      setErrorMessage('')

      try {
        const remainingInFunc = assignees
          .filter((item) => item.id !== pendingDeleteAssignee.id && normalizeFuncKey(item.func) === targetFunc)
          .map((item) => ({
            email: String(item.email || '').trim(),
            name: String(item.name || '').trim(),
            team: String(item.team || '').trim(),
            profile: String(item.profile || '').trim(),
            tags: []
          }))

        if (remainingInFunc.length === 0) {
          await deleteFuncAssignees(targetFunc)
        } else {
          await putFuncAssignees(targetFunc, { assignees: remainingInFunc })
        }

        revokeObjectUrlSafely(pendingDeleteAssignee.profile)
        const refreshedRows = await loadAssignees()
        setAssignees(refreshedRows)
        setPendingDeleteAssignee(null)
        setCompleteMessage('담당자가 삭제되었습니다.')
      } catch (error) {
        const message = error?.response?.data?.message
        setErrorMessage(message || '담당자 삭제에 실패했습니다.')
      } finally {
        setIsDeleting(false)
      }
    }

    run()
  }, [assignees, loadAssignees, pendingDeleteAssignee])

  const handleProfileFileChange = useCallback((event) => {
    const file = event.target.files?.[0]

    if (!file) {
      event.target.value = ''
      return
    }

    setEditingDraft((prev) => {
      if (!prev) return prev

      const nextProfileUrl = URL.createObjectURL(file)
      revokeObjectUrlSafely(prev.profile)

      return {
        ...prev,
        profile: nextProfileUrl,
        profileFileName: file.name
      }
    })

    setCompleteMessage(`프로필 이미지 업로드 이벤트만 연결되었습니다. (${file.name})`)
    event.target.value = ''
  }, [])

  const clearProfileFile = useCallback(() => {
    setEditingDraft((prev) => {
      if (!prev) return prev

      revokeObjectUrlSafely(prev.profile)

      return {
        ...prev,
        profile: '',
        profileFileName: ''
      }
    })
  }, [])

  const closeCompleteModal = useCallback(() => {
    setCompleteMessage('')
  }, [])

  return (
    <PageRoot>
      <HeaderRow>
        <TitleWrap>
          <PageDescription>담당자 목록을 조회하고 담당자 정보를 추가/수정/삭제할 수 있습니다.</PageDescription>
        </TitleWrap>

        <Toolbar>
          <AddButton type="button" onClick={openCreateModal}>
            담당자 추가
          </AddButton>

          <SearchInput
            placeholder="이름, 이메일, 팀, 기능 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <TeamSelect value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="ALL">전체 팀</option>
            {teamFilterOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </TeamSelect>

          <FuncFilterSelect value={funcFilter} onChange={(e) => setFuncFilter(e.target.value)}>
            <option value="ALL">전체 기능</option>
            {funcs.map((funcName) => (
              <option key={funcName} value={funcName}>
                {funcName}
              </option>
            ))}
          </FuncFilterSelect>
        </Toolbar>
      </HeaderRow>

      {isLoading ? <LoadingBox>담당자 데이터를 불러오는 중...</LoadingBox> : null}
      {!isLoading && errorMessage ? <ErrorBox>{errorMessage}</ErrorBox> : null}

      {!isLoading && !errorMessage ? (
        <>
          <SummaryText>총 담당자 수: {filteredAssignees.length}명</SummaryText>

          <ListPanel>
            <ListHeader>
              <HeaderCell>프로필</HeaderCell>
              <HeaderCell>이메일</HeaderCell>
              <HeaderCell>팀</HeaderCell>
              <HeaderCell>기능</HeaderCell>
              <HeaderCell>작업</HeaderCell>
            </ListHeader>

            <ListBody>
              {filteredAssignees.map((assignee) => (
                <ListRow key={String(assignee.id || assignee.email)}>
                  <Cell>
                    <MobileLabel>프로필</MobileLabel>
                    <ProfileCell>
                      <Avatar>
                        {isLikelyImageSource(assignee.profile) ? (
                          <AvatarImage src={assignee.profile} alt={`${assignee.name || 'assignee'} profile`} />
                        ) : (
                          toInitial(assignee.name)
                        )}
                      </Avatar>

                      <NameWrap>
                        <NameText>{assignee.name || '-'}</NameText>
                        <ProfileHint>{assignee.profile || '프로필 이미지 없음'}</ProfileHint>
                      </NameWrap>
                    </ProfileCell>
                  </Cell>

                  <Cell>
                    <MobileLabel>이메일</MobileLabel>
                    {assignee.email || '-'}
                  </Cell>

                  <Cell>
                    <MobileLabel>팀</MobileLabel>
                    {assignee.team || '-'}
                  </Cell>

                  <Cell>
                    <MobileLabel>기능</MobileLabel>
                    {assignee.func || '-'}
                  </Cell>

                  <Cell>
                    <MobileLabel>작업</MobileLabel>
                    <ActionRow>
                      <ActionButton type="button" onClick={() => openEditModal(assignee)}>
                        수정
                      </ActionButton>
                      <DeleteButton type="button" onClick={() => openDeleteConfirmModal(assignee)}>
                        삭제
                      </DeleteButton>
                    </ActionRow>
                  </Cell>
                </ListRow>
              ))}
            </ListBody>

            {filteredAssignees.length === 0 ? <EmptyState>검색 조건에 맞는 담당자가 없습니다.</EmptyState> : null}
          </ListPanel>
        </>
      ) : null}

      {editingDraft ? (
        <FormModalBackdrop onClick={closeFormModal}>
          <FormModalCard onClick={(e) => e.stopPropagation()}>
            <FormModalTitle>{isCreateMode ? '담당자 추가' : '담당자 수정'}</FormModalTitle>

            <FormGrid>
              <FieldGroup>
                <FieldLabel>이름 *</FieldLabel>
                <FieldInput
                  value={editingDraft.name || ''}
                  onChange={(e) => updateDraftField('name', e.target.value)}
                  placeholder="예: Owner Kim"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>이메일 *</FieldLabel>
                <FieldInput
                  value={editingDraft.email || ''}
                  onChange={(e) => updateDraftField('email', e.target.value)}
                  placeholder="예: owner@example.com"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>팀</FieldLabel>
                <FieldSelect value={editingDraft.team || ''} onChange={(e) => updateDraftField('team', e.target.value)}>
                  <option value="">팀 선택</option>
                  {TEAM_OPTIONS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </FieldSelect>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>기능</FieldLabel>
                <FieldSelect value={editingDraft.func || ''} onChange={(e) => updateDraftField('func', e.target.value)}>
                  <option value="">기능 선택</option>
                  {funcSelectOptions.map((funcName) => (
                    <option key={funcName} value={funcName}>
                      {funcName}
                    </option>
                  ))}
                </FieldSelect>
              </FieldGroup>

              <FieldGroup $span2>
                <FieldLabel>프로필 이미지 파일</FieldLabel>
                <FileInput ref={profileFileInputRef} type="file" accept="image/*" onChange={handleProfileFileChange} />
                <FileMeta>{editingDraft.profileFileName || '선택된 파일 없음 (실제 업로드는 미연결)'}</FileMeta>
                {editingDraft.profileFileName ? (
                  <ActionRow>
                    <ClearFileButton type="button" onClick={clearProfileFile}>
                      선택 파일명 초기화
                    </ClearFileButton>
                  </ActionRow>
                ) : null}
              </FieldGroup>
            </FormGrid>

            {formError ? <FormModalError>{formError}</FormModalError> : null}

            <FormModalActions>
              <SecondaryButton type="button" onClick={closeFormModal}>
                취소
              </SecondaryButton>
              <PrimaryButton type="button" onClick={handleSaveDraft}>
                {isSubmitting ? '저장 중...' : '저장'}
              </PrimaryButton>
            </FormModalActions>
          </FormModalCard>
        </FormModalBackdrop>
      ) : null}

      {pendingDeleteAssignee ? (
        <CompleteModalBackdrop onClick={closeDeleteConfirmModal}>
          <CompleteModalCard onClick={(e) => e.stopPropagation()}>
            <CompleteModalTitle>삭제 확인</CompleteModalTitle>
            <CompleteModalDescription>
              {`${pendingDeleteAssignee.name || pendingDeleteAssignee.email} 담당자를 삭제하시겠습니까?`}
            </CompleteModalDescription>
            <CompleteModalActions>
              <SecondaryButton type="button" onClick={closeDeleteConfirmModal}>
                취소
              </SecondaryButton>
              <ConfirmDeleteButton type="button" onClick={handleDeleteAssignee}>
                {isDeleting ? '삭제 중...' : '삭제'}
              </ConfirmDeleteButton>
            </CompleteModalActions>
          </CompleteModalCard>
        </CompleteModalBackdrop>
      ) : null}

      {completeMessage ? (
        <CompleteModalBackdrop onClick={closeCompleteModal}>
          <CompleteModalCard onClick={(e) => e.stopPropagation()}>
            <CompleteModalTitle>알림</CompleteModalTitle>
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

export default AssigneesManagement
