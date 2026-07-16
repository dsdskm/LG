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

const MODAL_BUTTON_STYLE = {
    height: '42px',
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

export const AppScreenSettingsTab = ({
    activeRouteKey,
    screenGroups,
    commonPromptItem,
    commonPromptDraft,
    actionTypes,
    promptDrafts,
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
                    prompts={group.prompts}
                    promptDrafts={promptDrafts}
                    savingPromptKey={savingPromptKey}
                    onPromptChange={onPromptChange}
                    onSavePrompt={onSavePrompt}
                />
                <ScreenGuidanceList
                    appKey={String(group.routeKey ?? '').split('/')[0] || ''}
                    routeKey={group.routeKey}
                    routeParentKey={group.routeParentKey}
                    screenName={title}
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

const ScreenPromptList = ({ commonPromptItem, commonPromptDraft, prompts, promptDrafts, savingPromptKey, onPromptChange, onSavePrompt }) => {
    const [previewOpen, setPreviewOpen] = useState(false)

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>화면 프롬프트</CardTitle>
                    <ComingSoonBadge>공통 1개 + 화면 {prompts.length}개</ComingSoonBadge>
                </CardHeader>

                <SecondaryTextButton type="button" onClick={() => setPreviewOpen(true)}>
                    공통 프롬프트 미리보기
                </SecondaryTextButton>
            </SectionTitleRow>

            <PageDescription>
                실제 호출 시 공통 프롬프트가 먼저 적용되고, 아래 화면 프롬프트가 이어서 함께 전달됩니다.
            </PageDescription>

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
                    <PageDescription>이 화면 전용 프롬프트가 없습니다. 현재는 공통 프롬프트만 적용됩니다.</PageDescription>
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
    screenName,
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
            screenName: String(activeGuidance.screenName ?? ''),
            fallbackText: String(activeGuidance.fallbackText ?? ''),
            sectionsText: JSON.stringify(activeGuidance.sections ?? [], null, 2),
            examplesText: JSON.stringify(activeGuidance.examples ?? [], null, 2),
            enabled: activeGuidance.enabled !== false,
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

    const persistExamples = async (nextExamples, nextFallbackText) => {
        if (activeGuidance) {
            const nextDraft = {
                ...activeDraft,
                examplesText: JSON.stringify(nextExamples, null, 2),
                fallbackText: nextFallbackText ?? String(activeDraft?.fallbackText ?? ''),
            }
            onGuidanceChange(draftKey, 'examplesText', nextDraft.examplesText)
            if (nextFallbackText !== undefined) {
                onGuidanceChange(draftKey, 'fallbackText', nextDraft.fallbackText)
            }
            await onSaveGuidance(activeGuidance, nextDraft)
            return true
        }

        const created = await onCreateGuidance({
            appKey,
            routeKey,
            routeParentKey,
            screenName,
            initialExamples: nextExamples,
            fallbackText: nextFallbackText ?? '',
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
                                    <PromptMeta>
                                            <span>{(typeof example === 'string' ? example : example?.q) || `추천 메세지 ${index + 1}`}</span>
                                            <span>순서: {index + 1}</span>
                                    </PromptMeta>

                                    <FieldGroup>
                                        <FieldLabel>질문</FieldLabel>
                                        <PageDescription>{String(typeof example === 'string' ? example : (example?.q ?? '-'))}</PageDescription>
                                    </FieldGroup>

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

                    <PromptCard>
                        <PromptMeta>
                            <span>{activeGuidance.screenName || activeGuidance.key}</span>
                            <span>fallback 설정</span>
                        </PromptMeta>

                        <FieldLabel>fallback_text</FieldLabel>
                        <PromptTextarea
                            value={String(activeDraft?.fallbackText ?? '')}
                            onChange={(e) => onGuidanceChange(draftKey, 'fallbackText', e.target.value)}
                            style={{ minHeight: '100px' }}
                        />
                        <FieldHint>추천 카드 노출이 어렵거나 매칭 실패 시 반환할 기본 안내 문구입니다.</FieldHint>

                        <FieldLabel>screen_name</FieldLabel>
                        <TextInput
                            value={String(activeDraft?.screenName ?? '')}
                            onChange={(e) => onGuidanceChange(draftKey, 'screenName', e.target.value)}
                        />

                        <PromptFooter>
                            <ToggleButton
                                type="button"
                                $active={Boolean(activeDraft?.enabled)}
                                onClick={() => onGuidanceChange(draftKey, 'enabled', !activeDraft?.enabled)}
                            >
                                {activeDraft?.enabled ? '활성' : '비활성'}
                            </ToggleButton>

                            <PrimaryButton
                                type="button"
                                onClick={() => onSaveGuidance(activeGuidance)}
                                disabled={savingGuidanceKey === draftKey}
                            >
                                {savingGuidanceKey === draftKey ? '저장 중...' : '설정 저장'}
                            </PrimaryButton>
                        </PromptFooter>
                    </PromptCard>
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
    const [createDraft, setCreateDraft] = useState({
        actionTypeKey: String(actionTypes?.[0]?.key ?? ''),
        toolName: '',
        displayName: '',
        description: '',
        endpoint: '',
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
                        const draft = toolDrafts[toolKey] ?? {
                            enabled: item.enabled !== false,
                            displayName: String(item.displayName ?? ''),
                            description: String(item.description ?? ''),
                            apiName: String(item.apiName ?? ''),
                            method: String(item.method ?? ''),
                            endpoint: String(item.endpoint ?? ''),
                            contextParamsText: JSON.stringify(item.contextParams ?? [], null, 2),
                            requestParamsText: JSON.stringify(item.requestParams ?? [], null, 2),
                            staticPayloadText: JSON.stringify(item.staticPayload ?? {}, null, 2),
                        }

                        return (
                            <PromptCard key={toolKey}>
                                <PromptMeta>
                                    <span>{item.toolName}</span>
                                    <span>{item.key}</span>
                                    <span>parent: {item.routeKey || '-'}</span>
                                    <span>kind: {item.kind}</span>
                                </PromptMeta>

                                <FieldGroup>
                                    <FieldLabel>표시명 (display_name)</FieldLabel>
                                    <FieldHint>설정 화면에 노출되는 툴 이름입니다.</FieldHint>
                                    <TextInput
                                        value={draft.displayName}
                                        onChange={(e) => onToolChange(toolKey, 'displayName', e.target.value)}
                                    />
                                </FieldGroup>

                                <FieldGroup>
                                    <FieldLabel>설명 (description)</FieldLabel>
                                    <FieldHint>툴 목적과 사용 조건을 설명합니다.</FieldHint>
                                    <PromptTextarea
                                        value={draft.description}
                                        onChange={(e) => onToolChange(toolKey, 'description', e.target.value)}
                                        style={{ minHeight: '96px' }}
                                    />
                                </FieldGroup>

                                <FieldGroup>
                                    <FieldLabel>API 정보</FieldLabel>
                                    <FieldHint>연동 대상 API 이름, 메서드, 엔드포인트입니다.</FieldHint>
                                    <InlineFields>
                                        <TextInput value={draft.apiName} onChange={(e) => onToolChange(toolKey, 'apiName', e.target.value)} />
                                        <TextInput value={draft.method} onChange={(e) => onToolChange(toolKey, 'method', e.target.value)} />
                                        <TextInput value={draft.endpoint} onChange={(e) => onToolChange(toolKey, 'endpoint', e.target.value)} />
                                    </InlineFields>
                                </FieldGroup>

                                <FieldGroup>
                                    <FieldLabel>context_params (JSON)</FieldLabel>
                                    <FieldHint>화면 컨텍스트에서 자동 주입할 값 정의입니다.</FieldHint>
                                    <PromptTextarea
                                        value={draft.contextParamsText}
                                        onChange={(e) => onToolChange(toolKey, 'contextParamsText', e.target.value)}
                                        style={{ minHeight: '120px' }}
                                    />
                                </FieldGroup>

                                <FieldGroup>
                                    <FieldLabel>request_params (JSON, 프론트 body 기준)</FieldLabel>
                                    <FieldHint>프론트엔드가 body로 보내는 파라미터 정의를 입력하세요.</FieldHint>
                                    <PromptTextarea
                                        value={draft.requestParamsText}
                                        onChange={(e) => onToolChange(toolKey, 'requestParamsText', e.target.value)}
                                        style={{ minHeight: '120px' }}
                                    />
                                </FieldGroup>

                                <FieldGroup>
                                    <FieldLabel>static_payload (JSON)</FieldLabel>
                                    <FieldHint>항상 고정으로 전달할 payload 값입니다.</FieldHint>
                                    <PromptTextarea
                                        value={draft.staticPayloadText}
                                        onChange={(e) => onToolChange(toolKey, 'staticPayloadText', e.target.value)}
                                        style={{ minHeight: '120px' }}
                                    />
                                </FieldGroup>

                                <PromptFooter>
                                    <ToggleButton
                                        type="button"
                                        $active={draft.enabled}
                                        onClick={() => onToolChange(toolKey, 'enabled', !draft.enabled)}
                                    >
                                        {draft.enabled ? '활성' : '비활성'}
                                    </ToggleButton>

                                    <SecondaryTextButton type="button" onClick={() => onDeleteTool(item)}>
                                        삭제
                                    </SecondaryTextButton>

                                    <PrimaryButton
                                        type="button"
                                        onClick={() => onSaveTool(item)}
                                        disabled={savingToolKey === toolKey}
                                    >
                                        {savingToolKey === toolKey ? '저장 중...' : '저장'}
                                    </PrimaryButton>
                                </PromptFooter>
                            </PromptCard>
                        )
                    })
                ) : (
                    <PageDescription>등록된 화면 액션이 없습니다. + 화면 액션 추가로 첫 액션을 등록해 주세요.</PageDescription>
                )}
            </OptionList>

            {createOpen ? (
                <ModalBackdrop>
                    <ModalCard style={LARGE_MODAL_STYLE}>
                        <ModalTitle>화면 액션 추가</ModalTitle>
                        <ModalDescription>선택한 화면에 연결할 REST 액션을 등록합니다.</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
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
                                style={{ minHeight: '96px' }}
                            />

                            <FieldLabel>엔드포인트 (endpoint)</FieldLabel>
                            <TextInput value={createDraft.endpoint} onChange={(e) => handleCreateChange('endpoint', e.target.value)} />
                            <FieldHint>예: /api/robot/reports/search</FieldHint>

                            <FieldLabel>context_params (JSON)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.contextParamsText}
                                onChange={(e) => handleCreateChange('contextParamsText', e.target.value)}
                                style={{ minHeight: '120px' }}
                            />

                            <FieldLabel>request_params (JSON, 프론트 body 기준)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.requestParamsText}
                                onChange={(e) => handleCreateChange('requestParamsText', e.target.value)}
                                style={{ minHeight: '120px' }}
                            />
                            <FieldHint>이 값들은 프론트엔드가 body로 보내는 필드 구조를 기준으로 작성합니다.</FieldHint>

                            <FieldLabel>static_payload (JSON)</FieldLabel>
                            <PromptTextarea
                                value={createDraft.staticPayloadText}
                                onChange={(e) => handleCreateChange('staticPayloadText', e.target.value)}
                                style={{ minHeight: '120px' }}
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
