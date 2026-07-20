import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChipList, Chip } from '../styles'
import {
  ModalBackdrop,
  ModalContainer,
  ModalHeader,
  ModalTitleWrap,
  ModalTitle,
  ModalDescription,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FooterActions,
  FormSection,
  FormSectionHeader,
  FormSectionTitle,
  FormGrid,
  FieldGroup,
  FieldLabel,
  FieldInput,
  FieldTextarea,
  EditableList,
  GhostButton,
  DangerGhostButton,
  SecondaryButton,
  SelectInput,
  LabelRow,
  HelpTooltip,
  HelpTooltipTrigger,
  HelpTooltipBubble,
  FooterHint,
  EmptyStateSmall,
  AssigneeList,
  AssigneeCard,
  AssigneeIdentityRow,
  AssigneeName,
  AssigneeMeta,
  AssigneeMetaLine,
  AssigneeActions,
  AssigneeAddRow,
  AssigneeAddLabel,
  AssigneeSelectWrap,
  TagInputRow,
  ModalErrorMessage,
  Avatar,
  AvatarImage
} from './modal.styles'
import { PrimaryButton } from '../styles'

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

const cloneFunc = (item) => JSON.parse(JSON.stringify(item))

const getAccountByName = (accountOptions, assigneeName) => {
  return accountOptions.find((account) => account?.name === assigneeName || account?.email === assigneeName) ?? null
}

const normalizeEmail = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const FuncDetailModal = ({ funcItem, errorMessage, isCreateMode, accountOptions, onClose, onSave, onDelete }) => {
  const [draft, setDraft] = useState(() => cloneFunc(funcItem))
  const [newTag, setNewTag] = useState('')
  const [selectedAssigneeName, setSelectedAssigneeName] = useState('')
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [assigneeErrorMessage, setAssigneeErrorMessage] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [documentFileName, setDocumentFileName] = useState('')
  const documentInputRef = useRef(null)

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  const updateField = useCallback((key, value) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const addTag = useCallback(() => {
    const value = newTag.trim()
    if (!value) return

    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.includes(value) ? prev.tags : [...prev.tags, value]
    }))
    setNewTag('')
  }, [newTag])

  const removeTag = useCallback((target) => {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.filter((item) => item !== target)
    }))
  }, [])

  const addAssignee = useCallback(() => {
    const value = String(selectedAssigneeName || '').trim()
    if (!value) return

    const selectedAccount = getAccountByName(accountOptions, value)
    const nextEmail = normalizeEmail(selectedAccount?.email ?? value)

    const hasDuplicateEmail = draft.assignees.some((assigneeName) => {
      const currentAccount = getAccountByName(accountOptions, assigneeName)
      const currentEmail = normalizeEmail(currentAccount?.email ?? assigneeName)
      return nextEmail && currentEmail === nextEmail
    })

    if (hasDuplicateEmail) {
      setAssigneeErrorMessage('동일한 이메일의 담당자가 이미 추가되어 있습니다.')
      return
    }

    setDraft((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(value) ? prev.assignees : [...prev.assignees, value]
    }))
    setAssigneeErrorMessage('')
    setSelectedAssigneeName('')
  }, [accountOptions, draft.assignees, selectedAssigneeName])

  const removeAssignee = useCallback((target) => {
    setDraft((prev) => ({
      ...prev,
      assignees: prev.assignees.filter((item) => item !== target)
    }))
    setAssigneeErrorMessage('')
  }, [])

  const openDocumentPicker = useCallback(() => {
    documentInputRef.current?.click()
  }, [])

  const handleDocumentChange = useCallback((e) => {
    const file = e.target.files?.[0]
    setDocumentFileName(file?.name ?? '')
  }, [])

  const handleDeleteClick = useCallback(() => {
    setIsDeleteConfirmOpen(true)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setIsDeleteConfirmOpen(false)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    onDelete(draft.id)
  }, [draft.id, onDelete])

  const funcFilteredAccounts = useMemo(() => {
    const funcName = String(draft?.name ?? '')
      .trim()
      .toLowerCase()
    if (!funcName) return accountOptions

    return accountOptions.filter(
      (account) =>
        String(account?.func ?? '')
          .trim()
          .toLowerCase() === funcName
    )
  }, [accountOptions, draft?.name])

  const selectedAssigneeAccounts = useMemo(() => {
    return draft.assignees.map((name) => {
      const matched = getAccountByName(funcFilteredAccounts, name) ?? getAccountByName(accountOptions, name)

      return {
        key: name,
        name: matched?.name ?? name,
        team: matched?.team ?? '-',
        profile: matched?.profile ?? matched?.job ?? ''
      }
    })
  }, [accountOptions, draft.assignees, funcFilteredAccounts])

  const availableAccounts = useMemo(() => {
    return accountOptions.filter((account) => !draft.assignees.includes(account.name))
  }, [accountOptions, draft.assignees])

  const isSavable = useMemo(() => {
    return String(draft.name || '').trim().length > 0
  }, [draft.name])

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <ModalBackdrop>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitleWrap>
            <ModalTitle>{isCreateMode ? '기능 등록' : `${draft.name || '기능'}`}</ModalTitle>
            <ModalDescription>현재 스키마 기준으로 이슈를 분류하고 분석하여 담당자에게 알립니다.</ModalDescription>
          </ModalTitleWrap>

          <ModalCloseButton type="button" onClick={onClose}>
            ×
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <FormSection>
            <FormSectionHeader>
              <FormSectionTitle>기본 정보</FormSectionTitle>
            </FormSectionHeader>

            <FormGrid>
              <FieldGroup>
                <FieldLabel>기능명</FieldLabel>
                <FieldInput
                  value={draft.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="예: 주행"
                />

                <FieldLabel>설명</FieldLabel>
                <FieldInput
                  value={draft.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="예: 주행 관련 로그를 분류하고 분석하는 기능"
                />
              </FieldGroup>

              <FieldGroup>
                <LabelRow>
                  <FieldLabel>분석 Prompt</FieldLabel>

                  <HelpTooltip>
                    <HelpTooltipTrigger type="button">?</HelpTooltipTrigger>
                    <HelpTooltipBubble>
                      이슈가 본 기능으로 분류될 경우, 기본 프롬프트와 병합되어 수행되는 분석 prompt 입니다.
                    </HelpTooltipBubble>
                  </HelpTooltip>
                </LabelRow>

                <FieldTextarea
                  value={draft.prompt}
                  onChange={(e) => updateField('prompt', e.target.value)}
                  placeholder="이 기능에서 이슈를 어떻게 해석하고 후속 Action을 정할지 설명하세요"
                />
              </FieldGroup>
            </FormGrid>
          </FormSection>

          <FormSection>
            <FormSectionHeader>
              <FormSectionTitle>참고 자료</FormSectionTitle>
            </FormSectionHeader>

            <FormGrid>
              <FieldGroup>
                <FieldLabel>코드 Repo URL</FieldLabel>
                <FieldInput
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="예: https://github.com/org/repo"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>문서 파일 업로드</FieldLabel>
                <AssigneeSelectWrap>
                  <FieldInput value={documentFileName} readOnly placeholder="선택된 파일이 없습니다" />
                  <GhostButton type="button" onClick={openDocumentPicker}>
                    파일 선택
                  </GhostButton>
                </AssigneeSelectWrap>
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  style={{ display: 'none' }}
                  onChange={handleDocumentChange}
                />
              </FieldGroup>
            </FormGrid>
          </FormSection>

          <FormSection>
            <FormSectionHeader>
              <FormSectionTitle>
                <LabelRow>
                  <span>분류 태그</span>

                  <HelpTooltip>
                    <HelpTooltipTrigger type="button">?</HelpTooltipTrigger>
                    <HelpTooltipBubble>로그에 태그가 포함된 경우, 본 기능으로 분류합니다.</HelpTooltipBubble>
                  </HelpTooltip>
                </LabelRow>
              </FormSectionTitle>
            </FormSectionHeader>

            <EditableList>
              {draft.tags.length > 0 ? (
                <ChipList>
                  {draft.tags.map((tag) => (
                    <Chip key={`${draft.id}-tag-${tag}`}>
                      {tag}
                      <DangerGhostButton type="button" onClick={() => removeTag(tag)}>
                        삭제
                      </DangerGhostButton>
                    </Chip>
                  ))}
                </ChipList>
              ) : (
                <EmptyStateSmall>등록된 분류 태그가 없습니다.</EmptyStateSmall>
              )}
            </EditableList>

            <EditableList>
              <TagInputRow>
                <FieldGroup>
                  <FieldLabel>태그 추가</FieldLabel>
                  <FieldInput
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="예: 장애물 감지, 센서 오류, 도킹 실패"
                  />
                </FieldGroup>

                <GhostButton type="button" onClick={addTag}>
                  + 태그 추가
                </GhostButton>
              </TagInputRow>
            </EditableList>
          </FormSection>

          <FormSection>
            <FormSectionHeader>
              <FormSectionTitle>담당자 목록</FormSectionTitle>
            </FormSectionHeader>

            <EditableList>
              {selectedAssigneeAccounts.length > 0 ? (
                <AssigneeList>
                  {selectedAssigneeAccounts.map((assignee) => (
                    <AssigneeCard key={`${draft.id}-assignee-${assignee.key}`}>
                      <AssigneeIdentityRow>
                        <Avatar>
                          {isLikelyImageSource(assignee.profile) ? (
                            <AvatarImage src={assignee.profile} alt={`${assignee.name || 'assignee'} profile`} />
                          ) : (
                            toInitial(assignee.name)
                          )}
                        </Avatar>
                        <AssigneeMeta>
                          <AssigneeName>{assignee.name}</AssigneeName>
                          <AssigneeMetaLine>{assignee.team}</AssigneeMetaLine>
                        </AssigneeMeta>
                      </AssigneeIdentityRow>
                      <AssigneeActions>
                        <DangerGhostButton type="button" onClick={() => removeAssignee(assignee.key)}>
                          삭제
                        </DangerGhostButton>
                      </AssigneeActions>
                    </AssigneeCard>
                  ))}
                </AssigneeList>
              ) : (
                <EmptyStateSmall>등록된 담당자가 없습니다.</EmptyStateSmall>
              )}
            </EditableList>

            <EditableList>
              <AssigneeAddRow>
                <AssigneeAddLabel>담당자 추가</AssigneeAddLabel>

                <AssigneeSelectWrap>
                  <SelectInput
                    value={selectedAssigneeName}
                    onChange={(e) => {
                      setSelectedAssigneeName(e.target.value)
                      setAssigneeErrorMessage('')
                    }}
                  >
                    <option value="">추가할 담당자 선택</option>
                    {availableAccounts.map((account) => (
                      <option key={account.id} value={account.name}>
                        {account.name} ({account.email}) / {account.team ?? '-'}
                      </option>
                    ))}
                  </SelectInput>

                  <GhostButton type="button" onClick={addAssignee}>
                    + 담당자 추가
                  </GhostButton>
                </AssigneeSelectWrap>

                {assigneeErrorMessage ? <ModalErrorMessage>{assigneeErrorMessage}</ModalErrorMessage> : null}
              </AssigneeAddRow>
            </EditableList>
          </FormSection>

          {errorMessage ? <ModalErrorMessage>{errorMessage}</ModalErrorMessage> : null}
        </ModalBody>

        <ModalFooter>
          {!isCreateMode ? (
            isDeleteConfirmOpen ? (
              <FooterActions>
                <EmptyStateSmall>정말 삭제하시겠습니까?</EmptyStateSmall>
                <SecondaryButton type="button" onClick={handleCancelDelete}>
                  취소
                </SecondaryButton>
                <DangerGhostButton type="button" onClick={handleConfirmDelete}>
                  삭제 확인
                </DangerGhostButton>
              </FooterActions>
            ) : (
              <DangerGhostButton type="button" onClick={handleDeleteClick}>
                기능 삭제
              </DangerGhostButton>
            )
          ) : (
            <div />
          )}

          <FooterActions>
            <SecondaryButton type="button" onClick={onClose}>
              닫기
            </SecondaryButton>
            <PrimaryButton type="button" onClick={() => onSave(draft)} disabled={!isSavable}>
              저장
            </PrimaryButton>
          </FooterActions>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>,
    document.body
  )
}

export default FuncDetailModal
