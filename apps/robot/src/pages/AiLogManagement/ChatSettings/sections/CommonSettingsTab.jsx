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

const BodyLengthMeter = ({ value, maxChars = 700 }) => {
    const text = typeof value === 'string' ? value : ''
    const length = text.length
    const limit = Number(maxChars ?? 700)
    const isOverLimit = length > limit

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>본문 길이</span>
            <strong style={{ fontSize: '12px', color: isOverLimit ? '#dc2626' : '#334155' }}>
                현재 {length} / 제한 {limit}자
            </strong>
        </div>
    )
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
    draftFinalFallbackText,
    setDraftFinalFallbackText,
    savingFinalFallbackText,
    onSaveFinalFallbackText,
    draftRagContextTopK,
    setDraftRagContextTopK,
    draftRagContextMaxCharsPerChunk,
    setDraftRagContextMaxCharsPerChunk,
    savingRagContextLimits,
    onSaveRagContextLimits,
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
            <FinalFallbackTextCard
                value={draftFinalFallbackText}
                onChange={setDraftFinalFallbackText}
                saving={savingFinalFallbackText}
                onSave={onSaveFinalFallbackText}
            />
            <RagContextLimitCard
                topK={draftRagContextTopK}
                setTopK={setDraftRagContextTopK}
                maxCharsPerChunk={draftRagContextMaxCharsPerChunk}
                setMaxCharsPerChunk={setDraftRagContextMaxCharsPerChunk}
                saving={savingRagContextLimits}
                onSave={onSaveRagContextLimits}
            />
        </ManagementGrid>
    )
}

const RagContextLimitCard = ({ topK, setTopK, maxCharsPerChunk, setMaxCharsPerChunk, saving, onSave }) => {
    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>RAG 본문 제한</CardTitle>
            </CardHeader>

            <PageDescription>
                LLM에 넣는 RAG 문맥을 너무 길게 가지 않도록 청크 수와 각 청크 본문 길이를 제한합니다. 본문 전체를 길게 넣기보다 필요한 근거만 보냅니다.
            </PageDescription>

            <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <FieldLabel>LLM 전달 청크 수</FieldLabel>
                        <PromptTextarea
                            value={topK}
                            onChange={(e) => setTopK(e.target.value)}
                            placeholder="3"
                            style={{ minHeight: '42px', resize: 'vertical' }}
                            type="number"
                            min={1}
                        />
                    </div>
                    <div>
                        <FieldLabel>청크별 최대 본문 길이(자)</FieldLabel>
                        <PromptTextarea
                            value={maxCharsPerChunk}
                            onChange={(e) => setMaxCharsPerChunk(e.target.value)}
                            placeholder="700"
                            style={{ minHeight: '42px', resize: 'vertical' }}
                            type="number"
                            min={100}
                        />
                    </div>
                </div>
            </div>

            <ActionRow>
                <PrimaryButton type="button" onClick={onSave} disabled={saving}>
                    {saving ? '저장 중...' : '저장'}
                </PrimaryButton>
            </ActionRow>
        </SettingCard>
    )
}

const FinalFallbackTextCard = ({ value, onChange, saving, onSave }) => {
    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>최종 Fallback 텍스트</CardTitle>
            </CardHeader>

            <PageDescription>rule 및 RAG 매칭 결과가 없을 때 기본 LLM 대신 표시할 응답입니다. 비워두면 기존 동작을 유지합니다.</PageDescription>

            <PromptTextarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="매칭되는 정보를 찾지 못했을 때 표시할 문구"
                style={{ minHeight: '120px' }}
            />

            <ActionRow>
                <PrimaryButton type="button" onClick={onSave} disabled={saving}>
                    {saving ? '저장 중...' : '저장'}
                </PrimaryButton>
            </ActionRow>
        </SettingCard>
    )
}

const CommonInputHintPromptManagementCard = ({
    commonInputHintPromptItem,
    commonInputHintPromptDraft,
    savingCommonInputHintPrompt,
    onCommonInputHintPromptChange,
    onSaveCommonInputHintPrompt,
}) => {
    const [newItem, setNewItem] = useState('')
    const [editingIndex, setEditingIndex] = useState(-1)
    const [editingValue, setEditingValue] = useState('')
    const examples = Array.isArray(commonInputHintPromptDraft?.examples) ? commonInputHintPromptDraft.examples : []
    const hasPrompt = Boolean(commonInputHintPromptItem?.id)

    const commitExamples = (nextExamples) => {
        onCommonInputHintPromptChange('examples', nextExamples)
    }

    const addExample = () => {
        const value = String(newItem ?? '').trim()
        if (!value) return
        commitExamples(Array.from(new Set([...examples, value])))
        setNewItem('')
    }

    const startEdit = (index) => {
        setEditingIndex(index)
        setEditingValue(String(examples[index] ?? ''))
    }

    const saveEdit = () => {
        const value = String(editingValue ?? '').trim()
        if (editingIndex < 0) return
        const next = [...examples]
        if (!value) {
            next.splice(editingIndex, 1)
        } else {
            next[editingIndex] = value
        }
        commitExamples(Array.from(new Set(next.filter(Boolean))))
        setEditingIndex(-1)
        setEditingValue('')
    }

    const deleteExample = (index) => {
        commitExamples(examples.filter((_, idx) => idx !== index))
        if (editingIndex === index) {
            setEditingIndex(-1)
            setEditingValue('')
        }
    }

    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>공통 입력 힌트</CardTitle>
            </CardHeader>

            <PageDescription>
                app_key=common, screen_key=common 인 guidance.examples 배열을 그대로 사용합니다. 여기서 추가/수정/삭제한 값이 실제 화면 hint fallback에 반영됩니다.
            </PageDescription>

            <PromptCard>
                <PromptMeta>
                    <span>{commonInputHintPromptItem?.label || commonInputHintPromptDraft.label || '공통 입력 힌트'}</span>
                    <span>key: common</span>
                    <span>type: guidance.examples</span>
                    {hasPrompt ? <span>updated: {formatDateTime(commonInputHintPromptItem?.updatedAt)}</span> : null}
                </PromptMeta>

                <FieldLabel>예시 문구 목록</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {examples.length > 0 ? (
                        examples.map((example, index) => (
                            <button
                                key={`hint-example-${index}`}
                                type="button"
                                onClick={() => startEdit(index)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '999px',
                                    border: '1px solid #dbe3ef',
                                    background: '#ffffff',
                                    cursor: 'pointer',
                                }}
                            >
                                <span>{example}</span>
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteExample(index)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            deleteExample(index)
                                        }
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '999px',
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                    }}
                                    aria-label={`${example} 삭제`}
                                >
                                    ×
                                </span>
                            </button>
                        ))
                    ) : (
                        <div style={{ color: '#64748b', fontSize: '12px' }}>등록된 입력 힌트가 없습니다.</div>
                    )}
                </div>

                {editingIndex >= 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginBottom: '10px' }}>
                        <input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    saveEdit()
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault()
                                    setEditingIndex(-1)
                                    setEditingValue('')
                                }
                            }}
                            style={{ width: '100%', border: '1px solid #dbe3ef', borderRadius: '10px', padding: '8px 10px', fontSize: '13px' }}
                        />
                        <PrimaryButton type="button" onClick={saveEdit} style={{ height: '36px' }}>
                            저장
                        </PrimaryButton>
                        <SecondaryTextButton type="button" onClick={() => { setEditingIndex(-1); setEditingValue('') }}>
                            취소
                        </SecondaryTextButton>
                    </div>
                ) : null}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
                    <input
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                addExample()
                            }
                        }}
                        placeholder="새 입력 힌트 추가"
                        style={{ width: '100%', border: '1px solid #dbe3ef', borderRadius: '10px', padding: '8px 10px', fontSize: '13px' }}
                    />
                    <PrimaryButton type="button" onClick={addExample} style={{ height: '36px' }}>
                        추가
                    </PrimaryButton>
                </div>

                <FieldHint>예시 값들은 공통 입력 힌트 fallback으로 사용되며, 화면별 입력 힌트가 없을 때 랜덤으로 노출됩니다.</FieldHint>

                <PromptFooter>
                    <SecondaryTextButton
                        type="button"
                        onClick={() => {
                            const sourceExamples = Array.isArray(commonInputHintPromptItem?.examples)
                                ? commonInputHintPromptItem.examples
                                : []
                            onCommonInputHintPromptChange('examples', sourceExamples)
                        }}
                    >
                        원본 복원
                    </SecondaryTextButton>

                    <PrimaryButton type="button" onClick={onSaveCommonInputHintPrompt} disabled={savingCommonInputHintPrompt}>
                        {savingCommonInputHintPrompt ? '저장 중...' : '저장'}
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

const DefaultIntentPromptManagementCard = ({
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
                <CardTitle>기본 분류 LLM 프롬프트</CardTitle>
            </CardHeader>

            <PageDescription>상세 화면에 별도 분류 프롬프트가 없을 때 사용하는 공통 기본값입니다. info 분기 기준을 정의합니다.</PageDescription>

            <PromptCard>
                <PromptMeta>
                    <span>{commonIntentPromptItem?.label || commonIntentPromptDraft.label || '기본 분류 LLM 프롬프트'}</span>
                    <span>key: common</span>
                    <span>type: intent-classifier</span>
                    {hasPrompt ? <span>updated: {formatDateTime(commonIntentPromptItem?.updatedAt)}</span> : null}
                </PromptMeta>

                <PromptTextarea
                    value={commonIntentPromptDraft.content}
                    onChange={(e) => onCommonIntentPromptChange('content', e.target.value)}
                    style={{ minHeight: '180px' }}
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
                                onCommonIntentPromptChange('content', String(commonIntentPromptItem?.content ?? commonIntentPromptItem?.prompt ?? ''))
                                onCommonIntentPromptChange('label', String(commonIntentPromptItem?.label ?? '기본 분류 LLM 프롬프트'))
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

const CommonRagPromptManagementCard = ({
    commonRagPromptItem,
    commonRagPromptDraft,
    savingCommonRagPrompt,
    onCommonRagPromptChange,
    onSaveCommonRagPrompt,
}) => {
    const hasPrompt = Boolean(commonRagPromptItem?.id)

    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>공통 RAG 프롬프트</CardTitle>
            </CardHeader>

            <PageDescription>info와 action RAG 문서를 LLM에 전달할 때 공통으로 적용하는 지침입니다.</PageDescription>

            <PromptCard>
                <PromptMeta>
                    <span>{commonRagPromptItem?.label || commonRagPromptDraft.label || '공통 RAG 프롬프트'}</span>
                    <span>key: common</span>
                    <span>type: rag</span>
                    {hasPrompt ? <span>updated: {formatDateTime(commonRagPromptItem?.updatedAt)}</span> : null}
                </PromptMeta>

                <PromptTextarea
                    value={commonRagPromptDraft.content}
                    onChange={(e) => onCommonRagPromptChange('content', e.target.value)}
                    placeholder="공통 RAG 지침을 입력하세요."
                    style={{ minHeight: '180px' }}
                />

                <PromptCard style={{ marginTop: '12px', background: '#f8fafc' }}>
                    <PromptMeta>
                        <span>공통 RAG 결과 리턴 포맷</span>
                        <span>read only</span>
                    </PromptMeta>

                    <PageDescription>
                        여러 RAG 문서를 함께 참조해도 최종 응답은 단일 text JSON으로 요약해 반환합니다. score, app 구분, 마크다운은 표시하지 않습니다.
                    </PageDescription>

                    <PromptTextarea
                        value={RAG_RETURN_FORMAT_JSON}
                        readOnly
                        style={{ minHeight: '140px', background: '#f8fafc', color: '#334155' }}
                    />
                </PromptCard>

                <PromptFooter>
                    <ToggleButton
                        type="button"
                        $active={Boolean(commonRagPromptDraft.enabled)}
                        onClick={() => onCommonRagPromptChange('enabled', !commonRagPromptDraft.enabled)}
                    >
                        {commonRagPromptDraft.enabled ? '활성' : '비활성'}
                    </ToggleButton>

                    {hasPrompt ? (
                        <SecondaryTextButton
                            type="button"
                            onClick={() => {
                                onCommonRagPromptChange('content', String(commonRagPromptItem?.content ?? commonRagPromptItem?.prompt ?? ''))
                                onCommonRagPromptChange('enabled', commonRagPromptItem?.enabled !== false)
                            }}
                        >
                            원본 복원
                        </SecondaryTextButton>
                    ) : null}

                    <PrimaryButton type="button" onClick={onSaveCommonRagPrompt} disabled={savingCommonRagPrompt}>
                        {savingCommonRagPrompt ? '저장 중...' : hasPrompt ? '저장' : '등록'}
                    </PrimaryButton>
                </PromptFooter>
            </PromptCard>
        </SettingCard>
    )
}

const CLASSIFICATION_RETURN_FORMAT_JSON = `{
  "intent": "info",
  "confidence": 0.92,
  "reason": "설명/가이드 질문으로 판단"
}`

const RAG_RETURN_FORMAT_JSON = `{
  "text": "운영 관제는 로봇 관리, SOTA, CMS, TMS, 학습 기능 등을 제공해요"
}`

const PromptManagementCard = ({
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
}) => {
    const hasPrompt = Boolean(commonPromptItem?.id)
    const hasIntentPrompt = Boolean(commonIntentPromptItem?.id)
    const effectiveLabel = commonPromptItem?.label || commonPromptDraft.label || '공통 / 분류 LLM 프롬프트'

    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>공통 / 분류 LLM 프롬프트</CardTitle>
            </CardHeader>

            <PageDescription>기본값으로 쓰는 공통 프롬프트입니다. 분류 판단 로직과 기본 응답 규칙을 같은 문맥에서 관리합니다.</PageDescription>

            <PromptCard>
                <PromptMeta>
                    <span>{effectiveLabel}</span>
                    <span>key: common</span>
                    <span>type: instruction + intent-classifier</span>
                    {hasPrompt || hasIntentPrompt ? <span>updated: {formatDateTime(commonPromptItem?.updatedAt ?? commonIntentPromptItem?.updatedAt)}</span> : null}
                </PromptMeta>

                <PromptTextarea
                    value={commonPromptDraft.content || commonIntentPromptDraft.content}
                    onChange={(e) => {
                        onCommonPromptChange('content', e.target.value)
                        onCommonIntentPromptChange('content', e.target.value)
                    }}
                    style={{ minHeight: '210px' }}
                />

                <PromptCard style={{ marginTop: '12px', background: '#f8fafc' }}>
                    <PromptMeta>
                        <span>분류 결과 리턴 포맷</span>
                        <span>read only</span>
                    </PromptMeta>

                    <PageDescription>
                        LLM은 아래 JSON 형식만 반환하도록 고정하며, 설명 문구와 마크다운은 허용하지 않습니다.
                    </PageDescription>

                    <PromptTextarea
                        value={CLASSIFICATION_RETURN_FORMAT_JSON}
                        readOnly
                        style={{ minHeight: '140px', background: '#f8fafc', color: '#334155' }}
                    />
                </PromptCard>

                <PromptFooter>
                    <ToggleButton
                        type="button"
                        $active={Boolean(commonPromptDraft.enabled) && Boolean(commonIntentPromptDraft.enabled)}
                        onClick={() => {
                            const nextValue = !(Boolean(commonPromptDraft.enabled) && Boolean(commonIntentPromptDraft.enabled))
                            onCommonPromptChange('enabled', nextValue)
                            onCommonIntentPromptChange('enabled', nextValue)
                        }}
                    >
                        {Boolean(commonPromptDraft.enabled) && Boolean(commonIntentPromptDraft.enabled) ? '활성' : '비활성'}
                    </ToggleButton>

                    {hasPrompt || hasIntentPrompt ? (
                        <SecondaryTextButton
                            type="button"
                            onClick={() => {
                                const restoredPrompt = String(commonPromptItem?.content ?? commonPromptItem?.prompt ?? commonIntentPromptItem?.content ?? commonIntentPromptItem?.prompt ?? '')
                                const restoredLabel = String(commonPromptItem?.label ?? commonIntentPromptItem?.label ?? '공통 / 분류 LLM 프롬프트')
                                onCommonPromptChange('content', restoredPrompt)
                                onCommonIntentPromptChange('content', restoredPrompt)
                                onCommonPromptChange('label', restoredLabel)
                                onCommonIntentPromptChange('label', restoredLabel)
                                onCommonPromptChange('enabled', commonPromptItem?.enabled !== false)
                                onCommonIntentPromptChange('enabled', commonIntentPromptItem?.enabled !== false)
                            }}
                        >
                            원본 복원
                        </SecondaryTextButton>
                    ) : null}

                    <PrimaryButton
                        type="button"
                        onClick={() => {
                            onSaveCommonPrompt()
                            onSaveCommonIntentPrompt()
                        }}
                        disabled={savingCommonPrompt || savingCommonIntentPrompt}
                    >
                        {savingCommonPrompt || savingCommonIntentPrompt ? '저장 중...' : '저장'}
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
                            <BodyLengthMeter value={activeRagDraft.body} maxChars={Number(values?.ragContextMaxCharsPerChunk ?? 700)} />
                            {String(activeRagDraft.body ?? '').length > Number(values?.ragContextMaxCharsPerChunk ?? 700) ? (
                                <FieldHint style={{ color: '#dc2626' }}>
                                    본문이 설정된 최대 {Number(values?.ragContextMaxCharsPerChunk ?? 700)}자를 초과했습니다. 저장할 수 없습니다.
                                </FieldHint>
                            ) : (
                                <FieldHint>한 청크는 한 주제만 다루는 것이 좋습니다(목차/단락 단위).</FieldHint>
                            )}

                            <FieldLabel>imageUrl</FieldLabel>
                            <input
                                type="text"
                                style={ONE_LINE_INPUT_STYLE}
                                value={String(activeRagDraft.imageUrl ?? '')}
                                onChange={(e) => onRagChange(activeRagKey, 'imageUrl', e.target.value)}
                            />
                            <FieldHint>설명 답변에 같이 노출할 이미지 URL입니다. 로컬/사설/퍼블릭 URL 모두 가능합니다.</FieldHint>

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
                                    disabled={savingRagKey === activeRagKey || String(activeRagDraft.body ?? '').length > Number(values?.ragContextMaxCharsPerChunk ?? 700)}
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
                            <BodyLengthMeter value={newCommonRagDraft.body} maxChars={Number(values?.ragContextMaxCharsPerChunk ?? 700)} />
                            {String(newCommonRagDraft.body ?? '').length > Number(values?.ragContextMaxCharsPerChunk ?? 700) ? (
                                <FieldHint style={{ color: '#dc2626' }}>
                                    본문이 설정된 최대 {Number(values?.ragContextMaxCharsPerChunk ?? 700)}자를 초과했습니다. 추가할 수 없습니다.
                                </FieldHint>
                            ) : null}

                            <FieldLabel>imageUrl</FieldLabel>
                            <input
                                type="text"
                                style={ONE_LINE_INPUT_STYLE}
                                value={String(newCommonRagDraft.imageUrl ?? '')}
                                onChange={(e) => onNewCommonRagChange('imageUrl', e.target.value)}
                            />
                            <FieldHint>설명 응답에 함께 보여줄 이미지 URL입니다. 비워두면 이미지를 표시하지 않습니다.</FieldHint>

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

                            <PrimaryButton
                                type="button"
                                onClick={handleCreateCommonRagSubmit}
                                disabled={savingCreateCommonRag || String(newCommonRagDraft.body ?? '').length > Number(values?.ragContextMaxCharsPerChunk ?? 700)}
                            >
                                {savingCreateCommonRag ? '등록 중...' : '청크 등록'}
                            </PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}
        </SettingCard>
    )
}
