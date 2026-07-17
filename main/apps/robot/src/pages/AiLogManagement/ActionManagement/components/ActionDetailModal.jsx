import { useState, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  SecondaryButton,
  DangerGhostButton,
  EmptyStateSmall,
  EditableList,
  HookMethodSelect,
  ModalErrorMessage,
  ChipList,
  Chip,
  FieldHint
} from './modal.styles'
import { PrimaryButton } from '../styles'
import { getFuncs } from '@/apis/ai/aiApis'

const cloneAction = (item) => JSON.parse(JSON.stringify(item))

const normalizeAction = (actionItem) => {
  const cloned = cloneAction(actionItem)

  return {
    ...cloned,
    key: String(cloned?.key || ''),
    name: String(cloned?.name || ''),
    description: String(cloned?.description || ''),
    enable: Boolean(cloned?.enable),
    funcs: Array.isArray(cloned?.funcs) ? cloned.funcs.map((f) => String(f)) : []
  }
}

const normalizeFuncOptions = (response) => {
  const payload = response?.data ?? response ?? null

  const base = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.list)
          ? payload.list
          : []

  return base
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        return String(item.name ?? item.func ?? '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

const ActionDetailModal = ({ actionItem, errorMessage, isCreateMode, onClose, onSave, onDelete }) => {
  const [draft, setDraft] = useState(() => normalizeAction(actionItem))
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [funcOptions, setFuncOptions] = useState([])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // 등록된 기능(func) 목록을 불러와 "사용 가능 기능" 선택지로 사용
  useEffect(() => {
    let alive = true
    getFuncs()
      .then((response) => {
        if (alive) setFuncOptions(normalizeFuncOptions(response))
      })
      .catch(() => {
        if (alive) setFuncOptions([])
      })
    return () => {
      alive = false
    }
  }, [])

  const updateField = useCallback((key, value) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const toggleFunc = useCallback((func) => {
    setDraft((prev) => {
      const current = Array.isArray(prev.funcs) ? prev.funcs : []
      const next = current.includes(func) ? current.filter((f) => f !== func) : [...current, func]
      return { ...prev, funcs: next }
    })
  }, [])

  // 등록 목록에서 사라진 func 도 기존 선택값은 칩으로 보여준다(선택 해제 가능)
  const allFuncChips = useMemo(() => {
    const selected = Array.isArray(draft.funcs) ? draft.funcs : []
    return Array.from(new Set([...funcOptions, ...selected]))
  }, [funcOptions, draft.funcs])

  const handleDeleteClick = useCallback(() => {
    setIsDeleteConfirmOpen(true)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setIsDeleteConfirmOpen(false)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    onDelete(draft.id)
  }, [draft.id, onDelete])

  const isSavable = String(draft.key || '').trim().length > 0

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <ModalBackdrop>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitleWrap>
            <ModalTitle>{isCreateMode ? '액션 등록' : `${draft.name || '액션'} 상세`}</ModalTitle>
            <ModalDescription>액션 key, 이름, 설명, 사용 여부, 사용 가능 기능을 관리합니다.</ModalDescription>
          </ModalTitleWrap>

          <ModalCloseButton type="button" onClick={onClose}>
            x
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <FormSection>
            <FormSectionHeader>
              <FormSectionTitle>기본 정보</FormSectionTitle>
            </FormSectionHeader>

            <EditableList>
              <FormGrid>
                <FieldGroup>
                  <FieldLabel>액션 Key</FieldLabel>
                  <FieldInput
                    value={draft.key}
                    onChange={(e) => updateField('key', e.target.value)}
                    placeholder="예: robot_reset"
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>액션명</FieldLabel>
                  <FieldInput
                    value={draft.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="예: 로봇 초기화"
                  />
                </FieldGroup>

                <FieldGroup $span2>
                  <FieldLabel>설명</FieldLabel>
                  <FieldTextarea
                    value={draft.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="예: 장애 상황에서 로봇을 초기화합니다."
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>사용 여부</FieldLabel>
                  <HookMethodSelect
                    value={draft.enable ? 'true' : 'false'}
                    onChange={(e) => updateField('enable', e.target.value === 'true')}
                  >
                    <option value="true">사용</option>
                    <option value="false">미사용</option>
                  </HookMethodSelect>
                </FieldGroup>

                <FieldGroup $span2>
                  <FieldLabel>사용 가능 기능</FieldLabel>
                  <FieldHint>
                    이 액션을 후속 조치로 제안할 기능(func)을 선택하세요. 선택하지 않으면 모든 기능에 공통으로 제안됩니다.
                  </FieldHint>
                  {allFuncChips.length > 0 ? (
                    <ChipList>
                      {allFuncChips.map((func) => (
                        <Chip
                          key={func}
                          type="button"
                          $active={(draft.funcs || []).includes(func)}
                          onClick={() => toggleFunc(func)}
                        >
                          {func}
                        </Chip>
                      ))}
                    </ChipList>
                  ) : (
                    <EmptyStateSmall>등록된 기능이 없습니다. 기능 관리에서 먼저 등록하세요.</EmptyStateSmall>
                  )}
                </FieldGroup>
              </FormGrid>
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
                액션 삭제
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

export default ActionDetailModal
