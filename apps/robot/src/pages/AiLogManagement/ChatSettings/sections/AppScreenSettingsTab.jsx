import { useEffect, useMemo, useState } from 'react'

import {
    SettingCard,
    CardHeader,
    CardTitle,
    ComingSoonBadge,
    OptionList,
    PageDescription,
    SectionTitleRow,
    SmallBadge,
    PromptCard,
    PromptMeta,
    ToggleButton,
    PromptTextarea,
    PromptFooter,
    SecondaryTextButton,
    PrimaryButton,
    SectionGrid,
    FieldGroup,
    FieldLabel,
    FieldHint,
    TextInput,
    InlineFields,
    ModalBackdrop,
    ModalCard,
    ModalTitle,
    ModalDescription,
    ModalActions,
} from '../styles'

import { filterScreenGroupsByRoute, formatDateTime, getPromptDraft, getScreenTitle } from '../chatSettings.utils'

const LARGE_MODAL_STYLE = {
    width: 'min(760px, 100%)',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
}

const ACTION_CREATE_MODAL_STYLE = {
    width: 'min(700px, 100%)',
    height: '66vh',
    minHeight: '66vh',
    maxHeight: '66vh',
    overflowY: 'auto',
}

const ACTION_DETAIL_MODAL_STYLE = {
    width: 'min(760px, 100%)',
    height: '66vh',
    minHeight: '66vh',
    maxHeight: '66vh',
    overflowY: 'auto',
}

const MODAL_BUTTON_STYLE = {
    height: '36px',
    minWidth: '96px',
}

const parseJsonArray = (value, fallback = []) => {
    try {
        const parsed = JSON.parse(String(value ?? '[]'))
        return Array.isArray(parsed) ? parsed : fallback
    } catch {
        return fallback
    }
}

const parseJsonObject = (value, fallback = {}) => {
    try {
        const parsed = JSON.parse(String(value ?? '{}'))
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback
    } catch {
        return fallback
    }
}

export const AppScreenSettingsTab = ({
    activeRouteKey,
    screenGroups,
    commonPromptItem,
    commonPromptDraft,
    actionTypes,
    promptDrafts,
    creatingPromptRouteKey,
    guidanceDrafts,
    ragDrafts,
    toolDrafts,
    savingPromptKey,
    savingGuidanceKey,
    creatingGuidanceRouteKey,
    savingRagKey,
    deletingRagKey,
    savingCreateRag,
    savingCreateTool,
    savingToolKey,
    onPromptChange,
    onSavePrompt,
    onCreatePrompt,
    onGuidanceChange,
    onSaveGuidance,
    onCreateGuidance,
    onRagChange,
    onSaveRag,
    onCreateRag,
    onDeleteRag,
    onToolChange,
    onSaveTool,
    onCreateTool,
    onDeleteTool,
}) => {
    const filteredGroups = filterScreenGroupsByRoute(screenGroups, activeRouteKey)

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            <SettingCard>
                <CardHeader>
                    <CardTitle>{activeRouteKey}</CardTitle>
                    <SmallBadge>화면별 설정</SmallBadge>
                </CardHeader>

                <PageDescription>
                    선택한 화면에서 동작하는 프롬프트, 추천 메세지 카드, RAG 텍스트, 화면 액션을 한 곳에서 관리합니다.
                </PageDescription>
            </SettingCard>

            {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                    <ScreenSettingGroup
                        key={group.routeKey}
                        group={group}
                        commonPromptItem={commonPromptItem}
                        commonPromptDraft={commonPromptDraft}
                        actionTypes={actionTypes}
                        promptDrafts={promptDrafts}
                        creatingPromptRouteKey={creatingPromptRouteKey}
                        guidanceDrafts={guidanceDrafts}
                        ragDrafts={ragDrafts}
                        toolDrafts={toolDrafts}
                        savingPromptKey={savingPromptKey}
                        savingGuidanceKey={savingGuidanceKey}
                        creatingGuidanceRouteKey={creatingGuidanceRouteKey}
                        savingRagKey={savingRagKey}
                        deletingRagKey={deletingRagKey}
                        savingCreateRag={savingCreateRag}
                        savingCreateTool={savingCreateTool}
                        savingToolKey={savingToolKey}
                        onPromptChange={onPromptChange}
                        onSavePrompt={onSavePrompt}
                        onCreatePrompt={onCreatePrompt}
                        onGuidanceChange={onGuidanceChange}
                        onSaveGuidance={onSaveGuidance}
                        onCreateGuidance={onCreateGuidance}
                        onRagChange={onRagChange}
                        onSaveRag={onSaveRag}
                        onCreateRag={onCreateRag}
                        onDeleteRag={onDeleteRag}
                        onToolChange={onToolChange}
                        onSaveTool={onSaveTool}
                        onCreateTool={onCreateTool}
                        onDeleteTool={onDeleteTool}
                    />
                ))
            ) : (
                <SettingCard>
                    <CardHeader>
                        <CardTitle>등록된 설정 없음</CardTitle>
                    </CardHeader>

                    <PageDescription>
                        현재 선택한 routeKey에 등록된 화면 프롬프트, 추천 메세지, RAG 데이터, 화면 액션이 없습니다.
                    </PageDescription>

                    <PageDescription>routeKey: {activeRouteKey || '-'}</PageDescription>
                </SettingCard>
            )}
        </div>
    )
}

const ScreenSettingGroup = ({
    group,
    commonPromptItem,
    commonPromptDraft,
    actionTypes,
    promptDrafts,
    creatingPromptRouteKey,
    guidanceDrafts,
    ragDrafts,
    toolDrafts,
    savingPromptKey,
    savingGuidanceKey,
    creatingGuidanceRouteKey,
    savingRagKey,
    deletingRagKey,
    savingCreateRag,
    savingCreateTool,
    savingToolKey,
    onPromptChange,
    onSavePrompt,
    onCreatePrompt,
    onGuidanceChange,
    onSaveGuidance,
    onCreateGuidance,
    onRagChange,
    onSaveRag,
    onCreateRag,
    onDeleteRag,
    onToolChange,
    onSaveTool,
    onCreateTool,
    onDeleteTool,
}) => {
    const title = getScreenTitle(group)

    return (
        <SettingCard>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <SmallBadge>
                        추천 {group.guidance.length}개 · RAG {group.ragDocs.length}개 · 액션 {group.tools.length}개
                    </SmallBadge>
                </CardHeader>
            </SectionTitleRow>

            <PageDescription>routeKey: {group.routeKey}</PageDescription>

            <SectionGrid>
                <ScreenPromptList
                    commonPromptItem={commonPromptItem}
                    commonPromptDraft={commonPromptDraft}
                    appKey={String(group.routeKey ?? '').split('/')[0] || ''}
                    routeKey={group.routeKey}
                    routeParentKey={group.routeParentKey}
                    prompts={group.prompts}
                    promptDrafts={promptDrafts}
                    savingPromptKey={savingPromptKey}
                    creatingPromptRouteKey={creatingPromptRouteKey}
                    onPromptChange={onPromptChange}
                    onSavePrompt={onSavePrompt}
                    onCreatePrompt={onCreatePrompt}
                />
                <ScreenGuidanceList
                    appKey={String(group.routeKey ?? '').split('/')[0] || ''}
                    routeKey={group.routeKey}
                    routeParentKey={group.routeParentKey}
                    guidance={group.guidance}
                    guidanceDrafts={guidanceDrafts}
                    savingGuidanceKey={savingGuidanceKey}
                    creatingGuidanceRouteKey={creatingGuidanceRouteKey}
                    onGuidanceChange={onGuidanceChange}
                    onSaveGuidance={onSaveGuidance}
                    onCreateGuidance={onCreateGuidance}
                />
                <ScreenRagList
                    appKey={String(group.routeKey ?? '').split('/')[0] || ''}
                    routeKey={group.routeKey}
                    routeParentKey={group.routeParentKey}
                    ragDocs={group.ragDocs}
                    ragDrafts={ragDrafts}
                    savingRagKey={savingRagKey}
                    deletingRagKey={deletingRagKey}
                    savingCreateRag={savingCreateRag}
                    onRagChange={onRagChange}
                    onSaveRag={onSaveRag}
                    onCreateRag={onCreateRag}
                    onDeleteRag={onDeleteRag}
                />
                <ScreenToolList
                    appKey={String(group.routeKey ?? '').split('/')[0] || ''}
                    routeKey={group.routeKey}
                    routeParentKey={group.routeParentKey}
                    actionTypes={actionTypes}
                    tools={group.tools}
                    toolDrafts={toolDrafts}
                    savingCreateTool={savingCreateTool}
                    savingToolKey={savingToolKey}
                    onToolChange={onToolChange}
                    onSaveTool={onSaveTool}
                    onCreateTool={onCreateTool}
                    onDeleteTool={onDeleteTool}
                />
            </SectionGrid>
        </SettingCard>
    )
}

const ScreenPromptList = ({ commonPromptItem, commonPromptDraft, appKey, routeKey, routeParentKey, prompts, promptDrafts, savingPromptKey, creatingPromptRouteKey, onPromptChange, onSavePrompt, onCreatePrompt }) => {
    const [previewOpen, setPreviewOpen] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [createDraft, setCreateDraft] = useState({
        label: '화면 프롬프트',
        content: '',
        enabled: true,
    })

    const normalizedRouteKey = String(routeKey ?? '').trim()
    const isCreatingHere = creatingPromptRouteKey === normalizedRouteKey

    const handleCreateSubmit = async () => {
        const ok = await onCreatePrompt({
            appKey,
            routeKey: normalizedRouteKey,
            routeParentKey,
            content: createDraft.content,
            label: createDraft.label,
            promptType: 'system',
            enabled: createDraft.enabled,
        })

        if (ok) {
            setCreateOpen(false)
            setCreateDraft({ label: '화면 프롬프트', content: '', enabled: true })
        }
    }

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>화면 프롬프트</CardTitle>
                    <ComingSoonBadge>공통 1개 + 화면 {prompts.length}개</ComingSoonBadge>
                </CardHeader>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <SecondaryTextButton type="button" onClick={() => setPreviewOpen(true)}>
                        공통 프롬프트 미리보기
                    </SecondaryTextButton>
                    <PrimaryButton type="button" onClick={() => setCreateOpen((prev) => !prev)} disabled={!normalizedRouteKey || isCreatingHere}>
                        {isCreatingHere ? '생성 중...' : createOpen ? '닫기' : '화면 프롬프트 추가'}
                    </PrimaryButton>
                </div>
            </SectionTitleRow>

            <PageDescription>
                실제 호출 시 공통 프롬프트가 먼저 적용되고, 아래 화면 프롬프트가 이어서 함께 전달됩니다.
            </PageDescription>

            {(createOpen || prompts.length === 0) ? (
                <PromptCard>
                    <PromptMeta>
                        <span>{prompts[0]?.label || '화면 프롬프트'}</span>
                        <span>key: {normalizedRouteKey || '-'}</span>
                        <span>type: system</span>
                    </PromptMeta>

                    <FieldLabel>프롬프트</FieldLabel>
                    <PromptTextarea
                        value={createDraft.content}
                        onChange={(e) => setCreateDraft((prev) => ({ ...prev, content: e.target.value }))}
                        placeholder="이 화면에 적용할 프롬프트를 입력하세요."
                        style={{ minHeight: '160px' }}
                    />

                    <PromptFooter>
                        <ToggleButton
                            type="button"
                            $active={createDraft.enabled}
                            onClick={() => setCreateDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
                        >
                            {createDraft.enabled ? '활성' : '비활성'}
                        </ToggleButton>

                        <SecondaryTextButton type="button" onClick={() => setCreateOpen(false)}>
                            취소
                        </SecondaryTextButton>

                        <PrimaryButton type="button" onClick={handleCreateSubmit} disabled={isCreatingHere}>
                            {isCreatingHere ? '저장 중...' : '저장'}
                        </PrimaryButton>
                    </PromptFooter>
                </PromptCard>
            ) : null}

            <OptionList>
                {prompts.length > 0 ? (
                    prompts.map((item) => {
                        const draft = getPromptDraft(promptDrafts, item)
                        const draftKey = String(item.id)

                        return (
                            <PromptCard key={`${item.id}-${item.promptType}`}>
                                <PromptMeta>
                                    <span>{item.label || item.key}</span>
                                    <span>type: {item.promptType}</span>
                                    <span>routeKey: {item.routeKey || '-'}</span>
                                    <span>updated: {formatDateTime(item.updatedAt)}</span>
                                </PromptMeta>

                                <PromptTextarea
                                    value={draft.content}
                                    onChange={(e) => onPromptChange(draftKey, 'content', e.target.value)}
                                />

                                <FieldHint>이 화면/타입에서 LLM에게 전달되는 실제 프롬프트 문구입니다.</FieldHint>

                                <PromptFooter>
                                    <ToggleButton
                                        type="button"
                                        $active={draft.enabled}
                                        onClick={() => onPromptChange(draftKey, 'enabled', !draft.enabled)}
                                    >
                                        {draft.enabled ? '활성' : '비활성'}
                                    </ToggleButton>

                                    <SecondaryTextButton
                                        type="button"
                                        onClick={() => onPromptChange(draftKey, 'content', String(item.content ?? ''))}
                                    >
                                        원본 복원
                                    </SecondaryTextButton>

                                    <PrimaryButton
                                        type="button"
                                        onClick={() => onSavePrompt(item)}
                                        disabled={savingPromptKey === draftKey}
                                    >
                                        {savingPromptKey === draftKey ? '저장 중...' : '저장'}
                                    </PrimaryButton>
                                </PromptFooter>
                            </PromptCard>
                        )
                    })
                ) : (
                    <PageDescription>이 화면 전용 프롬프트가 없습니다. 위 입력칸에서 새 프롬프트를 추가할 수 있습니다.</PageDescription>
                )}
            </OptionList>

            {previewOpen ? (
                <ModalBackdrop>
                    <ModalCard style={LARGE_MODAL_STYLE}>
                        <ModalTitle>공통 프롬프트 미리보기</ModalTitle>
                        <ModalDescription>현재 모든 화면에 공통으로 적용되는 시스템 프롬프트입니다.</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                            <PromptMeta>
                                <span>{commonPromptItem?.label || commonPromptDraft?.label || '공통 프롬프트'}</span>
                                <span>key: common</span>
                                <span>type: system</span>
                            </PromptMeta>

                            <PromptTextarea
                                value={String(commonPromptDraft?.content ?? commonPromptItem?.content ?? '')}
                                readOnly
                                style={{ minHeight: '320px', background: '#f8fafc', color: '#334155' }}
                            />
                        </div>

                        <ModalActions>
                            <PrimaryButton type="button" onClick={() => setPreviewOpen(false)} style={MODAL_BUTTON_STYLE}>확인</PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}
        </div>
    )
}

const ScreenGuidanceList = ({
    appKey,
    routeKey,
    routeParentKey,
    guidance,
    guidanceDrafts,
    savingGuidanceKey,
    creatingGuidanceRouteKey,
    onGuidanceChange,
    onSaveGuidance,
    onCreateGuidance,
}) => {
    const [modalOpen, setModalOpen] = useState(false)
    const [editingIndex, setEditingIndex] = useState(-1)
    const [messageDraft, setMessageDraft] = useState({ q: '' })

    const activeGuidance = guidance[0] ?? null
    const draftKey = String(activeGuidance?.id ?? '')
    const activeDraft = activeGuidance
        ? guidanceDrafts[draftKey] ?? {
            examplesText: JSON.stringify(activeGuidance.examples ?? [], null, 2),
        }
        : null

    const examples = parseJsonArray(activeDraft?.examplesText ?? '[]', [])

    const openCreateModal = () => {
        setEditingIndex(-1)
        setMessageDraft({ q: '' })
        setModalOpen(true)
    }

    const openEditModal = (example, index) => {
        setEditingIndex(index)
        setMessageDraft({
            q: typeof example === 'string' ? example : String(example?.q ?? ''),
        })
        setModalOpen(true)
    }

    const persistExamples = async (nextExamples) => {
        if (activeGuidance) {
            const nextDraft = {
                ...activeDraft,
                examplesText: JSON.stringify(nextExamples, null, 2),
            }
            onGuidanceChange(draftKey, 'examplesText', nextDraft.examplesText)
            await onSaveGuidance(activeGuidance, nextDraft)
            return true
        }

        const created = await onCreateGuidance({
            appKey,
            routeKey,
            routeParentKey,
            initialExamples: nextExamples,
        })
        return created
    }

    const handleSubmitMessage = async () => {
        const q = String(messageDraft.q ?? '').trim()
        if (!q) return

        const nextMessage = q
        const nextExamples = examples.slice()

        if (editingIndex >= 0) {
            nextExamples[editingIndex] = nextMessage
        } else {
            nextExamples.push(nextMessage)
        }

        const ok = await persistExamples(nextExamples)
        if (ok) {
            setModalOpen(false)
        }
    }

    const handleDeleteMessage = async (index) => {
        if (!activeGuidance) return
        const nextExamples = examples.filter((_, currentIndex) => currentIndex !== index)
        await persistExamples(nextExamples)
    }

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>추천 메세지</CardTitle>
                    <ComingSoonBadge>{examples.length}개</ComingSoonBadge>
                </CardHeader>

                <PrimaryButton
                    type="button"
                    onClick={openCreateModal}
                    disabled={creatingGuidanceRouteKey === routeKey || (Boolean(draftKey) && savingGuidanceKey === draftKey)}
                    style={{ height: '36px' }}
                >
                    {creatingGuidanceRouteKey === routeKey ? '생성 중...' : '추천 메세지 추가'}
                </PrimaryButton>
            </SectionTitleRow>

            <PageDescription>
                채팅창에 추천 카드로 노출할 문구 목록입니다. 추천 메세지는 화면별 guidance.examples에 저장됩니다.
            </PageDescription>

            {activeGuidance ? (
                <>
                    <OptionList>
                        {examples.length > 0 ? (
                            examples.map((example, index) => (
                                <PromptCard key={`example-${index}`}>
                                    <PageDescription>{String(typeof example === 'string' ? example : (example?.q ?? '-'))}</PageDescription>

                                    <PromptFooter>
                                        <SecondaryTextButton type="button" onClick={() => handleDeleteMessage(index)}>
                                            삭제
                                        </SecondaryTextButton>
                                        <PrimaryButton type="button" onClick={() => openEditModal(example, index)}>
                                            수정
                                        </PrimaryButton>
                                    </PromptFooter>
                                </PromptCard>
                            ))
                        ) : (
                            <PageDescription>등록된 추천 메세지가 없습니다. 상단의 버튼으로 첫 메세지를 추가해 주세요.</PageDescription>
                        )}
                    </OptionList>

                </>
            ) : (
                <PageDescription>등록된 추천 메세지가 없습니다. 상단의 버튼으로 추가하면 화면 guidance가 함께 생성됩니다.</PageDescription>
            )}

            {modalOpen ? (
                <ModalBackdrop>
                    <ModalCard style={LARGE_MODAL_STYLE}>
                        <ModalTitle>{editingIndex >= 0 ? '추천 메세지 수정' : '추천 메세지 추가'}</ModalTitle>
                        <ModalDescription>추천 카드에 노출할 질문만 입력합니다.</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                            <FieldLabel>질문</FieldLabel>
                            <PromptTextarea
                                value={messageDraft.q}
                                onChange={(e) => setMessageDraft((prev) => ({ ...prev, q: e.target.value }))}
                                style={{ minHeight: '96px' }}
                            />
                        </div>

                        <ModalActions style={{ gap: '10px' }}>
                            <SecondaryTextButton type="button" onClick={() => setModalOpen(false)} style={MODAL_BUTTON_STYLE}>취소</SecondaryTextButton>
                            <PrimaryButton type="button" onClick={handleSubmitMessage} style={MODAL_BUTTON_STYLE}>
                                저장
                            </PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}
        </div>
    )
}

const ScreenRagList = ({
    appKey,
    routeKey,
    routeParentKey,
    ragDocs,
    ragDrafts,
    savingRagKey,
    deletingRagKey,
    savingCreateRag,
    onRagChange,
    onSaveRag,
    onCreateRag,
    onDeleteRag,
}) => {
    const sortedRagDocs = useMemo(() => {
        return [...ragDocs].sort((left, right) => {
            const leftOrder = Number(left?.sortOrder ?? 0)
            const rightOrder = Number(right?.sortOrder ?? 0)
            if (leftOrder !== rightOrder) return leftOrder - rightOrder
            return String(left?.chunkKey ?? '').localeCompare(String(right?.chunkKey ?? ''))
        })
    }, [ragDocs])

    const [activeRagKey, setActiveRagKey] = useState('')
    const [creatingOpen, setCreatingOpen] = useState(false)
    const [newRagDraft, setNewRagDraft] = useState({
        title: '',
        body: '',
        keywordsText: '[]',
        enabled: true,
    })

    useEffect(() => {
        if (sortedRagDocs.length === 0) {
            if (activeRagKey) setActiveRagKey('')
            return
        }

        if (creatingOpen) return

        const exists = sortedRagDocs.some((item) => String(item.id) === activeRagKey)
        if (!exists) {
            setActiveRagKey(String(sortedRagDocs[0].id))
        }
    }, [sortedRagDocs, activeRagKey, creatingOpen])

    const activeRagDoc = sortedRagDocs.find((item) => String(item.id) === activeRagKey) ?? null
    const activeRagDraft = activeRagDoc
        ? ragDrafts[activeRagKey] ?? {
            title: String(activeRagDoc.title ?? ''),
            body: String(activeRagDoc.body ?? ''),
            keywordsText: JSON.stringify(activeRagDoc.keywords ?? [], null, 2),
            enabled: activeRagDoc.enabled !== false,
        }
        : null

    const handleCreateRag = async () => {
        const ok = await onCreateRag({
            appKey,
            key: routeKey,
            routeKey: routeParentKey,
            ...newRagDraft,
        })
        if (ok) {
            setNewRagDraft({ title: '', body: '', keywordsText: '[]', enabled: true })
            setCreatingOpen(false)
        }
    }

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>RAG 데이터</CardTitle>
                    <SmallBadge>{sortedRagDocs.length}개 청크</SmallBadge>
                </CardHeader>

                <PrimaryButton
                    type="button"
                    onClick={() => setCreatingOpen(true)}
                    disabled={savingCreateRag}
                    style={{ height: '36px' }}
                >
                    {savingCreateRag ? '저장 중...' : '+ RAG 추가'}
                </PrimaryButton>
            </SectionTitleRow>

            <PageDescription>
                공통 RAG와 동일하게 화면별 RAG도 청크 목록으로 관리합니다.
            </PageDescription>

            {sortedRagDocs.length > 0 ? (
                <>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <strong style={{ fontSize: '13px', color: '#334155' }}>탭 구성</strong>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                gap: '10px',
                                overflowX: 'auto',
                                paddingBottom: '4px',
                            }}
                        >
                            {sortedRagDocs.map((item) => {
                                const ragKey = String(item.id)
                                const active = ragKey === activeRagKey

                                return (
                                    <button
                                        key={ragKey}
                                        type="button"
                                        onClick={() => setActiveRagKey(ragKey)}
                                        style={{
                                            minWidth: '220px',
                                            textAlign: 'left',
                                            padding: '10px 12px',
                                            borderRadius: '12px',
                                            border: active ? '1px solid #2563eb' : '1px solid #dbe3ef',
                                            background: active ? '#eff6ff' : '#ffffff',
                                            color: active ? '#1d4ed8' : '#334155',
                                            cursor: 'pointer',
                                            display: 'grid',
                                            gap: '4px',
                                            flex: '0 0 auto',
                                        }}
                                    >
                                        <strong style={{ fontSize: '13px' }}>{item.title || item.chunkKey}</strong>
                                        <span style={{ fontSize: '12px' }}>chunk: {item.chunkKey}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {creatingOpen ? null : null}

                    {activeRagDoc && activeRagDraft ? (
                        <PromptCard>
                            <PromptMeta>
                                <span>{activeRagDoc.title || activeRagDoc.chunkKey}</span>
                                <span>key: {routeKey}</span>
                                <span>chunk: {activeRagDoc.chunkKey}</span>
                                <span>updated: {formatDateTime(activeRagDoc.updatedAt)}</span>
                            </PromptMeta>

                            <FieldLabel>제목</FieldLabel>
                            <PromptTextarea
                                value={activeRagDraft.title}
                                onChange={(e) => onRagChange(activeRagKey, 'title', e.target.value)}
                                style={{ minHeight: '56px' }}
                            />
                            <FieldHint>질문 의도와 바로 연결되는 제목으로 작성하세요.</FieldHint>

                            <FieldLabel>keywords (JSON 배열)</FieldLabel>
                            <PromptTextarea
                                value={activeRagDraft.keywordsText}
                                onChange={(e) => onRagChange(activeRagKey, 'keywordsText', e.target.value)}
                                style={{ minHeight: '96px' }}
                            />
                            <FieldHint>동의어와 프론트 화면 표현까지 넣으면 조회 정확도가 좋아집니다.</FieldHint>

                            <FieldLabel>body</FieldLabel>
                            <PromptTextarea
                                value={activeRagDraft.body}
                                onChange={(e) => onRagChange(activeRagKey, 'body', e.target.value)}
                                style={{ minHeight: '180px' }}
                            />
                            <FieldHint>한 청크는 한 주제만 다루는 것이 좋습니다.</FieldHint>

                            <PromptFooter>
                                <ToggleButton
                                    type="button"
                                    $active={Boolean(activeRagDraft.enabled)}
                                    onClick={() => onRagChange(activeRagKey, 'enabled', !activeRagDraft.enabled)}
                                >
                                    {activeRagDraft.enabled ? '활성' : '비활성'}
                                </ToggleButton>

                                <SecondaryTextButton
                                    type="button"
                                    onClick={() => onDeleteRag(activeRagDoc)}
                                    disabled={deletingRagKey === activeRagKey}
                                >
                                    {deletingRagKey === activeRagKey ? '삭제 중...' : '삭제'}
                                </SecondaryTextButton>

                                <PrimaryButton
                                    type="button"
                                    onClick={() => onSaveRag(activeRagDoc)}
                                    disabled={savingRagKey === activeRagKey}
                                >
                                    {savingRagKey === activeRagKey ? '저장 중...' : '저장'}
                                </PrimaryButton>
                            </PromptFooter>
                        </PromptCard>
                    ) : null}
                </>
            ) : (
                <PageDescription>등록된 화면 RAG 청크가 없습니다. 상단의 + RAG 추가 버튼으로 등록해 주세요.</PageDescription>
            )}

            {creatingOpen ? (
                <ModalBackdrop>
                    <ModalCard style={LARGE_MODAL_STYLE}>
                        <ModalTitle>화면 RAG 추가</ModalTitle>
                        <ModalDescription>이 화면에서 참고할 RAG 청크를 추가합니다. chunk key는 자동으로 생성됩니다.</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                            <FieldLabel>제목</FieldLabel>
                            <PromptTextarea
                                value={newRagDraft.title}
                                onChange={(e) => setNewRagDraft((prev) => ({ ...prev, title: e.target.value }))}
                                style={{ minHeight: '56px' }}
                            />

                            <FieldLabel>keywords (JSON 배열)</FieldLabel>
                            <PromptTextarea
                                value={newRagDraft.keywordsText}
                                onChange={(e) => setNewRagDraft((prev) => ({ ...prev, keywordsText: e.target.value }))}
                                style={{ minHeight: '96px' }}
                            />

                            <FieldLabel>body</FieldLabel>
                            <PromptTextarea
                                value={newRagDraft.body}
                                onChange={(e) => setNewRagDraft((prev) => ({ ...prev, body: e.target.value }))}
                                style={{ minHeight: '180px' }}
                            />

                            <PromptFooter>
                                <ToggleButton
                                    type="button"
                                    $active={Boolean(newRagDraft.enabled)}
                                    onClick={() => setNewRagDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
                                >
                                    {newRagDraft.enabled ? '활성' : '비활성'}
                                </ToggleButton>
                            </PromptFooter>
                        </div>

                        <ModalActions style={{ gap: '10px' }}>
                            <SecondaryTextButton type="button" onClick={() => setCreatingOpen(false)} style={MODAL_BUTTON_STYLE}>취소</SecondaryTextButton>
                            <PrimaryButton type="button" onClick={handleCreateRag} disabled={savingCreateRag} style={MODAL_BUTTON_STYLE}>
                                {savingCreateRag ? '저장 중...' : '저장'}
                            </PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}
        </div>
    )
}

const ScreenToolList = ({
    appKey,
    routeKey,
    routeParentKey,
    actionTypes,
    tools,
    toolDrafts,
    savingCreateTool,
    savingToolKey,
    onToolChange,
    onSaveTool,
    onCreateTool,
    onDeleteTool,
}) => {
    const [createOpen, setCreateOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [detailTab, setDetailTab] = useState('rest')
    const [selectedToolKey, setSelectedToolKey] = useState('')
    const [createDraft, setCreateDraft] = useState({
        actionTypeKey: String(actionTypes?.[0]?.key ?? ''),
        toolName: '',
        displayName: '',
        description: '',
        endpoint: '',
        baseUrl: '',
        requestHeadersText: '{}',
        requestQueryText: '{}',
        requestBodyText: '{}',
        contextParamsText: '[]',
        requestParamsText: '[]',
        staticPayloadText: '{}',
        enabled: true,
    })

    const handleCreateChange = (field, nextValue) => {
        setCreateDraft((prev) => ({
            ...prev,
            [field]: nextValue,
        }))
    }

    const openCreate = () => {
        setCreateDraft({
            actionTypeKey: String(actionTypes?.[0]?.key ?? ''),
            toolName: '',
            displayName: '',
            description: '',
            endpoint: '',
            baseUrl: '',
            requestHeadersText: '{}',
            requestQueryText: '{}',
            requestBodyText: '{}',
            contextParamsText: '[]',
            requestParamsText: '[]',
            staticPayloadText: '{}',
            enabled: true,
        })
        setCreateOpen(true)
    }

    const handleCreateSubmit = async () => {
        const ok = await onCreateTool({
            appKey,
            key: routeKey,
            routeKey: routeParentKey,
            ...createDraft,
        })

        if (ok) {
            setCreateOpen(false)
        }
    }

    const getDraftForItem = (item) => {
        const toolKey = String(item.id)
        return toolDrafts[toolKey] ?? {
            enabled: item.enabled !== false,
            displayName: String(item.displayName ?? ''),
            description: String(item.description ?? ''),
            apiName: String(item.apiName ?? ''),
            method: String(item.method ?? ''),
            endpoint: String(item.endpoint ?? ''),
            baseUrl: String(item.baseUrl ?? ''),
            requestHeadersText: JSON.stringify(item.requestHeaders ?? {}, null, 2),
            requestQueryText: JSON.stringify(item.requestQuery ?? {}, null, 2),
            requestBodyText: JSON.stringify(item.requestBody ?? {}, null, 2),
            contextParamsText: JSON.stringify(item.contextParams ?? [], null, 2),
            requestParamsText: JSON.stringify(item.requestParams ?? [], null, 2),
            staticPayloadText: JSON.stringify(item.staticPayload ?? {}, null, 2),
        }
    }

    const selectedTool = tools.find((item) => String(item.id) === selectedToolKey) ?? null
    const selectedDraft = selectedTool ? getDraftForItem(selectedTool) : null
    const selectedContextParams = selectedDraft ? parseJsonArray(selectedDraft.contextParamsText, []) : []
    const selectedRequestParams = selectedDraft ? parseJsonArray(selectedDraft.requestParamsText, []) : []
    const selectedRequestHeaders = selectedDraft ? parseJsonObject(selectedDraft.requestHeadersText, {}) : {}
    const selectedRequestQuery = selectedDraft ? parseJsonObject(selectedDraft.requestQueryText, {}) : {}
    const selectedRequestBody = selectedDraft ? parseJsonObject(selectedDraft.requestBodyText, {}) : {}
    const selectedStaticPayload = selectedDraft ? parseJsonObject(selectedDraft.staticPayloadText, {}) : {}

    const selectedContextSummary = selectedContextParams
        .map((rule) => String(rule?.argKey ?? rule?.name ?? '-'))
        .filter(Boolean)

    const editableContextParams = selectedContextParams
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
            argKey: String(item?.argKey ?? item?.name ?? '').trim(),
            sourcePath: String(item?.sourcePath ?? item?.from ?? item?.contextKey ?? item?.path ?? '').trim(),
            required: Boolean(item?.required),
            defaultValue: item?.defaultValue ?? item?.default,
        }))

    const editableRequestParams = selectedRequestParams
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
            name: String(item?.name ?? item?.key ?? item?.argKey ?? '').trim(),
            type: String(item?.type ?? '').trim().toLowerCase() || 'string',
            in: String(item?.in ?? item?.location ?? item?.target ?? '').trim().toLowerCase(),
            required: Boolean(item?.required),
            defaultValue: item?.defaultValue ?? item?.default,
            description: String(item?.description ?? '').trim(),
        }))

    const dynamicRequestSummary = selectedRequestParams
        .map((rule) => `${String(rule?.name ?? '-')}(${String(rule?.in ?? '').trim() || 'auto'})`)
        .filter(Boolean)

    const fixedQuerySummary = Object.keys(selectedRequestQuery)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => `${key}(query:fixed)`)

    const fixedBodySummary = Object.keys(selectedRequestBody)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => `${key}(body:fixed)`)

    const staticPayloadBodySummary = Object.keys(selectedStaticPayload)
        .filter((key) => !['baseUrl', 'headers', 'query', 'body', 'useAccessToken'].includes(key))
        .sort((a, b) => a.localeCompare(b))
        .map((key) => `${key}(static)`)

    const staticPayloadNestedBodySummary = selectedStaticPayload?.body && typeof selectedStaticPayload.body === 'object' && !Array.isArray(selectedStaticPayload.body)
        ? Object.keys(selectedStaticPayload.body)
            .sort((a, b) => a.localeCompare(b))
            .map((key) => `${key}(static:body)`)
        : []

    const requestSummary = [
        ...dynamicRequestSummary,
        ...fixedQuerySummary,
        ...fixedBodySummary,
        ...staticPayloadBodySummary,
        ...staticPayloadNestedBodySummary,
    ]

    const headerSummary = Object.keys(selectedRequestHeaders)
        .sort((a, b) => a.localeCompare(b))

    const updateContextParamsText = (nextRows) => {
        if (!selectedToolKey) return
        onToolChange(selectedToolKey, 'contextParamsText', JSON.stringify(nextRows, null, 2))
    }

    const updateRequestParamsText = (nextRows) => {
        if (!selectedToolKey) return
        onToolChange(selectedToolKey, 'requestParamsText', JSON.stringify(nextRows, null, 2))
    }

    const handleAddContextParam = () => {
        const next = [
            ...editableContextParams,
            { argKey: '', sourcePath: '', required: false },
        ]
        updateContextParamsText(next)
    }

    const handleChangeContextParam = (index, patch) => {
        const next = editableContextParams.map((row, i) => {
            if (i !== index) return row
            const merged = { ...row, ...patch }
            if (!String(merged.sourcePath ?? '').trim() && String(merged.argKey ?? '').trim()) {
                merged.sourcePath = String(merged.argKey).trim()
            }
            return merged
        })
        updateContextParamsText(next)
    }

    const handleRemoveContextParam = (index) => {
        const next = editableContextParams.filter((_, i) => i !== index)
        updateContextParamsText(next)
    }

    const handleAddRequestParam = () => {
        const next = [
            ...editableRequestParams,
            { name: '', type: 'string', in: '', required: false },
        ]
        updateRequestParamsText(next)
    }

    const handleChangeRequestParam = (index, patch) => {
        const next = editableRequestParams.map((row, i) => {
            if (i !== index) return row
            const merged = { ...row, ...patch }
            const normalizedType = String(merged.type ?? '').trim().toLowerCase()
            if (!['string', 'number', 'integer', 'boolean', 'object', 'array'].includes(normalizedType)) {
                merged.type = 'string'
            } else {
                merged.type = normalizedType
            }
            return merged
        })
        updateRequestParamsText(next)
    }

    const handleRemoveRequestParam = (index) => {
        const next = editableRequestParams.filter((_, i) => i !== index)
        updateRequestParamsText(next)
    }

    const openDetail = (item) => {
        setSelectedToolKey(String(item.id))
        setDetailTab('rest')
        setEditOpen(true)
    }

    const closeDetail = () => {
        setEditOpen(false)
        setSelectedToolKey('')
    }

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>화면 액션</CardTitle>
                    <ComingSoonBadge>{tools.length}개</ComingSoonBadge>
                </CardHeader>

                <PrimaryButton type="button" onClick={openCreate} disabled={savingCreateTool} style={{ height: '36px' }}>
                    {savingCreateTool ? '추가 중...' : '+ 화면 액션 추가'}
                </PrimaryButton>
            </SectionTitleRow>

            <PageDescription>
                이 화면에서 실행할 REST 액션을 등록합니다. 파라미터는 프론트엔드가 전달하는 body 기준으로 정의해야 합니다.
            </PageDescription>

            <OptionList>
                {tools.length > 0 ? (
                    tools.map((item) => {
                        const toolKey = String(item.id)
                        const displayName = String(item.displayName ?? item.toolName ?? '-')
                        const endpoint = String(item.endpoint ?? '-')
                        const method = String(item.method ?? '').toUpperCase() || '-'

                        return (
                            <button
                                key={toolKey}
                                type="button"
                                onClick={() => openDetail(item)}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    background: '#ffffff',
                                    padding: '10px 12px',
                                    display: 'grid',
                                    gap: '6px',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{displayName}</strong>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: item.enabled !== false ? '#1d4ed8' : '#64748b',
                                            border: item.enabled !== false ? '1px solid #bfdbfe' : '1px solid #dbe3ef',
                                            background: item.enabled !== false ? '#eff6ff' : '#f8fafc',
                                            borderRadius: '999px',
                                            padding: '2px 8px',
                                        }}
                                    >
                                        {item.enabled !== false ? '활성' : '비활성'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: '#64748b' }}>
                                    <span>{item.toolName}</span>
                                    <span>{method}</span>
                                    <span>{endpoint}</span>
                                </div>
                            </button>
                        )
                    })
                ) : (
                    <PageDescription>등록된 화면 액션이 없습니다. + 화면 액션 추가로 첫 액션을 등록해 주세요.</PageDescription>
                )}
            </OptionList>

            {editOpen && selectedTool && selectedDraft ? (
                <ModalBackdrop>
                    <ModalCard style={ACTION_DETAIL_MODAL_STYLE}>
                        <ModalTitle>화면 액션 상세</ModalTitle>
                        <ModalDescription>필수 정보는 목록에서 확인하고, 상세 수정은 팝업에서 관리합니다.</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                            <PromptMeta>
                                <span>{selectedTool.toolName}</span>
                                <span>{selectedTool.key}</span>
                                <span>parent: {selectedTool.routeKey || '-'}</span>
                                <span>kind: {selectedTool.kind}</span>
                            </PromptMeta>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <SecondaryTextButton
                                    type="button"
                                    onClick={() => setDetailTab('frontend')}
                                    style={{
                                        border: detailTab === 'frontend' ? '1px solid #2563eb' : undefined,
                                        color: detailTab === 'frontend' ? '#1d4ed8' : undefined,
                                        background: detailTab === 'frontend' ? '#eff6ff' : undefined,
                                    }}
                                >
                                    프론트 입력값
                                </SecondaryTextButton>
                                <SecondaryTextButton
                                    type="button"
                                    onClick={() => setDetailTab('rest')}
                                    style={{
                                        border: detailTab === 'rest' ? '1px solid #2563eb' : undefined,
                                        color: detailTab === 'rest' ? '#1d4ed8' : undefined,
                                        background: detailTab === 'rest' ? '#eff6ff' : undefined,
                                    }}
                                >
                                    REST 호출값
                                </SecondaryTextButton>
                            </div>

                            <FieldGroup>
                                <FieldLabel>표시명 (display_name)</FieldLabel>
                                <FieldHint>설정 화면에 노출되는 툴 이름입니다.</FieldHint>
                                <TextInput
                                    value={selectedDraft.displayName}
                                    onChange={(e) => onToolChange(selectedToolKey, 'displayName', e.target.value)}
                                />
                            </FieldGroup>

                            {detailTab === 'frontend' ? (
                                <>
                                    <FieldGroup>
                                        <FieldLabel>context_params (JSON)</FieldLabel>
                                        <FieldHint>화면 컨텍스트에서 자동 주입할 값 정의입니다.</FieldHint>
                                        <PromptTextarea
                                            value={selectedDraft.contextParamsText}
                                            onChange={(e) => onToolChange(selectedToolKey, 'contextParamsText', e.target.value)}
                                            style={{ minHeight: '120px' }}
                                        />
                                        <FieldHint>
                                            예: [{'{'}"argKey":"groupId","sourcePath":"groupId","required":true{'}'}, {'{'}"argKey":"siteId","sourcePath":"siteId"{'}'}]
                                        </FieldHint>
                                    </FieldGroup>
                                </>
                            ) : (
                                <>
                                    <FieldGroup>
                                        <FieldLabel>API 정보</FieldLabel>
                                        <FieldHint>연동 대상 API 이름, 메서드, 엔드포인트입니다. tool_name 전용 구현이 없을 때는 api_name + method로 백엔드 툴 매핑에 사용됩니다.</FieldHint>
                                        <InlineFields>
                                            <TextInput value={selectedDraft.apiName} onChange={(e) => onToolChange(selectedToolKey, 'apiName', e.target.value)} />
                                            <TextInput value={selectedDraft.method} onChange={(e) => onToolChange(selectedToolKey, 'method', e.target.value)} />
                                            <TextInput value={selectedDraft.endpoint} onChange={(e) => onToolChange(selectedToolKey, 'endpoint', e.target.value)} />
                                        </InlineFields>
                                    </FieldGroup>

                                    <FieldGroup>
                                        <FieldLabel>Base URL (base_url)</FieldLabel>
                                        <FieldHint>endpoint가 상대 경로면 필수입니다. endpoint를 절대 URL로 넣으면 생략 가능합니다.</FieldHint>
                                        <TextInput
                                            value={selectedDraft.baseUrl}
                                            onChange={(e) => onToolChange(selectedToolKey, 'baseUrl', e.target.value)}
                                            placeholder="예: http://event-analyzer:3002"
                                        />
                                    </FieldGroup>

                                    <FieldGroup>
                                        <FieldLabel>실제 사용 파라미터 요약</FieldLabel>
                                        <FieldHint>백엔드 동적 REST 호출에서 실제 사용되는 입력 후보입니다. 아래 input 행에서 context/request를 직접 수정하면 JSON에 즉시 반영됩니다.</FieldHint>
                                        <div style={{ display: 'grid', gap: '8px', marginBottom: '8px' }}>
                                            <div style={{ display: 'grid', gap: '4px' }}>
                                                <FieldHint>context 파라미터</FieldHint>
                                                <div style={{ display: 'grid', gap: '6px' }}>
                                                    {editableContextParams.length > 0 ? editableContextParams.map((row, index) => (
                                                        <div key={`ctx-${index}`} style={{ display: 'grid', gap: '6px', gridTemplateColumns: 'minmax(120px,1fr) minmax(150px,1fr) 80px 70px', alignItems: 'center' }}>
                                                            <TextInput
                                                                value={row.argKey}
                                                                onChange={(e) => handleChangeContextParam(index, { argKey: e.target.value })}
                                                                placeholder="argKey"
                                                            />
                                                            <TextInput
                                                                value={row.sourcePath}
                                                                onChange={(e) => handleChangeContextParam(index, { sourcePath: e.target.value })}
                                                                placeholder="sourcePath"
                                                            />
                                                            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: '#334155' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(row.required)}
                                                                    onChange={(e) => handleChangeContextParam(index, { required: e.target.checked })}
                                                                />
                                                                필수
                                                            </label>
                                                            <SecondaryTextButton type="button" onClick={() => handleRemoveContextParam(index)} style={{ height: '32px' }}>
                                                                삭제
                                                            </SecondaryTextButton>
                                                        </div>
                                                    )) : (
                                                        <FieldHint>등록된 context 파라미터가 없습니다.</FieldHint>
                                                    )}
                                                    <SecondaryTextButton type="button" onClick={handleAddContextParam} style={{ width: 'fit-content', height: '32px' }}>
                                                        + context 추가
                                                    </SecondaryTextButton>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gap: '4px' }}>
                                                <FieldHint>request 파라미터</FieldHint>
                                                <div style={{ display: 'grid', gap: '6px' }}>
                                                    {editableRequestParams.length > 0 ? editableRequestParams.map((row, index) => (
                                                        <div key={`req-${index}`} style={{ display: 'grid', gap: '6px', gridTemplateColumns: 'minmax(120px,1fr) 120px 110px 80px 70px', alignItems: 'center' }}>
                                                            <TextInput
                                                                value={row.name}
                                                                onChange={(e) => handleChangeRequestParam(index, { name: e.target.value })}
                                                                placeholder="name"
                                                            />
                                                            <select
                                                                value={row.type || 'string'}
                                                                onChange={(e) => handleChangeRequestParam(index, { type: e.target.value })}
                                                                style={{ height: '38px', border: '1px solid #dbe3ef', borderRadius: '10px', background: '#fff', padding: '0 10px', fontSize: '13px', color: '#334155' }}
                                                            >
                                                                <option value="string">string</option>
                                                                <option value="number">number</option>
                                                                <option value="integer">integer</option>
                                                                <option value="boolean">boolean</option>
                                                                <option value="object">object</option>
                                                                <option value="array">array</option>
                                                            </select>
                                                            <select
                                                                value={row.in || ''}
                                                                onChange={(e) => handleChangeRequestParam(index, { in: e.target.value })}
                                                                style={{ height: '38px', border: '1px solid #dbe3ef', borderRadius: '10px', background: '#fff', padding: '0 10px', fontSize: '13px', color: '#334155' }}
                                                            >
                                                                <option value="">auto</option>
                                                                <option value="query">query</option>
                                                                <option value="body">body</option>
                                                                <option value="header">header</option>
                                                            </select>
                                                            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: '#334155' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(row.required)}
                                                                    onChange={(e) => handleChangeRequestParam(index, { required: e.target.checked })}
                                                                />
                                                                필수
                                                            </label>
                                                            <SecondaryTextButton type="button" onClick={() => handleRemoveRequestParam(index)} style={{ height: '32px' }}>
                                                                삭제
                                                            </SecondaryTextButton>
                                                        </div>
                                                    )) : (
                                                        <FieldHint>등록된 request 파라미터가 없습니다.</FieldHint>
                                                    )}
                                                    <SecondaryTextButton type="button" onClick={handleAddRequestParam} style={{ width: 'fit-content', height: '32px' }}>
                                                        + request 추가
                                                    </SecondaryTextButton>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                border: '1px solid #dbe3ef',
                                                borderRadius: '10px',
                                                background: '#f8fafc',
                                                padding: '10px 12px',
                                                display: 'grid',
                                                gap: '6px',
                                                fontSize: '12px',
                                                color: '#334155',
                                            }}
                                        >
                                            <div>
                                                context: {selectedContextSummary.length > 0
                                                    ? selectedContextSummary.join(', ')
                                                    : '-'}
                                            </div>
                                            <div>
                                                request: {requestSummary.length > 0
                                                    ? requestSummary.join(', ')
                                                    : '-'}
                                            </div>
                                            <div>
                                                headers: {headerSummary.length > 0
                                                    ? headerSummary.map((key) => `${key}(header:fixed)`).join(', ')
                                                    : '-'}
                                            </div>
                                        </div>
                                    </FieldGroup>

                                    <FieldGroup>
                                        <FieldLabel>Request Headers (request_headers JSON)</FieldLabel>
                                        <FieldHint>고정 헤더 값을 JSON 객체로 입력합니다.</FieldHint>
                                        <PromptTextarea
                                            value={selectedDraft.requestHeadersText}
                                            onChange={(e) => onToolChange(selectedToolKey, 'requestHeadersText', e.target.value)}
                                            style={{ minHeight: '96px' }}
                                        />
                                        <FieldHint>예: {'{'}"x-client-id":"robot-ui","x-trace-id":"ailog-chat"{'}'}</FieldHint>
                                    </FieldGroup>

                                    <FieldGroup>
                                        <FieldLabel>Request Query (request_query JSON)</FieldLabel>
                                        <FieldHint>항상 포함할 query 파라미터를 JSON 객체로 입력합니다.</FieldHint>
                                        <PromptTextarea
                                            value={selectedDraft.requestQueryText}
                                            onChange={(e) => onToolChange(selectedToolKey, 'requestQueryText', e.target.value)}
                                            style={{ minHeight: '96px' }}
                                        />
                                        <FieldHint>예: {'{'}"count":1000,"includeClosed":false{'}'}</FieldHint>
                                    </FieldGroup>

                                    <FieldGroup>
                                        <FieldLabel>Request Body (request_body JSON)</FieldLabel>
                                        <FieldHint>항상 포함할 body 값을 JSON 객체로 입력합니다.</FieldHint>
                                        <PromptTextarea
                                            value={selectedDraft.requestBodyText}
                                            onChange={(e) => onToolChange(selectedToolKey, 'requestBodyText', e.target.value)}
                                            style={{ minHeight: '96px' }}
                                        />
                                        <FieldHint>예: {'{'}"source":"ai-chat","requestedBy":"robot/ailog/event"{'}'}</FieldHint>
                                    </FieldGroup>
                                </>
                            )}
                        </div>

                        <ModalActions style={{ gap: '10px' }}>
                            <ToggleButton
                                type="button"
                                $active={selectedDraft.enabled}
                                onClick={() => onToolChange(selectedToolKey, 'enabled', !selectedDraft.enabled)}
                            >
                                {selectedDraft.enabled ? '활성' : '비활성'}
                            </ToggleButton>

                            <SecondaryTextButton type="button" onClick={() => onDeleteTool(selectedTool)}>
                                삭제
                            </SecondaryTextButton>

                            <SecondaryTextButton type="button" onClick={closeDetail}>
                                닫기
                            </SecondaryTextButton>

                            <PrimaryButton
                                type="button"
                                onClick={() => onSaveTool(selectedTool)}
                                disabled={savingToolKey === selectedToolKey}
                            >
                                {savingToolKey === selectedToolKey ? '저장 중...' : '저장'}
                            </PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}

            {createOpen ? (
                <ModalBackdrop>
                    <ModalCard style={ACTION_CREATE_MODAL_STYLE}>
                        <ModalTitle>화면 액션 추가</ModalTitle>
                        <ModalDescription>선택한 화면에 연결할 REST 액션을 등록합니다.</ModalDescription>

                        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                            <FieldLabel>액션 유형</FieldLabel>
                            <select
                                value={createDraft.actionTypeKey}
                                onChange={(e) => handleCreateChange('actionTypeKey', e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '42px',
                                    border: '1px solid #dbe3ef',
                                    borderRadius: '10px',
                                    padding: '0 10px',
                                    fontSize: '13px',
                                    color: '#334155',
                                    background: '#fff',
                                }}
                            >
                                {(actionTypes ?? []).map((item) => (
                                    <option key={item.key} value={item.key}>{item.label}</option>
                                ))}
                            </select>

                            <FieldLabel>액션 키 (tool_name)</FieldLabel>
                            <TextInput value={createDraft.toolName} onChange={(e) => handleCreateChange('toolName', e.target.value)} />
                            <FieldHint>예: create_report, search_history, update_robot_status</FieldHint>

                            <FieldLabel>표시명 (display_name)</FieldLabel>
                            <TextInput value={createDraft.displayName} onChange={(e) => handleCreateChange('displayName', e.target.value)} />

                            <FieldLabel>설명 (description)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.description}
                                onChange={(e) => handleCreateChange('description', e.target.value)}
                                style={{ minHeight: '72px' }}
                            />

                            <FieldLabel>엔드포인트 (endpoint)</FieldLabel>
                            <TextInput value={createDraft.endpoint} onChange={(e) => handleCreateChange('endpoint', e.target.value)} />
                            <FieldHint>예: /api/robot/reports/search</FieldHint>

                            <FieldLabel>Base URL (base_url)</FieldLabel>
                            <TextInput
                                value={createDraft.baseUrl}
                                onChange={(e) => handleCreateChange('baseUrl', e.target.value)}
                                placeholder="예: http://action-runner:3004"
                            />
                            <FieldHint>endpoint가 상대 경로면 필수입니다. endpoint를 절대 URL로 넣으면 생략 가능합니다.</FieldHint>

                            <FieldLabel>Request Headers (request_headers JSON)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.requestHeadersText}
                                onChange={(e) => handleCreateChange('requestHeadersText', e.target.value)}
                                style={{ minHeight: '84px' }}
                            />
                            <FieldHint>예: {'{'}"x-client-id":"robot-ui","x-trace-id":"ailog-chat"{'}'}</FieldHint>

                            <FieldLabel>Request Query (request_query JSON)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.requestQueryText}
                                onChange={(e) => handleCreateChange('requestQueryText', e.target.value)}
                                style={{ minHeight: '84px' }}
                            />
                            <FieldHint>예: {'{'}"count":1000,"includeClosed":false{'}'}</FieldHint>

                            <FieldLabel>Request Body (request_body JSON)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.requestBodyText}
                                onChange={(e) => handleCreateChange('requestBodyText', e.target.value)}
                                style={{ minHeight: '84px' }}
                            />
                            <FieldHint>예: {'{'}"source":"ai-chat","requestedBy":"robot/ailog/event"{'}'}</FieldHint>

                            <FieldLabel>context_params (JSON)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.contextParamsText}
                                onChange={(e) => handleCreateChange('contextParamsText', e.target.value)}
                                style={{ minHeight: '84px' }}
                            />
                            <FieldHint>
                                예: [{'{'}"argKey":"groupId","sourcePath":"groupId","required":true{'}'}, {'{'}"argKey":"siteId","sourcePath":"siteId"{'}'}]
                            </FieldHint>

                            <FieldLabel>request_params (JSON, 프론트 body 기준)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.requestParamsText}
                                onChange={(e) => handleCreateChange('requestParamsText', e.target.value)}
                                style={{ minHeight: '84px' }}
                            />
                            <FieldHint>이 값들은 프론트엔드가 body로 보내는 필드 구조를 기준으로 작성합니다.</FieldHint>

                            <FieldLabel>static_payload (JSON)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.staticPayloadText}
                                onChange={(e) => handleCreateChange('staticPayloadText', e.target.value)}
                                style={{ minHeight: '84px' }}
                            />

                            <PromptFooter>
                                <ToggleButton
                                    type="button"
                                    $active={Boolean(createDraft.enabled)}
                                    onClick={() => handleCreateChange('enabled', !createDraft.enabled)}
                                >
                                    {createDraft.enabled ? '활성' : '비활성'}
                                </ToggleButton>
                            </PromptFooter>
                        </div>

                        <ModalActions style={{ gap: '10px' }}>
                            <SecondaryTextButton type="button" onClick={() => setCreateOpen(false)} style={MODAL_BUTTON_STYLE}>취소</SecondaryTextButton>
                            <PrimaryButton type="button" onClick={handleCreateSubmit} disabled={savingCreateTool} style={MODAL_BUTTON_STYLE}>
                                {savingCreateTool ? '저장 중...' : '저장'}
                            </PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}
        </div>
    )
}
