import { useEffect, useMemo, useRef, useState } from 'react'

import {
    SettingCard,
    CardHeader,
    CardTitle,
    OptionList,
    OptionButton,
    ActiveBadge,
    ActionRow,
    PrimaryButton,
    ManagementGrid,
    SectionTitleRow,
    PromptCard,
    PromptMeta,
    PromptTextarea,
    PromptFooter,
    SecondaryTextButton,
    ToggleButton,
    PageDescription,
    FieldLabel,
    FieldHint,
    InlineFields,
    SmallBadge,
    ModalBackdrop,
    ModalCard,
    ModalTitle,
    ModalDescription,
    ModalActions,
} from '../styles'

import { formatDateTime } from '../chatSettings.utils'

const UNIFIED_MODAL_STYLE = {
    width: 'min(760px, 100%)',
    height: 'auto',
    minHeight: '0',
    maxHeight: '72vh',
    overflowY: 'auto',
}

const ONE_LINE_INPUT_STYLE = {
    width: '100%',
    height: '34px',
    lineHeight: '34px',
    border: '1px solid #dbe3ef',
    borderRadius: '10px',
    padding: '0 10px',
    fontSize: '13px',
    color: '#334155',
    background: '#ffffff',
}

const normalizeKeywordArray = (value) => {
    const rows = Array.isArray(value) ? value : []
    const normalized = rows
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
    return Array.from(new Set(normalized))
}

const normalizeRagIntentType = (value) => {
    const normalized = String(value ?? '').trim().toLowerCase()
    if (normalized === 'info' || normalized === 'action' || normalized === 'both') return normalized
    return 'both'
}

const normalizeImageAttachMode = (value) => {
    const normalized = String(value ?? '').trim().toLowerCase()
    if (normalized === 'always' || normalized === 'never' || normalized === 'auto') return normalized
    return 'auto'
}

const IMAGE_ATTACH_MODE_OPTIONS = [
    { key: 'auto', label: '자동' },
    { key: 'always', label: '항상 표시' },
    { key: 'never', label: '표시 안함' },
]

const normalizeCommonRagIntentType = (item) => {
    const intentType = normalizeRagIntentType(item?.intentType)
    if (String(item?.key ?? '') !== 'common' || intentType !== 'both') return intentType

    const hint = `${String(item?.title ?? '')} ${String(item?.chunkKey ?? '')}`.toLowerCase()
    if (hint.includes('action') || hint.includes('액션')) return 'action'
    if (hint.includes('info') || hint.includes('정보')) return 'info'

    return 'both'
}

const getRagIntentLabel = (value) => {
    const intentType = normalizeRagIntentType(value)
    if (intentType === 'info') return 'info'
    if (intentType === 'action') return 'action'
    return 'both'
}

const KeywordListEditor = ({ keywords, onChange, hint }) => {
    const [newKeyword, setNewKeyword] = useState('')
    const [editingIndex, setEditingIndex] = useState(-1)
    const [editingValue, setEditingValue] = useState('')
    const isComposingRef = useRef(false)
    const list = Array.isArray(keywords) ? keywords : []

    const addKeyword = () => {
        const value = String(newKeyword ?? '').trim()
        if (!value) return
        onChange(Array.from(new Set([...list, value].map((item) => String(item ?? '').trim()).filter(Boolean))))
        setNewKeyword('')
    }

    const startEditKeyword = (index) => {
        setEditingIndex(index)
        setEditingValue(String(list[index] ?? ''))
    }

    const saveEditedKeyword = () => {
        const value = String(editingValue ?? '').trim()
        if (editingIndex < 0) return

        if (!value) {
            onChange(list.filter((_, idx) => idx !== editingIndex))
        } else {
            const next = list.slice()
            next[editingIndex] = value
            onChange(Array.from(new Set(next.map((item) => String(item ?? '').trim()).filter(Boolean))))
        }

        setEditingIndex(-1)
        setEditingValue('')
    }

    const deleteKeyword = (index) => {
        onChange(list.filter((_, idx) => idx !== index))
        if (editingIndex === index) {
            setEditingIndex(-1)
            setEditingValue('')
        }
    }

    return (
        <div style={{ display: 'grid', gap: '10px' }}>
            {list.length > 0 ? (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center',
                    }}
                >
                    {list.map((keyword, index) => (
                        <button
                            key={`keyword-chip-${index}`}
                            type="button"
                            onClick={() => startEditKeyword(index)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: 'fit-content',
                                maxWidth: '100%',
                                padding: '8px 12px',
                                borderRadius: '999px',
                                border: editingIndex === index ? '1px solid #2563eb' : '1px solid #dbe3ef',
                                background: editingIndex === index ? '#eff6ff' : '#ffffff',
                                color: editingIndex === index ? '#1d4ed8' : '#334155',
                                cursor: 'pointer',
                                fontSize: '13px',
                                lineHeight: 1.2,
                                boxShadow: editingIndex === index ? '0 0 0 2px rgba(37, 99, 235, 0.08)' : 'none',
                            }}
                        >
                            <span
                                style={{
                                    maxWidth: '280px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {keyword}
                            </span>
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    deleteKeyword(index)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        deleteKeyword(index)
                                    }
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '999px',
                                    background: 'rgba(37, 99, 235, 0.12)',
                                    color: '#1d4ed8',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    flex: '0 0 auto',
                                }}
                                aria-label={`${keyword} 삭제`}
                            >
                                ×
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}

            {editingIndex >= 0 ? (
                <InlineFields>
                    <input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                saveEditedKeyword()
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault()
                                setEditingIndex(-1)
                                setEditingValue('')
                            }
                        }}
                        placeholder="키워드 수정"
                        autoFocus
                        style={{
                            width: '100%',
                            border: '1px solid #dbe3ef',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            fontSize: '13px',
                            color: '#1f2937',
                        }}
                    />
                    <PrimaryButton type="button" onClick={saveEditedKeyword} style={{ height: '36px' }}>
                        저장
                    </PrimaryButton>
                    <SecondaryTextButton
                        type="button"
                        onClick={() => {
                            setEditingIndex(-1)
                            setEditingValue('')
                        }}
                    >
                        취소
                    </SecondaryTextButton>
                </InlineFields>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
                <input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onCompositionStart={() => {
                        isComposingRef.current = true
                    }}
                    onCompositionEnd={(e) => {
                        isComposingRef.current = false
                        setNewKeyword(e.currentTarget.value)
                    }}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        if (e.nativeEvent?.isComposing || isComposingRef.current || e.keyCode === 229) return
                        e.preventDefault()
                        addKeyword()
                    }}
                    placeholder="키워드 입력 후 Enter 또는 추가"
                    style={{
                        width: '100%',
                        border: '1px solid #dbe3ef',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        fontSize: '13px',
                        color: '#1f2937',
                    }}
                />
                <PrimaryButton type="button" onClick={addKeyword} style={{ height: '36px' }}>
                    추가
                </PrimaryButton>
            </div>

            {hint ? <FieldHint>{hint}</FieldHint> : null}
        </div>
    )
}

export const CommonSettingsTab = ({
    providerItem,
    values,
    draftProvider,
    setDraftProvider,
    isDirty,
    saving,
    onSaveProvider,
    commonPromptItem,
    commonPromptDraft,
    savingCommonPrompt,
    onCommonPromptChange,
    onSaveCommonPrompt,
    commonIntentPromptItem,
    commonIntentPromptDraft,
    savingCommonIntentPrompt,
    onCommonIntentPromptChange,
    onSaveCommonIntentPrompt,
    commonRagDocs,
    ragDrafts,
    savingRagKey,
    onRagChange,
    onSaveRag,
    newCommonInfoRagDraft,
    newCommonActionRagDraft,
    savingCreateCommonInfoRag,
    savingCreateCommonActionRag,
    deletingCommonRagKey,
    onNewCommonInfoRagChange,
    onNewCommonActionRagChange,
    onCreateCommonInfoRag,
    onCreateCommonActionRag,
    onDeleteCommonRag,
    commonTools,
    actionTypes,
    savingToolKey,
    savingCreateCommonTool,
    deletingToolKey,
    onSaveTool,
    onCreateCommonTool,
    onDeleteTool,
}) => {
    return (
        <ManagementGrid>
            <ProviderSettingCard
                providerItem={providerItem}
                values={values}
                draftProvider={draftProvider}
                setDraftProvider={setDraftProvider}
                isDirty={isDirty}
                saving={saving}
                onSaveProvider={onSaveProvider}
            />

            <CommonIntentPromptManagementCard
                commonIntentPromptItem={commonIntentPromptItem}
                commonIntentPromptDraft={commonIntentPromptDraft}
                savingCommonIntentPrompt={savingCommonIntentPrompt}
                onCommonIntentPromptChange={onCommonIntentPromptChange}
                onSaveCommonIntentPrompt={onSaveCommonIntentPrompt}
            />

            <PromptManagementCard
                commonPromptItem={commonPromptItem}
                commonPromptDraft={commonPromptDraft}
                savingCommonPrompt={savingCommonPrompt}
                onCommonPromptChange={onCommonPromptChange}
                onSaveCommonPrompt={onSaveCommonPrompt}
            />

            <CommonRagManagementCard
                ragDocs={commonRagDocs}
                ragDrafts={ragDrafts}
                savingRagKey={savingRagKey}
                onRagChange={onRagChange}
                onSaveRag={onSaveRag}
                intentType="info"
                title="공통 info RAG 데이터"
                description="공통 info RAG는 정보성 답변에 쓰는 근거 청크를 모아 관리합니다."
                newCommonRagDraft={newCommonInfoRagDraft}
                savingCreateCommonRag={savingCreateCommonInfoRag}
                deletingCommonRagKey={deletingCommonRagKey}
                onNewCommonRagChange={onNewCommonInfoRagChange}
                onCreateCommonRag={onCreateCommonInfoRag}
                onDeleteCommonRag={onDeleteCommonRag}
            />

            <CommonRagManagementCard
                ragDocs={commonRagDocs}
                ragDrafts={ragDrafts}
                savingRagKey={savingRagKey}
                onRagChange={onRagChange}
                onSaveRag={onSaveRag}
                intentType="action"
                title="공통 action RAG 데이터"
                description="공통 action RAG는 실행/변경/보강용 근거 청크를 모아 관리합니다."
                newCommonRagDraft={newCommonActionRagDraft}
                savingCreateCommonRag={savingCreateCommonActionRag}
                deletingCommonRagKey={deletingCommonRagKey}
                onNewCommonRagChange={onNewCommonActionRagChange}
                onCreateCommonRag={onCreateCommonActionRag}
                onDeleteCommonRag={onDeleteCommonRag}
            />

            <CommonToolManagementCard
                tools={commonTools}
                actionTypes={actionTypes}
                savingToolKey={savingToolKey}
                savingCreateCommonTool={savingCreateCommonTool}
                deletingToolKey={deletingToolKey}
                onSaveTool={onSaveTool}
                onCreateCommonTool={onCreateCommonTool}
                onDeleteTool={onDeleteTool}
            />
        </ManagementGrid>
    )
}

const CommonIntentPromptManagementCard = ({
    commonIntentPromptItem,
    commonIntentPromptDraft,
    savingCommonIntentPrompt,
    onCommonIntentPromptChange,
    onSaveCommonIntentPrompt,
}) => {
    const hasPrompt = Boolean(commonIntentPromptItem?.id)

    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>공통 분기 프롬프트</CardTitle>
            </CardHeader>

            <PageDescription>
                모든 화면의 intent 분기에서 공통으로 쓰는 기본 규칙입니다. 화면별 분기 프롬프트는 이 규칙 위에 추가로 붙습니다.
            </PageDescription>

            <PromptCard>
                <PromptMeta>
                    <span>{commonIntentPromptItem?.label || commonIntentPromptDraft.label || '공통 분기 프롬프트'}</span>
                    <span>key: common</span>
                    <span>type: intent-hint</span>
                    {hasPrompt ? <span>updated: {formatDateTime(commonIntentPromptItem?.updatedAt)}</span> : null}
                </PromptMeta>

                <FieldLabel>프롬프트</FieldLabel>
                <PromptTextarea
                    value={commonIntentPromptDraft.content}
                    onChange={(e) => onCommonIntentPromptChange('content', e.target.value)}
                    
                />

                <PromptFooter>
                    <ToggleButton
                        type="button"
                        $active={Boolean(commonIntentPromptDraft.enabled)}
                        onClick={() => onCommonIntentPromptChange('enabled', !commonIntentPromptDraft.enabled)}
                    >
                        {commonIntentPromptDraft.enabled ? '활성' : '비활성'}
                    </ToggleButton>

                    {hasPrompt ? (
                        <SecondaryTextButton
                            type="button"
                            onClick={() => {
                                onCommonIntentPromptChange('content', String(commonIntentPromptItem?.content ?? ''))
                                onCommonIntentPromptChange('label', String(commonIntentPromptItem?.label ?? '공통 분기 프롬프트'))
                                onCommonIntentPromptChange('enabled', commonIntentPromptItem?.enabled !== false)
                            }}
                        >
                            원본 복원
                        </SecondaryTextButton>
                    ) : null}

                    <PrimaryButton type="button" onClick={onSaveCommonIntentPrompt} disabled={savingCommonIntentPrompt}>
                        {savingCommonIntentPrompt ? '저장 중...' : hasPrompt ? '저장' : '등록'}
                    </PrimaryButton>
                </PromptFooter>
            </PromptCard>
        </SettingCard>
    )
}

const ProviderSettingCard = ({
    providerItem,
    values,
    draftProvider,
    setDraftProvider,
    isDirty,
    saving,
    onSaveProvider,
}) => {
    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>LLM Provider</CardTitle>
            </CardHeader>

            <PageDescription>챗봇 응답 생성에 사용할 LLM 제공자를 선택합니다.</PageDescription>

            <OptionList>
                {(providerItem?.options ?? []).map((opt) => {
                    const active = draftProvider === opt.value
                    const current = values.llmProvider === opt.value

                    return (
                        <OptionButton key={opt.value} type="button" $active={active} onClick={() => setDraftProvider(opt.value)}>
                            <span>{opt.label}</span>
                            {current ? <ActiveBadge>현재</ActiveBadge> : null}
                        </OptionButton>
                    )
                })}
            </OptionList>

            <ActionRow>
                <PrimaryButton type="button" onClick={onSaveProvider} disabled={!isDirty || saving}>
                    {saving ? '저장 중...' : '저장'}
                </PrimaryButton>
            </ActionRow>
        </SettingCard>
    )
}

const PromptManagementCard = ({
    commonPromptItem,
    commonPromptDraft,
    savingCommonPrompt,
    onCommonPromptChange,
    onSaveCommonPrompt,
}) => {
    const hasPrompt = Boolean(commonPromptItem?.id)

    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>공통 프롬프트</CardTitle>
            </CardHeader>

            <PageDescription>공통 답변 톤과 규칙을 관리합니다. 없으면 등록하고, 있으면 수정합니다.</PageDescription>

            <PromptCard>
                <PromptMeta>
                    <span>{commonPromptItem?.label || commonPromptDraft.label || '공통 프롬프트'}</span>
                    <span>key: common</span>
                    <span>type: system</span>
                    {hasPrompt ? <span>updated: {formatDateTime(commonPromptItem?.updatedAt)}</span> : null}
                </PromptMeta>

                <PromptTextarea
                    
                    value={commonPromptDraft.content}
                    onChange={(e) => onCommonPromptChange('content', e.target.value)}
                />

                <PromptFooter>
                    <ToggleButton
                        type="button"
                        $active={Boolean(commonPromptDraft.enabled)}
                        onClick={() => onCommonPromptChange('enabled', !commonPromptDraft.enabled)}
                    >
                        {commonPromptDraft.enabled ? '활성' : '비활성'}
                    </ToggleButton>

                    {hasPrompt ? (
                        <SecondaryTextButton
                            type="button"
                            onClick={() => {
                                onCommonPromptChange('content', String(commonPromptItem?.content ?? ''))
                                onCommonPromptChange('label', String(commonPromptItem?.label ?? '공통 프롬프트'))
                                onCommonPromptChange('enabled', commonPromptItem?.enabled !== false)
                            }}
                        >
                            원본 복원
                        </SecondaryTextButton>
                    ) : null}

                    <PrimaryButton type="button" onClick={onSaveCommonPrompt} disabled={savingCommonPrompt}>
                        {savingCommonPrompt ? '저장 중...' : hasPrompt ? '저장' : '등록'}
                    </PrimaryButton>
                </PromptFooter>
            </PromptCard>
        </SettingCard>
    )
}

const CommonRagManagementCard = ({
    ragDocs,
    ragDrafts,
    savingRagKey,
    onRagChange,
    onSaveRag,
    intentType,
    title,
    description,
    newCommonRagDraft,
    savingCreateCommonRag,
    deletingCommonRagKey,
    onNewCommonRagChange,
    onCreateCommonRag,
    onDeleteCommonRag,
}) => {
    const sortedRagDocs = useMemo(() => {
        return [...ragDocs]
            .filter((item) => {
                const itemIntent = normalizeCommonRagIntentType(item)
                if (intentType === 'info') return itemIntent === 'info' || itemIntent === 'both'
                if (intentType === 'action') return itemIntent === 'action'
                return true
            })
            .sort((left, right) => {
            const leftOrder = Number(left?.sortOrder ?? 0)
            const rightOrder = Number(right?.sortOrder ?? 0)

            if (leftOrder !== rightOrder) return leftOrder - rightOrder
            return String(left?.chunkKey ?? '').localeCompare(String(right?.chunkKey ?? ''))
            })
    }, [ragDocs, intentType])

    const [activeRagKey, setActiveRagKey] = useState('')
    const [creatingOpen, setCreatingOpen] = useState(false)

    const handleCreateCommonRagSubmit = async () => {
        await onCreateCommonRag()
    }

    const toggleCreatingOpen = () => {
        setCreatingOpen((prev) => {
            const next = !prev
            if (next) {
                // 등록 모드로 들어가면 탭 포커스를 해제한다.
                setActiveRagKey('')
            }
            return next
        })
    }

    useEffect(() => {
        if (sortedRagDocs.length === 0) {
            if (activeRagKey) setActiveRagKey('')
            return
        }

        if (creatingOpen) {
            return
        }

        const exists = sortedRagDocs.some((item) => String(item.id) === activeRagKey)
        if (!exists) {
            setActiveRagKey(String(sortedRagDocs[0].id))
        }
    }, [sortedRagDocs, activeRagKey, creatingOpen])

    const activeRagDoc = sortedRagDocs.find((item) => String(item.id) === activeRagKey) ?? null
    const resolvedActiveRagIntentType = normalizeCommonRagIntentType(activeRagDoc)
    const activeRagDraft = activeRagDoc
        ? {
            title: String(activeRagDoc.title ?? ''),
            body: String(activeRagDoc.body ?? ''),
            imageUrl: String(activeRagDoc.imageUrl ?? ''),
            keywords: normalizeKeywordArray(activeRagDoc.keywords ?? []),
            enabled: activeRagDoc.enabled !== false,
            ...(ragDrafts[activeRagKey] ?? {}),
            intentType: normalizeRagIntentType(ragDrafts[activeRagKey]?.intentType ?? resolvedActiveRagIntentType),
            imageAttachMode: normalizeImageAttachMode(ragDrafts[activeRagKey]?.imageAttachMode ?? activeRagDoc.imageAttachMode),
        }
        : null

    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>{title || '공통 RAG 데이터'}</CardTitle>
                <SmallBadge>{sortedRagDocs.length}개 청크</SmallBadge>
            </CardHeader>

            <PageDescription>{description || '공통 RAG는 단일 문서가 아니라 목차/단락 단위 청크 목록으로 관리하는 것이 권장됩니다.'}</PageDescription>

            {sortedRagDocs.length > 0 ? (
                <>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <strong style={{ fontSize: '13px', color: '#334155' }}>{getRagIntentLabel(intentType)} 구성</strong>
                            <PrimaryButton
                                type="button"
                                onClick={toggleCreatingOpen}
                                disabled={savingCreateCommonRag}
                                style={{ height: '36px' }}
                            >
                                {creatingOpen ? '등록 닫기' : '+ 청크 추가'}
                            </PrimaryButton>
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
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {activeRagDoc && activeRagDraft ? (
                        <PromptCard>
                            <PromptMeta>
                                <span>{activeRagDoc.title || activeRagDoc.chunkKey}</span>
                                <span>key: common</span>
                                <span>intent: {getRagIntentLabel(activeRagDraft.intentType)}</span>
                                <span>updated: {formatDateTime(activeRagDoc.updatedAt)}</span>
                            </PromptMeta>

                            <FieldLabel>제목</FieldLabel>
                            <input
                                type="text"
                                style={ONE_LINE_INPUT_STYLE}
                                value={activeRagDraft.title}
                                onChange={(e) => onRagChange(activeRagKey, 'title', e.target.value)}
                            />
                            <FieldHint>질문 의도와 바로 연결되는 제목으로 작성하세요.</FieldHint>

                            <FieldLabel>keywords</FieldLabel>
                            <KeywordListEditor
                                keywords={activeRagDraft.keywords}
                                onChange={(next) => onRagChange(activeRagKey, 'keywords', next)}
                                hint="동의어/사용자 표현까지 넣어야 조회 정확도가 올라갑니다."
                            />

                            <FieldLabel>body</FieldLabel>
                            <PromptTextarea
                                value={activeRagDraft.body}
                                onChange={(e) => onRagChange(activeRagKey, 'body', e.target.value)}
                            />
                            <FieldHint>한 청크는 한 주제만 다루는 것이 좋습니다(목차/단락 단위).</FieldHint>

                            <FieldLabel>imageUrl</FieldLabel>
                            <input
                                type="text"
                                style={ONE_LINE_INPUT_STYLE}
                                value={String(activeRagDraft.imageUrl ?? '')}
                                onChange={(e) => onRagChange(activeRagKey, 'imageUrl', e.target.value)}
                            />
                            <FieldHint>설명 답변에 같이 노출할 이미지 URL입니다. 로컬/사설/퍼블릭 URL 모두 가능합니다.</FieldHint>

                            <FieldLabel>이미지 노출 정책</FieldLabel>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {IMAGE_ATTACH_MODE_OPTIONS.map((option) => {
                                    const active = normalizeImageAttachMode(activeRagDraft.imageAttachMode) === option.key
                                    return (
                                        <button
                                            key={`edit-image-mode-${option.key}`}
                                            type="button"
                                            onClick={() => onRagChange(activeRagKey, 'imageAttachMode', option.key)}
                                            style={{
                                                height: '32px',
                                                padding: '0 10px',
                                                borderRadius: '999px',
                                                border: active ? '1px solid #2563eb' : '1px solid #dbe3ef',
                                                background: active ? '#eff6ff' : '#ffffff',
                                                color: active ? '#1d4ed8' : '#475569',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    )
                                })}
                            </div>

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
                                    onClick={() => onRagChange(activeRagKey, 'title', String(activeRagDoc.title ?? ''))}
                                >
                                    제목 원복
                                </SecondaryTextButton>

                                <SecondaryTextButton
                                    type="button"
                                    onClick={() => onDeleteCommonRag(activeRagDoc)}
                                    disabled={deletingCommonRagKey === activeRagKey}
                                >
                                    {deletingCommonRagKey === activeRagKey ? '삭제 중...' : '삭제'}
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
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <PrimaryButton
                            type="button"
                            onClick={toggleCreatingOpen}
                            disabled={savingCreateCommonRag}
                            style={{ height: '36px' }}
                        >
                            {creatingOpen ? '등록 닫기' : '+ 청크 추가'}
                        </PrimaryButton>
                    </div>
                    {!creatingOpen ? (
                        <PageDescription>등록된 공통 RAG 청크가 없습니다. 우측의 + RAG 추가 버튼으로 등록해 주세요.</PageDescription>
                    ) : null}
                </>
            )}

            {creatingOpen ? (
                <ModalBackdrop>
                    <ModalCard style={UNIFIED_MODAL_STYLE}>
                        <ModalTitle>새 공통 {getRagIntentLabel(intentType)} RAG 청크 추가</ModalTitle>
                        <ModalDescription>공통 {getRagIntentLabel(intentType)} 경로에서 재사용할 청크를 등록합니다.</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
                            <FieldLabel>제목</FieldLabel>
                            <input
                                type="text"
                                style={ONE_LINE_INPUT_STYLE}
                                value={newCommonRagDraft.title}
                                onChange={(e) => onNewCommonRagChange('title', e.target.value)}
                            />
                            <FieldHint>제목 기준으로 내부 식별자가 자동 생성됩니다.</FieldHint>

                            <FieldLabel>keywords</FieldLabel>
                            <KeywordListEditor
                                keywords={newCommonRagDraft.keywords}
                                onChange={(next) => onNewCommonRagChange('keywords', next)}
                                hint="동의어/사용자 표현까지 넣어야 조회 정확도가 올라갑니다."
                            />

                            <FieldLabel>body</FieldLabel>
                            <PromptTextarea
                                value={newCommonRagDraft.body}
                                onChange={(e) => onNewCommonRagChange('body', e.target.value)}
                            />

                            <FieldLabel>imageUrl</FieldLabel>
                            <input
                                type="text"
                                style={ONE_LINE_INPUT_STYLE}
                                value={String(newCommonRagDraft.imageUrl ?? '')}
                                onChange={(e) => onNewCommonRagChange('imageUrl', e.target.value)}
                            />
                            <FieldHint>설명 응답에 함께 보여줄 이미지 URL입니다. 비워두면 이미지를 표시하지 않습니다.</FieldHint>

                            <FieldLabel>이미지 노출 정책</FieldLabel>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {IMAGE_ATTACH_MODE_OPTIONS.map((option) => {
                                    const active = normalizeImageAttachMode(newCommonRagDraft.imageAttachMode) === option.key
                                    return (
                                        <button
                                            key={`modal-create-image-mode-${option.key}`}
                                            type="button"
                                            onClick={() => onNewCommonRagChange('imageAttachMode', option.key)}
                                            style={{
                                                height: '32px',
                                                padding: '0 10px',
                                                borderRadius: '999px',
                                                border: active ? '1px solid #2563eb' : '1px solid #dbe3ef',
                                                background: active ? '#eff6ff' : '#ffffff',
                                                color: active ? '#1d4ed8' : '#475569',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    )
                                })}
                            </div>

                            <FieldHint>현재 카드의 intent({getRagIntentLabel(intentType)})로 저장됩니다.</FieldHint>
                        </div>

                        <ModalActions style={{ gap: '10px' }}>
                            <ToggleButton
                                type="button"
                                $active={Boolean(newCommonRagDraft.enabled)}
                                onClick={() => onNewCommonRagChange('enabled', !newCommonRagDraft.enabled)}
                            >
                                {newCommonRagDraft.enabled ? '활성' : '비활성'}
                            </ToggleButton>

                            <SecondaryTextButton type="button" onClick={() => setCreatingOpen(false)}>
                                닫기
                            </SecondaryTextButton>

                            <PrimaryButton type="button" onClick={handleCreateCommonRagSubmit} disabled={savingCreateCommonRag}>
                                {savingCreateCommonRag ? '등록 중...' : '청크 등록'}
                            </PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}
        </SettingCard>
    )
}

const CommonToolManagementCard = ({
    tools,
    actionTypes,
    savingToolKey,
    savingCreateCommonTool,
    deletingToolKey,
    onSaveTool,
    onCreateCommonTool,
    onDeleteTool,
}) => {
    const normalizePath = (value) => String(value ?? '').trim().replace(/^\/+/, '')

    const sortedTools = useMemo(() => {
        return [...tools].sort((left, right) => {
            const leftOrder = Number(left?.sortOrder ?? 0)
            const rightOrder = Number(right?.sortOrder ?? 0)

            if (leftOrder !== rightOrder) return leftOrder - rightOrder
            return String(left?.displayName ?? left?.toolName ?? '').localeCompare(String(right?.displayName ?? right?.toolName ?? ''))
        })
    }, [tools])

    const [activeToolKey, setActiveToolKey] = useState('')
    const [modalMode, setModalMode] = useState('')
    const [modalDraft, setModalDraft] = useState({
        actionTypeKey: '',
        displayName: '',
        path: '',
        enabled: true,
    })
    const [activeActionTypeKey, setActiveActionTypeKey] = useState('')

    const defaultActionTypeKey = String(actionTypes?.[0]?.key ?? '')

    const actionTypeLabelMap = useMemo(() => {
        return new Map((actionTypes ?? []).map((item) => [String(item.key), String(item.label ?? item.key)]))
    }, [actionTypes])

    const resolveActionTypeKey = (tool) => {
        const apiName = String(tool?.apiName ?? '').trim()
        const method = String(tool?.method ?? '').trim().toUpperCase()
        const found = actionTypes.find((item) => {
            const typeApiName = String(item?.apiName ?? '').trim()
            const typeMethod = String(item?.method ?? '').trim().toUpperCase()
            return typeApiName === apiName && typeMethod === method
        })
        return String(found?.key ?? defaultActionTypeKey)
    }

    const groupedToolsByType = useMemo(() => {
        const grouped = new Map()

        sortedTools.forEach((item) => {
            const actionTypeKey = resolveActionTypeKey(item)
            const group = grouped.get(actionTypeKey) ?? []
            group.push(item)
            grouped.set(actionTypeKey, group)
        })

        return grouped
    }, [sortedTools, actionTypes, defaultActionTypeKey])

    const orderedActionTypeGroups = useMemo(() => {
        const groups = []
        const visited = new Set()

        ;(actionTypes ?? []).forEach((item) => {
            const key = String(item.key)
            const toolsByType = groupedToolsByType.get(key) ?? []
            if (toolsByType.length === 0) return

            visited.add(key)
            groups.push({
                key,
                label: String(item.label ?? key),
                items: toolsByType,
            })
        })

        groupedToolsByType.forEach((items, key) => {
            if (visited.has(key) || items.length === 0) return

            groups.push({
                key,
                label: actionTypeLabelMap.get(key) ?? key,
                items,
            })
        })

        return groups
    }, [groupedToolsByType, actionTypes, actionTypeLabelMap])

    const activeTypeTools = useMemo(() => {
        return groupedToolsByType.get(activeActionTypeKey) ?? []
    }, [groupedToolsByType, activeActionTypeKey])

    const routedTools = useMemo(() => {
        return activeTypeTools
            .map((item) => {
                const path = normalizePath(item?.staticPayload?.path ?? item?.endpoint ?? '')
                return {
                    item,
                    path,
                    segments: path.split('/').filter(Boolean),
                }
            })
            .filter((entry) => entry.path)
    }, [activeTypeTools])

    const [activePathSegments, setActivePathSegments] = useState([])

    const routeLevels = useMemo(() => {
        const levels = []

        for (let depth = 0; depth < 12; depth += 1) {
            const prefix = activePathSegments.slice(0, depth)
            const candidates = routedTools.filter((entry) =>
                prefix.every((segment, idx) => entry.segments[idx] === segment)
            )

            const options = Array.from(new Set(
                candidates
                    .map((entry) => entry.segments[depth])
                    .filter(Boolean)
            ))

            if (options.length === 0) break

            levels.push({
                depth,
                options,
            })

            if (!activePathSegments[depth]) break
        }

        return levels
    }, [routedTools, activePathSegments])

    const activePath = activePathSegments.join('/')

    const activeRouteTool = useMemo(() => {
        if (!activePath) return null
        return routedTools.find((entry) => entry.path === activePath)?.item ?? null
    }, [routedTools, activePath])

    const activeTypeLabel = actionTypeLabelMap.get(activeActionTypeKey) ?? activeActionTypeKey

    useEffect(() => {
        if (orderedActionTypeGroups.length === 0) {
            if (activeActionTypeKey) setActiveActionTypeKey('')
            return
        }

        const exists = orderedActionTypeGroups.some((item) => item.key === activeActionTypeKey)
        if (!exists) {
            setActiveActionTypeKey(String(orderedActionTypeGroups[0].key))
        }
    }, [orderedActionTypeGroups, activeActionTypeKey])

    useEffect(() => {
        if (activeTypeTools.length === 0) {
            if (activeToolKey) setActiveToolKey('')
            return
        }

        const exists = activeTypeTools.some((item) => String(item.id) === activeToolKey)
        if (!exists) {
            setActiveToolKey(String(activeTypeTools[0].id))
        }
    }, [activeTypeTools, activeToolKey])

    useEffect(() => {
        if (routedTools.length === 0) {
            setActivePathSegments([])
            return
        }

        const currentPath = activePathSegments.join('/')
        const exists = routedTools.some((entry) => entry.path === currentPath)

        if (!exists) {
            setActivePathSegments([...routedTools[0].segments])
        }
    }, [routedTools])

    useEffect(() => {
        if (!activeRouteTool) return
        setActiveToolKey(String(activeRouteTool.id))
    }, [activeRouteTool])

    const activeTool = activeRouteTool ?? activeTypeTools.find((item) => String(item.id) === activeToolKey) ?? null
    const activeToolName = String(activeTool?.displayName ?? activeTool?.toolName ?? '-')
    const activeToolPath = String(activeTool?.staticPayload?.path ?? activeTool?.endpoint ?? activePath ?? '-')
    const isCreateMode = modalMode === 'create'
    const isEditMode = modalMode === 'edit'

    const openCreateModal = () => {
        setModalDraft({
            actionTypeKey: defaultActionTypeKey,
            displayName: '',
            path: '',
            enabled: true,
        })
        setModalMode('create')
    }

    const openEditModal = () => {
        if (!activeTool) return

        setModalDraft({
            actionTypeKey: resolveActionTypeKey(activeTool),
            displayName: String(activeTool.displayName ?? activeTool.toolName ?? ''),
            path: String(activeTool?.staticPayload?.path ?? activeTool?.endpoint ?? ''),
            enabled: activeTool.enabled !== false,
        })
        setModalMode('edit')
    }

    const closeModal = () => setModalMode('')

    const handleModalChange = (field, nextValue) => {
        setModalDraft((prev) => ({
            ...prev,
            [field]: nextValue,
        }))
    }

    const handleSubmitModal = async () => {
        if (isCreateMode) {
            await onCreateCommonTool(modalDraft)
            return
        }

        if (isEditMode && activeTool) {
            await onSaveTool(activeTool, modalDraft)
        }
    }

    return (
        <SettingCard>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>공통 액션</CardTitle>
                    <SmallBadge>{tools.length}개</SmallBadge>
                </CardHeader>

                <PrimaryButton
                    type="button"
                    onClick={openCreateModal}
                    disabled={savingCreateCommonTool}
                    style={{ height: '36px' }}
                >
                    {savingCreateCommonTool ? '추가 중...' : '+ 공통 액션 추가'}
                </PrimaryButton>
            </SectionTitleRow>

            {sortedTools.length > 0 ? (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gap: '10px',
                        }}
                    >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {orderedActionTypeGroups.map((group) => {
                                const selected = group.key === activeActionTypeKey

                                return (
                                    <button
                                        key={group.key}
                                        type="button"
                                        onClick={() => setActiveActionTypeKey(group.key)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            height: '34px',
                                            padding: '0 12px',
                                            borderRadius: '999px',
                                            border: selected ? '1px solid #2563eb' : '1px solid #dbe3ef',
                                            background: selected ? '#eff6ff' : '#fff',
                                            color: selected ? '#1d4ed8' : '#334155',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                        }}
                                    >
                                        <span>{group.label}</span>
                                        <span
                                            style={{
                                                minWidth: '18px',
                                                height: '18px',
                                                borderRadius: '999px',
                                                background: selected ? '#2563eb' : '#e2e8f0',
                                                color: selected ? '#fff' : '#334155',
                                                fontSize: '11px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 5px',
                                            }}
                                        >
                                            {group.items.length}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 360px)',
                                gap: '12px',
                                alignItems: 'start',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '10px',
                                    overflowX: 'auto',
                                    paddingBottom: '4px',
                                }}
                            >
                                {routeLevels.map((level) => (
                                    <div
                                        key={`route-level-${level.depth}`}
                                        style={{
                                            minWidth: '220px',
                                            border: '1px solid #dbe3ef',
                                            borderRadius: '12px',
                                            padding: '10px',
                                            display: 'grid',
                                            gap: '8px',
                                            background: '#fff',
                                        }}
                                    >
                                        <strong style={{ fontSize: '12px', color: '#64748b' }}>
                                            경로 레벨 {level.depth + 1}
                                        </strong>

                                        {level.options.map((segment) => {
                                            const selected = activePathSegments[level.depth] === segment
                                            const isParam = segment.startsWith(':')

                                            return (
                                                <button
                                                    key={`${level.depth}-${segment}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setActivePathSegments((prev) => {
                                                            const next = [...prev.slice(0, level.depth), segment]
                                                            return next
                                                        })
                                                    }}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '9px 10px',
                                                        borderRadius: '10px',
                                                        border: selected ? '1px solid #2563eb' : '1px solid #dbe3ef',
                                                        background: selected ? '#eff6ff' : '#ffffff',
                                                        color: selected ? '#1d4ed8' : '#334155',
                                                        cursor: 'pointer',
                                                        display: 'grid',
                                                        gap: '2px',
                                                    }}
                                                >
                                                    <strong style={{ fontSize: '13px' }}>{segment}</strong>
                                                    {isParam ? (
                                                        <span style={{ fontSize: '11px', color: '#7c3aed' }}>
                                                            파라미터 입력 필요
                                                        </span>
                                                    ) : null}
                                                </button>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>

                            {activeTool ? (
                                <PromptCard style={{ margin: 0 }}>
                                    <PromptMeta>
                                        <span>{activeToolName}</span>
                                        <span>유형: {activeTypeLabel}</span>
                                        <span>updated: {formatDateTime(activeTool.updatedAt)}</span>
                                    </PromptMeta>

                                    <FieldLabel>화면 이름</FieldLabel>
                                    <PageDescription>{activeToolName}</PageDescription>

                                    <FieldLabel>경로</FieldLabel>
                                    <PageDescription>{activeToolPath}</PageDescription>

                                    <PromptFooter>
                                        <ToggleButton type="button" $active={activeTool.enabled !== false}>
                                            {activeTool.enabled !== false ? '활성' : '비활성'}
                                        </ToggleButton>

                                        <SecondaryTextButton
                                            type="button"
                                            onClick={() => onDeleteTool(activeTool)}
                                            disabled={deletingToolKey === String(activeTool.id)}
                                        >
                                            {deletingToolKey === String(activeTool.id) ? '삭제 중...' : '삭제'}
                                        </SecondaryTextButton>

                                        <PrimaryButton
                                            type="button"
                                            onClick={openEditModal}
                                            disabled={savingToolKey === String(activeTool.id)}
                                        >
                                            수정
                                        </PrimaryButton>
                                    </PromptFooter>
                                </PromptCard>
                            ) : (
                                <PromptCard style={{ margin: 0 }}>
                                    <PageDescription>좌측 경로에서 액션을 선택하면 상세 설정이 표시됩니다.</PageDescription>
                                </PromptCard>
                            )}
                        </div>

                    </div>
                </>
            ) : (
                <PageDescription>등록된 공통 액션이 없습니다. 우측의 + 공통 액션 추가 버튼으로 등록해 주세요.</PageDescription>
            )}

            {(isCreateMode || isEditMode) ? (
                <ModalBackdrop>
                    <ModalCard style={UNIFIED_MODAL_STYLE}>
                        <ModalTitle>{isCreateMode ? '공통 액션 추가' : '공통 액션 수정'}</ModalTitle>
                        <ModalDescription>기본 정보는 목록에 간단히 표시하고, 상세 입력은 팝업에서 관리합니다.</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                            <FieldLabel>액션 유형</FieldLabel>
                            <select
                                value={modalDraft.actionTypeKey}
                                onChange={(e) => handleModalChange('actionTypeKey', e.target.value)}
                                disabled={isEditMode}
                                style={{
                                    width: '100%',
                                    height: '42px',
                                    border: '1px solid #dbe3ef',
                                    borderRadius: '10px',
                                    padding: '0 10px',
                                    fontSize: '13px',
                                    color: '#334155',
                                    background: isEditMode ? '#f8fafc' : '#fff',
                                }}
                            >
                                {actionTypes.map((item) => (
                                    <option key={item.key} value={item.key}>{item.label}</option>
                                ))}
                            </select>

                            <FieldLabel>화면 이름</FieldLabel>
                            <PromptTextarea
                                style={{ minHeight: '20px', lineHeight: 1 }}
                                value={modalDraft.displayName}
                                onChange={(e) => handleModalChange('displayName', e.target.value)}
                                
                            />

                            <FieldLabel>경로 (path)</FieldLabel>
                            <PromptTextarea
                                style={{ minHeight: '20px', lineHeight: 1 }}
                                value={modalDraft.path}
                                onChange={(e) => handleModalChange('path', e.target.value)}
                                
                            />
                            <FieldHint>예: robot/ailog/ai-chat-settings</FieldHint>

                            <PromptFooter>
                                <ToggleButton
                                    type="button"
                                    $active={Boolean(modalDraft.enabled)}
                                    onClick={() => handleModalChange('enabled', !modalDraft.enabled)}
                                >
                                    {modalDraft.enabled ? '활성' : '비활성'}
                                </ToggleButton>
                            </PromptFooter>
                        </div>

                        <ModalActions style={{ gap: '10px' }}>
                            <SecondaryTextButton type="button" onClick={closeModal}>취소</SecondaryTextButton>
                            <PrimaryButton
                                type="button"
                                onClick={handleSubmitModal}
                                disabled={savingCreateCommonTool || (isEditMode && activeTool ? savingToolKey === String(activeTool.id) : false)}
                            >
                                {isCreateMode ? (savingCreateCommonTool ? '추가 중...' : '추가') : (activeTool && savingToolKey === String(activeTool.id) ? '저장 중...' : '저장')}
                            </PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}
        </SettingCard>
    )
}