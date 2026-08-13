import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

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
import { TaskflowRuleEditorSection } from './TaskflowRuleEditorSection'
import { EventRuleDbEditorSection } from './EventRuleDbEditorSection'
import { isTaskflowCanvasRoute } from '../taskflowRuleConfigs'

const LARGE_MODAL_STYLE = {
    width: 'min(760px, 100%)',
    height: 'auto',
    minHeight: '0',
    maxHeight: '72vh',
    overflowY: 'auto',
}

const ACTION_CREATE_MODAL_STYLE = LARGE_MODAL_STYLE

const ACTION_DETAIL_MODAL_STYLE = LARGE_MODAL_STYLE

const MODAL_BUTTON_STYLE = {
    height: '36px',
    minWidth: '96px',
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

const PROMPT_FLOW_MODAL_STYLE = LARGE_MODAL_STYLE

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

const normalizeKeywordArray = (value) => {
    const rows = Array.isArray(value) ? value : []
    const normalized = rows
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
    return Array.from(new Set(normalized))
}

const RAG_INTENT_OPTIONS = [
    { key: 'info', label: '정보 인텐트용' },
    { key: 'action', label: '액션 인텐트용' },
]

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

const getRagIntentLabel = (value) => {
    const intentType = normalizeRagIntentType(value)
    if (intentType === 'info') return '정보 인텐트'
    if (intentType === 'action') return '액션 인텐트'
    return '공용(정보/액션)'
}

const normalizeToolKind = (value) => {
    const kind = String(value ?? '').trim().toLowerCase()
    if (kind === 'data') return 'data'
    if (kind === 'action') return 'action'
    return 'action'
}

const normalizeCommonRagKey = (value) => {
    const key = String(value ?? '').trim().toLowerCase()
    if (key === 'common_info' || key === 'common-info') return 'common_info'
    if (key === 'common_action' || key === 'common-action') return 'common_action'
    if (key === 'common') return 'common'
    return ''
}

const resolveCommonRagScopeKey = (item) => {
    const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
    const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? '').trim().toLowerCase()

    if (appKey === 'common') {
        if (screenKey === 'common' || screenKey === 'common_info' || screenKey === 'common_action') return screenKey || 'common'
        return 'common'
    }

    const candidates = [
        item?.key,
        item?.routeKey,
        item?.routeParentKey,
        item?.screenKey,
    ]
    for (const candidate of candidates) {
        const normalized = normalizeCommonRagKey(candidate)
        if (normalized) return normalized
    }
    return ''
}

const isCommonRagDoc = (item) => {
    const key = resolveCommonRagScopeKey(item)
    return key === 'common' || key === 'common_info' || key === 'common_action'
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
                    <TextInput
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

            <InlineFields>
                <TextInput
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
                />
                <PrimaryButton type="button" onClick={addKeyword} style={{ height: '36px' }}>
                    추가
                </PrimaryButton>
            </InlineFields>

            {hint ? <FieldHint>{hint}</FieldHint> : null}
        </div>
    )
}

export const AppScreenSettingsTab = ({
    activeRouteKey,
    values,
    settingDrafts,
    savingSettingScope,
    screenGroups,
    commonRagDocs,
    commonTools,
    commonPromptItem,
    commonPromptDraft,
    commonIntentPromptItem,
    commonIntentPromptDraft,
    commonInputHintPromptItem,
    commonInputHintPromptDraft,
    allPrompts,
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
    onSettingDraftChange,
    onSaveSettingGroup,
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
    onGoToCommonTab,
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
                        values={values}
                        settingDrafts={settingDrafts}
                        savingSettingScope={savingSettingScope}
                        commonRagDocs={commonRagDocs}
                        commonTools={commonTools}
                        onGoToCommonTab={onGoToCommonTab}
                        commonPromptItem={commonPromptItem}
                        commonPromptDraft={commonPromptDraft}
                        commonIntentPromptItem={commonIntentPromptItem}
                        commonIntentPromptDraft={commonIntentPromptDraft}
                        commonInputHintPromptItem={commonInputHintPromptItem}
                        commonInputHintPromptDraft={commonInputHintPromptDraft}
                        allPrompts={allPrompts}
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
                        onSettingDraftChange={onSettingDraftChange}
                        onSaveSettingGroup={onSaveSettingGroup}
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
    values,
    settingDrafts,
    savingSettingScope,
    commonRagDocs,
    commonTools,
    onGoToCommonTab,
    commonPromptItem,
    commonPromptDraft,
    commonIntentPromptItem,
    commonIntentPromptDraft,
    commonInputHintPromptItem,
    commonInputHintPromptDraft,
    allPrompts,
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
    onSettingDraftChange,
    onSaveSettingGroup,
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
    const [activeStage, setActiveStage] = useState('')
    const actionToolCount = group.tools.length
    const promptSummary = group.prompts.reduce(
        (acc, item) => {
            const promptType = String(item?.promptType ?? item?.category ?? '').toLowerCase()
            if (promptType === 'intent-hint') acc.intent += 1
            else if (promptType === 'input-hint') acc.hint += 1
            else if (promptType === 'data-system') acc.data += 1
            else if (promptType === 'action-system') acc.action += 1
            else acc.other += 1
            return acc
        },
        { intent: 0, hint: 0, data: 0, action: 0, other: 0 }
    )
    const ragSummary = group.ragDocs.reduce(
        (acc, item) => {
            const intentType = normalizeRagIntentType(item?.intentType)
            if (intentType === 'info') acc.info += 1
            else if (intentType === 'action') acc.action += 1
            else acc.both += 1
            return acc
        },
        { info: 0, action: 0, both: 0 }
    )
    const commonRagSummary = (Array.isArray(commonRagDocs) ? commonRagDocs : []).reduce(
        (acc, item) => {
            const intentType = normalizeRagIntentType(item?.intentType)
            if (intentType === 'info') acc.info += 1
            else if (intentType === 'action') acc.action += 1
            else acc.both += 1
            return acc
        },
        { info: 0, action: 0, both: 0 }
    )
    const commonInfoRagDocs = (Array.isArray(commonRagDocs) ? commonRagDocs : []).filter((item) => {
        const key = resolveCommonRagScopeKey(item)
        if (key === 'common_info') return true
        if (key === 'common_action') return false
        const intentType = normalizeRagIntentType(item?.intentType)
        return intentType === 'info' || intentType === 'both'
    })
    const commonActionRagDocs = (Array.isArray(commonRagDocs) ? commonRagDocs : []).filter((item) => {
        const key = resolveCommonRagScopeKey(item)
        if (key === 'common_action') return true
        if (key === 'common_info') return false
        const intentType = normalizeRagIntentType(item?.intentType)
        return intentType === 'action' || intentType === 'both'
    })
    const commonActionToolCount = Array.isArray(commonTools) ? commonTools.length : 0

    return (
        <SettingCard>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <SmallBadge>
                        추천 {group.guidance.length}개 · RAG 정보 {ragSummary.info + ragSummary.both}개 · RAG 액션 {ragSummary.action + ragSummary.both}개 · 액션 툴 {actionToolCount}개
                    </SmallBadge>
                </CardHeader>
            </SectionTitleRow>

            <PageDescription>routeKey: {group.routeKey}</PageDescription>

            {isTaskflowCanvasRoute(group.routeKey) ? (
                <TaskflowRuleEditorSection
                    scope={String(group.routeKey ?? '').trim()}
                    scopeLabel="화면별"
                    values={values}
                    settingDrafts={settingDrafts}
                    savingSettingScope={savingSettingScope}
                    onSettingDraftChange={onSettingDraftChange}
                    onSaveSettingGroup={onSaveSettingGroup}
                />
            ) : null}

            <EventRuleDbEditorSection
                scopeKey={String(group.routeKey ?? '').trim() || 'common'}
                title="Front Rule Engine (화면별)"
                description="이 화면의 모든 메시지를 앞단 룰로 분기합니다. info는 chunk 키로 답변하고, action은 tool을 직접 실행합니다."
                values={values}
                settingDrafts={settingDrafts}
                savingSettingScope={savingSettingScope}
                onSettingDraftChange={onSettingDraftChange}
                onSaveSettingGroup={onSaveSettingGroup}
            />

            <ChatFlowMap
                intentPromptCount={promptSummary.intent}
                inputHintCount={promptSummary.hint}
                actionPromptCount={promptSummary.action}
                guidanceCount={group.guidance.length}
                routeKey={group.routeKey}
                infoRagCount={ragSummary.info + ragSummary.both}
                actionRagCount={ragSummary.action + ragSummary.both}
                commonInfoRagCount={commonRagSummary.info + commonRagSummary.both}
                commonActionRagCount={commonRagSummary.action + commonRagSummary.both}
                actionToolCount={actionToolCount}
                commonActionToolCount={commonActionToolCount}
                isFrontRuleEnabled
                onSelectStage={setActiveStage}
            />

            <PageDescription>
                클릭 가능한 단계 카드를 누르면 해당 설정이 팝업에서 열립니다.
            </PageDescription>

            {activeStage ? (
                <ModalBackdrop>
                    <ModalCard style={['intent-prompt', 'action-prompt', 'info-prompt'].includes(activeStage) ? PROMPT_FLOW_MODAL_STYLE : LARGE_MODAL_STYLE}>
                        <ModalTitle>{getStageTitle(activeStage)}</ModalTitle>
                        <ModalDescription>{getStageDescription(activeStage)}</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
                            {activeStage === 'guidance' ? (
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
                            ) : null}

                            {activeStage === 'hint' ? (
                                <ScreenPromptSection
                                    appKey={String(group.routeKey ?? '').split('/')[0] || ''}
                                    routeKey={group.routeKey}
                                    routeParentKey={group.routeParentKey}
                                    prompts={group.prompts}
                                    allPrompts={allPrompts}
                                    commonIntentPromptItem={commonIntentPromptItem}
                                    commonIntentPromptDraft={commonIntentPromptDraft}
                                    promptDrafts={promptDrafts}
                                    savingPromptKey={savingPromptKey}
                                    creatingPromptRouteKey={creatingPromptRouteKey}
                                    onPromptChange={onPromptChange}
                                    onSavePrompt={onSavePrompt}
                                    onCreatePrompt={onCreatePrompt}
                                    promptType="input-hint"
                                    title="입력 힌트"
                                    description="AI Assistant 입력창 placeholder입니다. 줄바꿈으로 여러 문구를 입력하면 랜덤으로 노출됩니다. 화면별 힌트가 없으면 공통 입력 힌트를 사용합니다."
                                    createLabel="입력 힌트 추가"
                                    emptyText="등록된 화면 입력 힌트가 없습니다. 공통 입력 힌트가 fallback으로 적용됩니다."
                                    expandedView
                                    singleOnly
                                    commonFallbackHint={Array.isArray(commonInputHintPromptDraft?.examples)
                                        ? commonInputHintPromptDraft.examples.join('\n')
                                        : Array.isArray(commonInputHintPromptItem?.examples)
                                            ? commonInputHintPromptItem.examples.join('\n')
                                            : ''}
                                />
                            ) : null}

                            {activeStage === 'screen-route' ? (
                                <ScreenRouteSummary routeKey={group.routeKey} routeParentKey={group.routeParentKey} />
                            ) : null}

                            {activeStage === 'event-rule-first' ? (
                                <EventRuleDbEditorSection
                                    scopeKey={String(group.routeKey ?? '').trim() || 'common'}
                                    showHeader={false}
                                    description="실행 순서: route 확정 다음에 front-rule이 먼저 동작합니다. 매칭 시 LLM 인텐트 분류 없이 바로 info/action 실행으로 처리합니다."
                                    values={values}
                                    settingDrafts={settingDrafts}
                                    savingSettingScope={savingSettingScope}
                                    onSettingDraftChange={onSettingDraftChange}
                                    onSaveSettingGroup={onSaveSettingGroup}
                                />
                            ) : null}

                            {activeStage === 'intent-prompt' ? (
                                <ScreenPromptSection
                                    appKey={String(group.routeKey ?? '').split('/')[0] || ''}
                                    routeKey={group.routeKey}
                                    routeParentKey={group.routeParentKey}
                                    prompts={group.prompts}
                                    allPrompts={allPrompts}
                                    commonIntentPromptItem={commonIntentPromptItem}
                                    commonIntentPromptDraft={commonIntentPromptDraft}
                                    promptDrafts={promptDrafts}
                                    savingPromptKey={savingPromptKey}
                                    creatingPromptRouteKey={creatingPromptRouteKey}
                                    onPromptChange={onPromptChange}
                                    onSavePrompt={onSavePrompt}
                                    onCreatePrompt={onCreatePrompt}
                                    promptType="intent-hint"
                                    title="인텐트 분기 룰"
                                    description="LLM이 info/action 인텐트를 분기할 때 참고하는 화면 전용 룰입니다."
                                    createLabel="인텐트 분기 룰 추가"
                                    emptyText="등록된 인텐트 분기 룰이 없습니다."
                                    expandedView
                                    allowCreate={false}
                                    singleOnly
                                />
                            ) : null}

                            {['action-prompt', 'info-prompt'].includes(activeStage) ? (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <ActionPromptPreview
                                        flowType={activeStage === 'info-prompt' ? 'info' : 'action'}
                                        commonPromptItem={commonPromptItem}
                                        commonPromptDraft={commonPromptDraft}
                                        prompts={group.prompts}
                                        promptDrafts={promptDrafts}
                                    />

                                    <ActionUnifiedPromptSection
                                        flowType={activeStage === 'info-prompt' ? 'info' : 'action'}
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
                                </div>
                            ) : null}

                            {activeStage === 'action-tool' ? (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <ActionToolPriorityPreview tools={group.tools} />
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
                                </div>
                            ) : null}

                            {activeStage === 'common-action-tool' ? (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <FlowStageNoteCard
                                        title="공통 액션 툴을 확인 중입니다..."
                                        description="공통 액션 툴은 공통 탭에서만 관리하고, 앱 화면에서는 조회만 제공합니다."
                                        details={[
                                            '여기서는 공통 탭에서 등록한 액션 툴만 표시합니다.',
                                            '공통 툴 수정/추가는 공통 탭에서 진행합니다.',
                                        ]}
                                    />

                                    <ScreenToolList
                                        appKey="common"
                                        routeKey="common"
                                        routeParentKey="common"
                                        actionTypes={actionTypes}
                                        tools={Array.isArray(commonTools) ? commonTools : []}
                                        toolDrafts={toolDrafts}
                                        savingCreateTool={false}
                                        savingToolKey={savingToolKey}
                                        onToolChange={onToolChange}
                                        onSaveTool={onSaveTool}
                                        onCreateTool={onCreateTool}
                                        onDeleteTool={onDeleteTool}
                                        readOnly
                                    />
                                </div>
                            ) : null}

                            {activeStage === 'info-rag' ? (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <ScreenRagList
                                        key="info-rag-list"
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
                                        initialIntentType="info"
                                        fixedIntentType="info"
                                    />
                                </div>
                            ) : null}

                            {activeStage === 'info-common-rag' ? (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <ScreenRagList
                                        key="info-common-rag-list"
                                        appKey="common"
                                        routeKey="common_info"
                                        routeParentKey="common_info"
                                        ragDocs={commonInfoRagDocs}
                                        ragDrafts={ragDrafts}
                                        savingRagKey={savingRagKey}
                                        deletingRagKey={deletingRagKey}
                                        savingCreateRag={false}
                                        onRagChange={onRagChange}
                                        onSaveRag={onSaveRag}
                                        onCreateRag={onCreateRag}
                                        onDeleteRag={onDeleteRag}
                                        initialIntentType="info"
                                        fixedIntentType="info"
                                        readOnly
                                    />
                                </div>
                            ) : null}

                            {activeStage === 'info-llm-fallback' ? (
                                <FlowStageNoteCard
                                    title="공통 RAG까지 미충족이라 기본 LLM을 호출합니다..."
                                    description="화면 RAG와 공통 RAG를 모두 조회했는데도 근거가 부족하면 기본 LLM 응답으로 넘어갑니다."
                                    details={[
                                        'RAG 결과가 충분하면 문서 근거 답변을 우선 생성합니다.',
                                        'RAG 결과가 미충족이면 기본 LLM 호출로 자연어 응답을 생성합니다.',
                                        '이 단계는 info 경로 전용이며 action 경로에는 영향을 주지 않습니다.',
                                    ]}
                                />
                            ) : null}

                            {activeStage === 'action-rag' ? (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <ScreenRagList
                                        key="action-rag-list"
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
                                        initialIntentType="action"
                                        fixedIntentType="action"
                                    />
                                </div>
                            ) : null}

                            {activeStage === 'action-common-rag' ? (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <ScreenRagList
                                        key="action-common-rag-list"
                                        appKey="common"
                                        routeKey="common_action"
                                        routeParentKey="common_action"
                                        ragDocs={commonActionRagDocs}
                                        ragDrafts={ragDrafts}
                                        savingRagKey={savingRagKey}
                                        deletingRagKey={deletingRagKey}
                                        savingCreateRag={false}
                                        onRagChange={onRagChange}
                                        onSaveRag={onSaveRag}
                                        onCreateRag={onCreateRag}
                                        onDeleteRag={onDeleteRag}
                                        initialIntentType="action"
                                        fixedIntentType="action"
                                        readOnly
                                    />
                                </div>
                            ) : null}

                        </div>

                        <ModalActions style={{ gap: '10px' }}>
                            {['info-common-rag', 'action-common-rag', 'common-action-tool'].includes(activeStage) && onGoToCommonTab ? (
                                <SecondaryTextButton
                                    type="button"
                                    onClick={() => { setActiveStage(''); onGoToCommonTab() }}
                                    style={MODAL_BUTTON_STYLE}
                                >
                                    공통 탭으로 이동
                                </SecondaryTextButton>
                            ) : null}
                            <PrimaryButton type="button" onClick={() => setActiveStage('')} style={MODAL_BUTTON_STYLE}>
                                닫기
                            </PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}
        </SettingCard>
    )
}

const getStageTitle = (stageKey) => {
    const map = {
        hint: '0) 힌트',
        guidance: '1) 메세지',
        'screen-route': '2) 화면별 분기',
        'event-rule-first': '3) Front Rule Engine',
        'intent-prompt': '4) 인텐트 분기 룰',
        'info-prompt': 'info 인텐트 룰',
        'action-prompt': 'action 인텐트 룰',
        'info-rag': 'info 경로: 화면 정보 RAG',
        'info-common-rag': '공통 정보 RAG',
        'info-llm-fallback': 'info 경로: RAG 미충족시 LLM 호출',
        'action-rag': 'action 경로: 화면 액션 RAG 조회/편집',
        'action-common-rag': '공통 action RAG',
        'action-tool': 'action 경로: 통합 툴 실행',
        'common-action-tool': 'action 경로: 공통 액션 툴 조회',
    }
    return map[stageKey] ?? '설정 상세'
}

const getStageDescription = (stageKey) => {
    const map = {
        hint: '채팅 입력창 placeholder를 관리합니다. 화면별 힌트가 없으면 공통 입력 힌트를 사용합니다.',
        guidance: '추천 카드 선택 또는 직접 입력으로 들어온 사용자 메세지 단계입니다.',
        'screen-route': '현재 화면(routeKey)에 맞는 ScreenConfig를 먼저 확정합니다.',
        'event-rule-first': '화면별 front-rule을 먼저 평가합니다. 매칭되면 LLM 인텐트 분류를 건너뛰고 info/action을 직접 수행합니다.',
        'intent-prompt': 'LLM intent 분기(info/action) 판단에 사용하는 화면 전용 룰입니다.',
        'info-prompt': 'info 인텐트에서 답변 정책/톤/우선순위를 제어하는 룰입니다. 공통+화면 룰을 병합해 사용합니다.',
        'action-prompt': 'action 인텐트에서 툴 선택/파라미터 추론을 제어하는 룰입니다. 공통+화면 룰을 병합해 사용합니다.',
        'info-rag': '공통 정보 RAG를 먼저 조회하고, 부족하면 화면 정보 RAG를 다시 확인합니다.',
        'info-common-rag': '공통 탭에 등록된 공통 정보 RAG를 조회합니다. 이 화면에서는 읽기 전용입니다.',
        'info-llm-fallback': '화면 RAG와 공통 RAG를 모두 확인했는데도 부족하면 기본 LLM 응답으로 전환합니다.',
        'action-rag': '해당 화면의 화면 액션 RAG를 먼저 조회하고, 부족하면 공통 action RAG와 공통 action 툴을 다시 확인합니다.',
        'action-common-rag': '공통 탭에 등록된 action 공통 RAG를 조회합니다. 이 화면에서는 읽기 전용입니다.',
        'action-tool': 'action 툴을 통합 실행합니다. 응답 포맷에 따라 사이트 추가 액션 여부가 결정됩니다.',
        'common-action-tool': '공통 탭에 등록된 공통 action 툴을 조회합니다. 이 화면에서는 읽기 전용입니다.',
    }
    return map[stageKey] ?? ''
}

const FlowStageNoteCard = ({ title, description, details = [] }) => {
    const rows = Array.isArray(details) ? details : []

    return (
        <PromptCard>
            <PromptMeta>
                <span>{title}</span>
            </PromptMeta>
            <PageDescription>{description}</PageDescription>
            {rows.map((row, index) => (
                <PageDescription key={`stage-note-${index}`}>{index + 1}) {row}</PageDescription>
            ))}
        </PromptCard>
    )
}

const ScreenRouteSummary = ({ routeKey, routeParentKey }) => {
    return (
        <PromptCard>
            <PromptMeta>
                <span>화면 설정 확정</span>
                <span>routeKey: {routeKey || '-'}</span>
                <span>parent: {routeParentKey || '-'}</span>
            </PromptMeta>
            <PageDescription>오케스트레이터는 먼저 routeKey로 ScreenConfig를 찾습니다.</PageDescription>
            <PageDescription>화면 설정이 없으면 handled=false로 종료되어 상위 fallback 경로로 넘어갑니다.</PageDescription>
        </PromptCard>
    )
}

const ActionToolPriorityPreview = ({ tools }) => {
    const ordered = Array.isArray(tools) ? tools : []

    return (
        <PromptCard>
            <PromptMeta>
                <span>액션 툴 우선순위 미리보기</span>
                <span>총 {ordered.length}개</span>
            </PromptMeta>

            <PageDescription>
                실제 action 경로에서는 아래 순서대로 도구가 평가됩니다. (동일 toolName은 1회만 사용)
            </PageDescription>

            {ordered.length > 0 ? (
                <div style={{ display: 'grid', gap: '6px' }}>
                    {ordered.map((tool, index) => {
                        const name = String(tool?.toolName ?? '-').trim() || '-'
                        const displayName = String(tool?.displayName ?? '').trim() || name
                        return (
                            <div
                                key={`priority-${tool?.id ?? index}`}
                                style={{
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                    color: '#334155',
                                }}
                            >
                                <span style={{ minWidth: '26px', fontWeight: 800, color: '#1d4ed8' }}>{index + 1}.</span>
                                <span style={{ fontWeight: 700 }}>{displayName}</span>
                                <span style={{ color: '#64748b' }}>({name})</span>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <PageDescription>등록된 액션 툴이 없습니다.</PageDescription>
            )}
        </PromptCard>
    )
}

const ActionPromptPreview = ({ flowType = 'action', commonPromptItem, commonPromptDraft, prompts, promptDrafts }) => {
    const pickPromptContent = (promptType) => {
        const item = (Array.isArray(prompts) ? prompts : []).find(
            (row) => String(row?.promptType ?? row?.category ?? '').toLowerCase() === String(promptType ?? '').toLowerCase(),
        )
        if (!item) return ''

        const draft = getPromptDraft(promptDrafts, item)
        const enabled = draft.enabled
        if (!enabled) return ''
        return String(draft.content ?? '').trim()
    }

    const commonEnabled = commonPromptDraft?.enabled ?? commonPromptItem?.enabled !== false
    const commonContent = commonEnabled
        ? String(commonPromptDraft?.content ?? commonPromptItem?.content ?? '').trim()
        : ''
    const actionContent = pickPromptContent('action-system')
    const mergedBlocks = [commonContent, actionContent].filter(Boolean)
    const mergedContent = mergedBlocks.join('\n\n')

    return (
        <PromptCard>
            <PromptMeta>
                <span>실제 런타임 병합 프롬프트 미리보기</span>
                <span>활성 블록 {mergedBlocks.length}개</span>
                <span>len: {mergedContent.length}</span>
            </PromptMeta>

            <PageDescription>
                {flowType === 'info'
                    ? 'info 경로에서는 공통/화면 프롬프트를 병합해 RAG 미충족 시 LLM 호출에 사용합니다.'
                    : 'action 경로에서는 공통/액션 프롬프트를 병합해 tool agent에 전달합니다.'}
            </PageDescription>

            <PromptTextarea
                value={mergedContent || (flowType === 'info' ? '활성화된 정보 프롬프트가 없습니다.' : '활성화된 액션 프롬프트가 없습니다.')}
                readOnly
                style={{ minHeight: '180px', background: '#f8fafc', color: '#334155' }}
            />
        </PromptCard>
    )
}

const ChatFlowMap = ({ intentPromptCount, inputHintCount, actionPromptCount, guidanceCount, routeKey, infoRagCount, actionRagCount, commonInfoRagCount, commonActionRagCount, actionToolCount, commonActionToolCount, isFrontRuleEnabled = true, onSelectStage }) => {
    const defaultFlowItems = [
        {
            key: 'hint',
            node: <FlowNode title="힌트" desc={`입력 힌트 (${inputHintCount}개)`} tone="hint" onClick={() => onSelectStage('hint')} />,
        },
        {
            key: 'guidance',
            node: <FlowNode title="메세지" desc={`추천 카드(${guidanceCount}개) 또는 직접 입력`} tone="guide" onClick={() => onSelectStage('guidance')} />,
        },
        {
            key: 'screen-route',
            node: <FlowNode title="화면별 분기" desc={`${routeKey || '-'}`} tone="route" onClick={() => onSelectStage('screen-route')} />,
        },
        ...(isFrontRuleEnabled
            ? [{
                key: 'event-rule-first',
                node: <FlowNode title="Front Rule Engine" desc="모든 메시지 룰 우선 분기" tone="actionCommonTool" onClick={() => onSelectStage('event-rule-first')} />,
            }]
            : []),
        {
            key: 'intent-prompt',
            node: <FlowNode title="인텐트 분기 룰" desc={`intent-hint (${intentPromptCount}개)`} tone="prompt" onClick={() => onSelectStage('intent-prompt')} />,
        },
    ]

    const infoFlowItems = [

        {
            key: 'info-rag',
            node: <FlowNode title="화면 정보 RAG" desc={`해당 화면의 정보 RAG ${infoRagCount}개 확인`} tone="rag" dashed onClick={() => onSelectStage('info-rag')} />,
        },
                {
            key: 'info-common-rag',
            node: <FlowNode title="공통 정보 RAG" desc={`공통 정보 RAG ${commonInfoRagCount}개를 먼저 확인`} tone="rag" onClick={() => onSelectStage('info-common-rag')} />,
        },
        {
            key: 'info-prompt',
            node: <FlowNode title="info 인텐트 룰" desc={`공통+화면 룰 (${actionPromptCount}개)`} tone="prompt" dashed onClick={() => onSelectStage('info-prompt')} />,
        },
        {
            key: 'info-llm-fallback',
            node: <FlowNode title="RAG 미충족시 LLM 호출" desc="공통 RAG까지 비면 기본 LLM 폴백" tone="fallback" dashed onClick={() => onSelectStage('info-llm-fallback')} />,
        },
        {
            key: 'info-result',
            node: <FlowNode title="응답 생성" desc="RAG 근거 또는 기본 LLM 답변" tone="result" clickable={false} />,
        },
    ]

    const actionFlowItems = [
        {
            key: 'action-rag',
            node: <FlowNode title="화면 액션 RAG" desc={`해당 화면의 action RAG ${actionRagCount}개를 먼저 확인`} tone="rag" onClick={() => onSelectStage('action-rag')} />,
        },
        {
            key: 'action-common-rag',
            node: <FlowNode title="공통 액션 RAG" desc={`공통 action RAG ${commonActionRagCount}개 확인`} tone="rag" dashed onClick={() => onSelectStage('action-common-rag')} />,
        },
        {
            key: 'action-prompt',
            node: <FlowNode title="action 인텐트 룰" desc={`공통+화면 룰 병합 (${actionPromptCount}개)`} tone="prompt" dashed onClick={() => onSelectStage('action-prompt')} />,
        },
        {
            key: 'action-tool',
            node: <FlowNode title="통합 액션 툴" desc={`등록 툴 ${actionToolCount}개를 순차 실행`} tone="action" onClick={() => onSelectStage('action-tool')} />,
        },
        {
            key: 'common-action-tool',
            node: <FlowNode title="공통 액션 툴" desc={`공통 action 툴 ${commonActionToolCount}개 확인`} tone="actionCommonTool" dashed onClick={() => onSelectStage('common-action-tool')} />,
        },
        {
            key: 'action-fallback',
            node: <FlowNode title="툴 미선택/미충족" desc="공통 액션도 부족하면 fallback text" tone="fallback" dashed clickable={false} />,
        },
        {
            key: 'action-result',
            node: <FlowNode title="응답 생성" desc="사이트 액션 필요 여부 결정" tone="result" clickable={false} />,
        },
    ]

    return (
        <div style={{ border: '1px solid #dbe3ef', borderRadius: '14px', background: '#f8fbff', padding: '14px' }}>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>AI Assistant Flow</CardTitle>
                </CardHeader>
            </SectionTitleRow>

            <div style={{ marginTop: '8px', display: 'grid', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>default 경로</div>
                <FlowSequence items={defaultFlowItems} singleRow />

                <div style={{ border: '1px solid #bfdbfe', borderRadius: '12px', background: '#f8fbff', padding: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 800, marginBottom: '8px' }}>info 경로</div>
                    <FlowSequence items={infoFlowItems} singleRow />
                </div>

                <div style={{ border: '1px solid #fecaca', borderRadius: '12px', background: '#fff7f7', padding: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 800, marginBottom: '8px' }}>action 경로</div>
                    <FlowSequence items={actionFlowItems} singleRow />
                </div>
            </div>
        </div>
    )
}

const FlowSequence = ({ items, singleRow = false }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexWrap: singleRow ? 'nowrap' : 'wrap',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'hidden',
            }}
        >
            {(Array.isArray(items) ? items : []).map((item, index) => (
                <Fragment key={String(item?.key ?? index)}>
                    {index > 0 ? <FlowSequenceArrow /> : null}
                    <div style={{ flex: singleRow ? '1 1 0' : '1 1 190px', minWidth: singleRow ? '0' : '190px' }}>{item?.node}</div>
                </Fragment>
            ))}
        </div>
    )
}

const FlowSequenceArrow = () => {
    return (
        <div
            aria-hidden
            style={{
                width: '20px',
                height: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '999px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: 800,
                lineHeight: 1,
                flex: '0 0 auto',
            }}
        >
            &gt;
        </div>
    )
}

const FLOW_NODE_TONE = {
    hint: { border: '#c4b5fd', bg: '#f5f3ff', title: '#5b21b6' },
    prompt: { border: '#bfdbfe', bg: '#eff6ff', title: '#1d4ed8' },
    rag: { border: '#99f6e4', bg: '#f0fdfa', title: '#0f766e' },
    guide: { border: '#c7d2fe', bg: '#eef2ff', title: '#3730a3' },
    route: { border: '#a7f3d0', bg: '#ecfdf5', title: '#065f46' },
    intent: { border: '#dbeafe', bg: '#f8fbff', title: '#1e40af' },
    info: { border: '#bbf7d0', bg: '#ecfdf5', title: '#065f46' },
    infoCommon: { border: '#99f6e4', bg: '#f0fdfa', title: '#0f766e' },
    data: { border: '#bae6fd', bg: '#f0f9ff', title: '#0369a1' },
    actionRag: { border: '#fde68a', bg: '#fffbeb', title: '#92400e' },
    actionCommonRag: { border: '#fdba74', bg: '#fff7ed', title: '#9a3412' },
    action: { border: '#fecaca', bg: '#fef2f2', title: '#991b1b' },
    actionCommonTool: { border: '#fbcfe8', bg: '#fdf2f8', title: '#9d174d' },
    fallback: { border: '#e2e8f0', bg: '#f8fafc', title: '#334155' },
    result: { border: '#ddd6fe', bg: '#f5f3ff', title: '#5b21b6' },
}

const FlowNode = ({ title, tone, onClick, clickable = true, dashed = false }) => {
    const theme = FLOW_NODE_TONE[tone] ?? FLOW_NODE_TONE.fallback

    return (
        <button
            type="button"
            onClick={clickable ? onClick : undefined}
            disabled={!clickable}
            style={{
                width: '100%',
                display: 'block',
                border: `1px solid ${theme.border}`,
                borderStyle: dashed ? 'dashed' : 'solid',
                background: theme.bg,
                borderRadius: '12px',
                minHeight: '64px',
                padding: '12px',
                textAlign: 'left',
                cursor: clickable ? 'pointer' : 'default',
                opacity: clickable ? 1 : 0.9,
            }}
        >
            <div style={{ fontSize: '12px', fontWeight: 800, color: theme.title }}>{title}</div>
        </button>
    )
}

const ActionUnifiedPromptSection = ({
    flowType = 'action',
    appKey,
    routeKey,
    routeParentKey,
    prompts,
    promptDrafts,
    savingPromptKey,
    creatingPromptRouteKey,
    onPromptChange,
    onSavePrompt,
    onCreatePrompt,
}) => {
    const normalizedRouteKey = String(routeKey ?? '').trim()
    const isCreatingHere = creatingPromptRouteKey === normalizedRouteKey
    const promptLabel = flowType === 'info' ? '정보 프롬프트' : '액션 프롬프트'
    const promptMetaDetail = flowType === 'info'
        ? '저장 시 info 경로용 action-system에 반영'
        : '저장 시 action-system에 반영'
    const promptDescription = flowType === 'info'
        ? 'info 경로에서는 공통+화면 프롬프트를 함께 사용하며, 이 값은 action-system 기준으로 관리됩니다.'
        : 'action 경로 프롬프트는 action-system 단일 타입으로 관리합니다.'
    const actionPrompt = (Array.isArray(prompts) ? prompts : []).find((item) => String(item?.promptType ?? '').toLowerCase() === 'action-system')
    const sourcePrompt = actionPrompt ?? null

    const [draft, setDraft] = useState({
        content: '',
        enabled: true,
    })

    useEffect(() => {
        if (sourcePrompt) {
            const rowDraft = getPromptDraft(promptDrafts, sourcePrompt)
            setDraft({
                content: String(rowDraft.content ?? ''),
                enabled: rowDraft.enabled !== false,
            })
            return
        }

        setDraft({
            content: '',
            enabled: true,
        })
    }, [sourcePrompt, promptDrafts])

    const isSaving = Boolean(
        (actionPrompt && savingPromptKey === String(actionPrompt.id)) ||
        (!actionPrompt && isCreatingHere),
    )

    const handleSave = async () => {
        const requiredPromptTypes = ['action-system']
        const existingMap = new Map(
            (Array.isArray(prompts) ? prompts : [])
                .filter((item) => requiredPromptTypes.includes(String(item?.promptType ?? '').toLowerCase()))
                .map((item) => [String(item.promptType).toLowerCase(), item]),
        )

        for (const promptType of requiredPromptTypes) {
            const existing = existingMap.get(promptType)

            if (existing) {
                const draftKey = String(existing.id)
                onPromptChange(draftKey, 'content', draft.content)
                onPromptChange(draftKey, 'enabled', draft.enabled)
                await onSavePrompt(existing, {
                    content: draft.content,
                    enabled: draft.enabled,
                })
                continue
            }

            await onCreatePrompt({
                appKey,
                routeKey: normalizedRouteKey,
                routeParentKey,
                content: draft.content,
                label: promptLabel,
                promptType,
                enabled: draft.enabled,
            })
        }
    }

    return (
        <PromptCard>
            <PromptMeta>
                <span>{promptLabel} (단일 입력)</span>
                <span>{promptMetaDetail}</span>
            </PromptMeta>

            <PageDescription>
                {promptDescription}
            </PageDescription>

            <FieldLabel>{promptLabel}</FieldLabel>
            <PromptTextarea
                value={draft.content}
                onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))}
                style={{ minHeight: '300px' }}
            />

            <PromptFooter>
                <ToggleButton
                    type="button"
                    $active={draft.enabled}
                    onClick={() => setDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
                >
                    {draft.enabled ? '활성' : '비활성'}
                </ToggleButton>

                <PrimaryButton type="button" onClick={handleSave} disabled={!normalizedRouteKey || isSaving}>
                    {isSaving ? '저장 중...' : '저장'}
                </PrimaryButton>
            </PromptFooter>
        </PromptCard>
    )
}

const ScreenPromptSection = ({ appKey, routeKey, routeParentKey, prompts, allPrompts, commonIntentPromptItem, commonIntentPromptDraft, promptDrafts, savingPromptKey, creatingPromptRouteKey, onPromptChange, onSavePrompt, onCreatePrompt, promptType, title, description, createLabel, emptyText, expandedView = false, allowCreate = true, singleOnly = false, commonFallbackHint = '' }) => {
    const getInitialCreateDraft = () => ({
        label: title,
        content: '',
        enabled: true,
    })

    const [previewOpen, setPreviewOpen] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [createDraft, setCreateDraft] = useState(getInitialCreateDraft)

    const normalizedRouteKey = String(routeKey ?? '').trim()
    const isCreatingHere = creatingPromptRouteKey === normalizedRouteKey
    const filteredPrompts = (Array.isArray(prompts) ? prompts : []).filter((item) => String(item?.promptType ?? item?.category ?? '').toLowerCase() === String(promptType ?? '').toLowerCase())
    const visiblePrompts = singleOnly ? filteredPrompts.slice(0, 1) : filteredPrompts
    const singlePrompt = singleOnly ? (visiblePrompts[0] ?? null) : null
    const [singleDraft, setSingleDraft] = useState({ content: '', enabled: true })

    useEffect(() => {
        if (!singleOnly) return

        if (singlePrompt) {
            const draft = getPromptDraft(promptDrafts, singlePrompt)
            setSingleDraft({
                content: String(draft.content ?? ''),
                enabled: draft.enabled !== false,
            })
            return
        }

        setSingleDraft({
            content: String(createDraft.content ?? ''),
            enabled: createDraft.enabled !== false,
        })
    }, [singleOnly, singlePrompt, promptDrafts, createDraft.content, createDraft.enabled, promptType])

    const handleCreateSubmit = async () => {
        const ok = await onCreatePrompt({
            appKey,
            routeKey: normalizedRouteKey,
            routeParentKey,
            content: createDraft.content,
            label: createDraft.label,
            promptType,
            enabled: createDraft.enabled,
        })

        if (ok) {
            setCreateDraft(getInitialCreateDraft())
        }
    }

    const handleSingleSubmit = async () => {
        if (!normalizedRouteKey) return

        let promptSaved = false

        if (singlePrompt) {
            await onSavePrompt(singlePrompt, {
                content: singleDraft.content,
                enabled: singleDraft.enabled,
            })
            promptSaved = true
        } else {
            promptSaved = await onCreatePrompt({
                appKey,
                routeKey: normalizedRouteKey,
                routeParentKey,
                content: singleDraft.content,
                label: title,
                promptType,
                enabled: singleDraft.enabled,
            })
        }

        if (!promptSaved) return

    }

    const isSingleSaving = singlePrompt
        ? savingPromptKey === String(singlePrompt.id)
        : isCreatingHere

    const appIntentPrompt = useMemo(() => {
        if (promptType !== 'intent-hint') return null
        return (Array.isArray(allPrompts) ? allPrompts : []).find((item) => {
            const key = String(item?.key ?? '').trim()
            const type = String(item?.promptType ?? item?.category ?? '').trim().toLowerCase()
            return key === String(appKey ?? '').trim() && type === 'intent-hint'
        }) ?? null
    }, [allPrompts, appKey, promptType])

    const mergedIntentHintPreview = useMemo(() => {
        if (promptType !== 'intent-hint') return ''

        const commonEnabled = commonIntentPromptDraft?.enabled ?? commonIntentPromptItem?.enabled !== false
        const commonContent = commonEnabled
            ? String(commonIntentPromptDraft?.content ?? commonIntentPromptItem?.content ?? '').trim()
            : ''

        const appContent = appIntentPrompt
            ? (() => {
                const draft = getPromptDraft(promptDrafts, appIntentPrompt)
                return draft.enabled !== false ? String(draft.content ?? '').trim() : ''
            })()
            : ''

        const screenContent = singleDraft.enabled !== false
            ? String(singleDraft.content ?? '').trim()
            : ''

        return [commonContent, appContent, screenContent].filter(Boolean).join('\n\n')
    }, [promptType, commonIntentPromptDraft, commonIntentPromptItem, appIntentPrompt, promptDrafts, singleDraft])

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <ComingSoonBadge>{filteredPrompts.length}개</ComingSoonBadge>
                </CardHeader>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {promptType === 'intent-hint' ? (
                        <SecondaryTextButton type="button" onClick={() => setPreviewOpen(true)}>
                            설명 보기
                        </SecondaryTextButton>
                    ) : null}
                    {allowCreate ? (
                        <PrimaryButton type="button" onClick={() => setCreateOpen((prev) => !prev)} disabled={!normalizedRouteKey || isCreatingHere}>
                            {isCreatingHere ? '생성 중...' : createOpen ? '닫기' : createLabel}
                        </PrimaryButton>
                    ) : null}
                </div>
            </SectionTitleRow>

            <PageDescription>{description}</PageDescription>

            {singleOnly && promptType === 'intent-hint' ? (
                <PromptCard>
                    <PromptMeta>
                        <span>분기 프롬프트 병합 미리보기</span>
                        <span>common + app + screen</span>
                        <span>len: {mergedIntentHintPreview.length}</span>
                    </PromptMeta>

                    <PromptTextarea
                        value={mergedIntentHintPreview || '활성화된 분기 프롬프트가 없습니다.'}
                        readOnly
                        style={{ minHeight: '180px', background: '#f8fafc', color: '#334155' }}
                    />
                </PromptCard>
            ) : null}

            {singleOnly && promptType === 'input-hint' ? (
                <PromptCard>
                    <PromptMeta>
                        <span>공통 입력 힌트 fallback</span>
                    </PromptMeta>
                    <PromptTextarea
                        value={commonFallbackHint || '공통 입력 힌트가 비어 있습니다. 공통 탭에서 먼저 등록하세요.'}
                        readOnly
                        style={{ minHeight: '90px', background: '#f8fafc', color: '#334155' }}
                    />
                </PromptCard>
            ) : null}

            {singleOnly ? (
                <PromptCard>
                    <PromptMeta>
                        <span>{singlePrompt?.label || title}</span>
                        <span>key: {normalizedRouteKey || '-'}</span>
                        <span>type: {promptType}</span>
                    </PromptMeta>

                    <FieldLabel>프롬프트</FieldLabel>
                    <PromptTextarea
                        value={singleDraft.content}
                        onChange={(e) => setSingleDraft((prev) => ({ ...prev, content: e.target.value }))}
                        placeholder="이 화면에 적용할 프롬프트를 입력하세요."
                        style={{ minHeight: expandedView ? '320px' : '160px' }}
                    />

                    <FieldHint>
                        {promptType === 'input-hint'
                            ? '줄바꿈으로 여러 문구를 입력하면 랜덤 노출됩니다.'
                            : '분기 판단에 사용할 대표 문구를 한 번만 관리합니다.'}
                    </FieldHint>

                    <PromptFooter>
                        <ToggleButton
                            type="button"
                            $active={singleDraft.enabled}
                            onClick={() => setSingleDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
                        >
                            {singleDraft.enabled ? '활성' : '비활성'}
                        </ToggleButton>

                        <PrimaryButton type="button" onClick={handleSingleSubmit} disabled={!normalizedRouteKey || isSingleSaving}>
                            {isSingleSaving ? '저장 중...' : '저장'}
                        </PrimaryButton>
                    </PromptFooter>
                </PromptCard>
            ) : (
                <>
                    {(allowCreate && (createOpen || filteredPrompts.length === 0)) ? (
                        <PromptCard>
                            <PromptMeta>
                                <span>{filteredPrompts[0]?.label || title}</span>
                                <span>key: {normalizedRouteKey || '-'}</span>
                                <span>type: {promptType}</span>
                            </PromptMeta>

                            <FieldLabel>프롬프트</FieldLabel>
                            <PromptTextarea
                                value={createDraft.content}
                                onChange={(e) => setCreateDraft((prev) => ({ ...prev, content: e.target.value }))}
                                placeholder="이 화면에 적용할 프롬프트를 입력하세요."
                                style={{ minHeight: expandedView ? '320px' : '160px' }}
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
                        {visiblePrompts.length > 0 ? (
                            visiblePrompts.map((item) => {
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
                                    style={{ minHeight: expandedView ? '300px' : '120px' }}
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
                            <PageDescription>{emptyText}</PageDescription>
                        )}
                    </OptionList>
                </>
            )}

            {previewOpen && promptType === 'intent-hint' ? (
                <ModalBackdrop>
                    <ModalCard style={LARGE_MODAL_STYLE}>
                        <ModalTitle>분기 프롬프트 설명</ModalTitle>
                        <ModalDescription>이 프롬프트는 info/action 분기 판단을 돕는 용도입니다.</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                            <PromptTextarea
                                value={singleOnly
                                    ? String(mergedIntentHintPreview || singleDraft.content || '')
                                    : String(filteredPrompts[0]?.content ?? createDraft.content ?? '')}
                                readOnly
                                style={{ minHeight: expandedView ? '520px' : '320px', background: '#f8fafc', color: '#334155' }}
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
        if (!ok) return
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
    initialIntentType = 'info',
    fixedIntentType = '',
    readOnly = false,
}) => {
    const sortedRagDocs = useMemo(() => {
        return [...ragDocs].sort((left, right) => {
            const leftOrder = Number(left?.sortOrder ?? 0)
            const rightOrder = Number(right?.sortOrder ?? 0)
            if (leftOrder !== rightOrder) return leftOrder - rightOrder
            return String(left?.chunkKey ?? '').localeCompare(String(right?.chunkKey ?? ''))
        })
    }, [ragDocs])

    const normalizedFixedIntentType = normalizeRagIntentType(fixedIntentType)
    const isIntentFixed = normalizedFixedIntentType === 'info' || normalizedFixedIntentType === 'action'
    const displayRouteKey = (appKey === 'common' && isIntentFixed)
        ? (normalizedFixedIntentType === 'action' ? 'common_action' : 'common_info')
        : routeKey
    const [activeIntentType, setActiveIntentType] = useState(isIntentFixed ? normalizedFixedIntentType : initialIntentType)
    const [activeRagKey, setActiveRagKey] = useState('')
    const [creatingOpen, setCreatingOpen] = useState(false)
    const [newRagDraft, setNewRagDraft] = useState({
        title: '',
        body: '',
        imageUrl: '',
        imageAttachMode: 'auto',
        keywords: [],
        intentType: initialIntentType,
        enabled: true,
    })

    useEffect(() => {
        const nextIntent = normalizeRagIntentType(initialIntentType)
        const targetIntent = isIntentFixed ? normalizedFixedIntentType : nextIntent
        setActiveIntentType(targetIntent)
        setNewRagDraft((prev) => ({ ...prev, intentType: targetIntent }))
    }, [initialIntentType, isIntentFixed, normalizedFixedIntentType])

    const scopedCommonKey = appKey === 'common' ? normalizeCommonRagKey(routeKey) : ''
    const scopedRagDocs = useMemo(() => {
        if (!scopedCommonKey) return sortedRagDocs

        const keyMatched = sortedRagDocs.filter((item) => resolveCommonRagScopeKey(item) === scopedCommonKey)
        if (keyMatched.length > 0) return keyMatched

        return sortedRagDocs
    }, [sortedRagDocs, scopedCommonKey])

    const filteredRagDocs = useMemo(() => {
        return scopedRagDocs.filter((item) => {
            const intentType = normalizeRagIntentType(item?.intentType)
            if (activeIntentType === 'info') return intentType === 'info' || intentType === 'both'
            return intentType === 'action' || intentType === 'both'
        })
    }, [scopedRagDocs, activeIntentType])

    const infoCount = useMemo(() => {
        return sortedRagDocs.filter((item) => {
            const intentType = normalizeRagIntentType(item?.intentType)
            return intentType === 'info' || intentType === 'both'
        }).length
    }, [sortedRagDocs])

    const actionCount = useMemo(() => {
        return sortedRagDocs.filter((item) => {
            const intentType = normalizeRagIntentType(item?.intentType)
            return intentType === 'action' || intentType === 'both'
        }).length
    }, [sortedRagDocs])

    useEffect(() => {
        if (filteredRagDocs.length === 0) {
            if (activeRagKey) setActiveRagKey('')
            return
        }

        if (creatingOpen) return

        const exists = filteredRagDocs.some((item) => String(item.id) === activeRagKey)
        if (!exists) {
            setActiveRagKey(String(filteredRagDocs[0].id))
        }
    }, [filteredRagDocs, activeRagKey, creatingOpen])

    const activeRagDoc = filteredRagDocs.find((item) => String(item.id) === activeRagKey) ?? null
    const activeRagIsReadOnly = readOnly || isCommonRagDoc(activeRagDoc)
    const activeRagDraft = activeRagDoc
        ? (() => {
            const draft = ragDrafts[activeRagKey] ?? {
                title: String(activeRagDoc.title ?? ''),
                body: String(activeRagDoc.body ?? ''),
                imageUrl: String(activeRagDoc.imageUrl ?? ''),
                imageAttachMode: normalizeImageAttachMode(activeRagDoc.imageAttachMode),
                keywords: normalizeKeywordArray(activeRagDoc.keywords ?? []),
                intentType: normalizeRagIntentType(activeRagDoc.intentType),
                enabled: activeRagDoc.enabled !== false,
            }

            return {
                ...draft,
                intentType: isIntentFixed ? normalizedFixedIntentType : normalizeRagIntentType(draft.intentType),
            }
        })()
        : null

    const handleCreateRag = async () => {
        const ok = await onCreateRag({
            appKey,
            key: routeKey,
            routeKey: routeParentKey,
            ...newRagDraft,
            intentType: isIntentFixed ? normalizedFixedIntentType : normalizeRagIntentType(newRagDraft.intentType),
        })
        if (ok) {
            setNewRagDraft({ title: '', body: '', imageUrl: '', imageAttachMode: 'auto', keywords: [], intentType: activeIntentType, enabled: true })
        }
    }

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>RAG 데이터</CardTitle>
                    <SmallBadge>
                        {isIntentFixed
                            ? `${getRagIntentLabel(normalizedFixedIntentType)} ${filteredRagDocs.length}개`
                            : `정보 ${infoCount}개 · 액션 ${actionCount}개`}
                    </SmallBadge>
                </CardHeader>

                {!readOnly ? (
                    <PrimaryButton
                        type="button"
                        onClick={() => setCreatingOpen(true)}
                        disabled={savingCreateRag}
                        style={{ height: '36px' }}
                    >
                        {savingCreateRag ? '저장 중...' : '+ RAG 추가'}
                    </PrimaryButton>
                ) : null}
            </SectionTitleRow>

            <PageDescription>
                {isIntentFixed
                    ? `${getRagIntentLabel(normalizedFixedIntentType)}에서 사용하는 RAG만 표시합니다.`
                    : 'info 인텐트와 action 인텐트에서 참조할 RAG를 분리해서 관리합니다.'}
                {readOnly ? ' 앱 화면에서는 조회만 가능하고, 편집은 공통 탭에서 합니다.' : ''}
            </PageDescription>

            {!isIntentFixed ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {RAG_INTENT_OPTIONS.map((option) => {
                        const active = activeIntentType === option.key
                        const count = option.key === 'info' ? infoCount : actionCount

                        return (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                    setActiveIntentType(option.key)
                                    setNewRagDraft((prev) => ({ ...prev, intentType: option.key }))
                                }}
                                style={{
                                    height: '34px',
                                    padding: '0 12px',
                                    borderRadius: '999px',
                                    border: active ? '1px solid #2563eb' : '1px solid #dbe3ef',
                                    background: active ? '#eff6ff' : '#ffffff',
                                    color: active ? '#1d4ed8' : '#475569',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                {option.label} ({count})
                            </button>
                        )
                    })}
                </div>
            ) : null}

            {filteredRagDocs.length > 0 ? (
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
                            {filteredRagDocs.map((item) => {
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
                                        <span style={{ fontSize: '11px' }}>
                                            {getRagIntentLabel(item.intentType)}
                                            {isCommonRagDoc(item) ? ' · 공통(읽기전용)' : ''}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {creatingOpen ? null : null}

                    {activeRagDoc && activeRagDraft ? (
                        activeRagIsReadOnly ? (
                            <PromptCard>
                                <PromptMeta>
                                    <span>{activeRagDoc.title || activeRagDoc.chunkKey}</span>
                                    <span>key: {displayRouteKey}</span>
                                    <span>intent: {getRagIntentLabel(activeRagDraft.intentType)}</span>
                                    <span>updated: {formatDateTime(activeRagDoc.updatedAt)}</span>
                                </PromptMeta>

                                <FieldLabel>제목</FieldLabel>
                                <PromptTextarea
                                    value={activeRagDoc.title || ''}
                                    readOnly
                                    style={{ minHeight: '56px', background: '#f8fafc', color: '#334155' }}
                                />

                                <FieldLabel>keywords</FieldLabel>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {normalizeKeywordArray(activeRagDoc.keywords ?? []).length > 0 ? (
                                        normalizeKeywordArray(activeRagDoc.keywords ?? []).map((keyword, index) => (
                                            <span
                                                key={`readonly-keyword-${index}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '8px 12px',
                                                    borderRadius: '999px',
                                                    border: '1px solid #dbe3ef',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    fontSize: '13px',
                                                }}
                                            >
                                                {keyword}
                                            </span>
                                        ))
                                    ) : (
                                        <FieldHint>등록된 keywords가 없습니다.</FieldHint>
                                    )}
                                </div>

                                <FieldLabel>body</FieldLabel>
                                <PromptTextarea
                                    value={activeRagDoc.body || ''}
                                    readOnly
                                    style={{ minHeight: '180px', background: '#f8fafc', color: '#334155' }}
                                />

                                <FieldLabel>imageUrl</FieldLabel>
                                <PromptTextarea
                                    value={String(activeRagDoc.imageUrl ?? '')}
                                    readOnly
                                    style={{ minHeight: '56px', background: '#f8fafc', color: '#334155' }}
                                />

                                <FieldLabel>이미지 노출 정책</FieldLabel>
                                <PromptTextarea
                                    value={normalizeImageAttachMode(activeRagDoc.imageAttachMode)}
                                    readOnly
                                    style={{ minHeight: '56px', background: '#f8fafc', color: '#334155' }}
                                />
                                <FieldHint>
                                    {isCommonRagDoc(activeRagDoc)
                                        ? '공통 RAG는 이 화면에서 읽기 전용입니다. 공통 탭에서 편집해 주세요.'
                                        : '편집은 공통 탭에서만 가능합니다.'}
                                </FieldHint>
                            </PromptCard>
                        ) : (
                        <PromptCard>
                            <PromptMeta>
                                <span>{activeRagDoc.title || activeRagDoc.chunkKey}</span>
                                <span>key: {displayRouteKey}</span>
                                <span>intent: {getRagIntentLabel(activeRagDraft.intentType)}</span>
                                <span>updated: {formatDateTime(activeRagDoc.updatedAt)}</span>
                            </PromptMeta>

                            <FieldLabel>인텐트 용도</FieldLabel>
                            {isIntentFixed ? (
                                <FieldHint>{getRagIntentLabel(normalizedFixedIntentType)} 고정</FieldHint>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {[...RAG_INTENT_OPTIONS, { key: 'both', label: '공용(정보/액션)' }].map((option) => {
                                            const active = normalizeRagIntentType(activeRagDraft.intentType) === option.key
                                            return (
                                                <button
                                                    key={`intent-${option.key}`}
                                                    type="button"
                                                    onClick={() => onRagChange(activeRagKey, 'intentType', option.key)}
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
                                    <FieldHint>info 응답용인지, action 실행 전/후 보강용인지 명확히 분리하세요.</FieldHint>
                                </>
                            )}

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
                                hint="동의어와 프론트 화면 표현까지 넣으면 조회 정확도가 좋아집니다."
                            />

                            <FieldLabel>body</FieldLabel>
                            <PromptTextarea
                                value={activeRagDraft.body}
                                onChange={(e) => onRagChange(activeRagKey, 'body', e.target.value)}
                                style={{ minHeight: '180px' }}
                            />
                            <FieldHint>한 청크는 한 주제만 다루는 것이 좋습니다.</FieldHint>

                            <FieldLabel>imageUrl</FieldLabel>
                            <input
                                type="text"
                                style={ONE_LINE_INPUT_STYLE}
                                value={String(activeRagDraft.imageUrl ?? '')}
                                onChange={(e) => onRagChange(activeRagKey, 'imageUrl', e.target.value)}
                            />
                            <FieldHint>설명 응답에 함께 표시할 이미지 URL입니다.</FieldHint>

                            <FieldLabel>이미지 노출 정책</FieldLabel>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {IMAGE_ATTACH_MODE_OPTIONS.map((option) => {
                                    const active = normalizeImageAttachMode(activeRagDraft.imageAttachMode) === option.key
                                    return (
                                        <button
                                            key={`screen-image-mode-${option.key}`}
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
                        )
                    ) : null}
                </>
            ) : (
                <PageDescription>
                    선택한 인텐트에 등록된 화면 RAG 청크가 없습니다.
                    {readOnly ? ' 공통 탭에서 등록된 RAG를 확인해 주세요.' : ' 상단의 + RAG 추가 버튼으로 등록해 주세요.'}
                </PageDescription>
            )}

            {!readOnly && creatingOpen ? (
                <ModalBackdrop>
                    <ModalCard style={LARGE_MODAL_STYLE}>
                        <ModalTitle>화면 RAG 추가</ModalTitle>
                        <ModalDescription>이 화면에서 참고할 RAG 청크를 추가합니다. chunk key는 자동으로 생성됩니다.</ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                            <FieldLabel>제목</FieldLabel>
                            <input
                                type="text"
                                style={ONE_LINE_INPUT_STYLE}
                                value={newRagDraft.title}
                                onChange={(e) => setNewRagDraft((prev) => ({ ...prev, title: e.target.value }))}
                            />

                            <FieldLabel>인텐트 용도</FieldLabel>
                            {isIntentFixed ? (
                                <FieldHint>{getRagIntentLabel(normalizedFixedIntentType)} 고정</FieldHint>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {[...RAG_INTENT_OPTIONS, { key: 'both', label: '공용(정보/액션)' }].map((option) => {
                                        const active = normalizeRagIntentType(newRagDraft.intentType) === option.key
                                        return (
                                            <button
                                                key={`create-intent-${option.key}`}
                                                type="button"
                                                onClick={() => setNewRagDraft((prev) => ({ ...prev, intentType: option.key }))}
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
                            )}

                            <FieldLabel>keywords</FieldLabel>
                            <KeywordListEditor
                                keywords={newRagDraft.keywords}
                                onChange={(next) => setNewRagDraft((prev) => ({ ...prev, keywords: next }))}
                            />

                            <FieldLabel>body</FieldLabel>
                            <PromptTextarea
                                value={newRagDraft.body}
                                onChange={(e) => setNewRagDraft((prev) => ({ ...prev, body: e.target.value }))}
                                style={{ minHeight: '180px' }}
                            />

                            <FieldLabel>imageUrl</FieldLabel>
                            <input
                                type="text"
                                style={ONE_LINE_INPUT_STYLE}
                                value={String(newRagDraft.imageUrl ?? '')}
                                onChange={(e) => setNewRagDraft((prev) => ({ ...prev, imageUrl: e.target.value }))}
                            />
                            <FieldHint>설명 응답과 함께 표시할 이미지 URL입니다.</FieldHint>

                            <FieldLabel>이미지 노출 정책</FieldLabel>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {IMAGE_ATTACH_MODE_OPTIONS.map((option) => {
                                    const active = normalizeImageAttachMode(newRagDraft.imageAttachMode) === option.key
                                    return (
                                        <button
                                            key={`create-screen-image-mode-${option.key}`}
                                            type="button"
                                            onClick={() => setNewRagDraft((prev) => ({ ...prev, imageAttachMode: option.key }))}
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
    readOnly = false,
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

        if (!ok) return
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
    const selectedIsReadOnly = Boolean(readOnly || selectedTool?.isReadOnly || selectedTool?.isCodeTool)
    const filteredTools = tools
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

                {!readOnly ? (
                    <PrimaryButton type="button" onClick={openCreate} disabled={savingCreateTool} style={{ height: '36px' }}>
                        {savingCreateTool ? '추가 중...' : '+ 화면 액션 추가'}
                    </PrimaryButton>
                ) : null}
            </SectionTitleRow>

            <PageDescription>
                {readOnly
                    ? '공통 탭에서 등록한 공통 액션 목록입니다. 이 화면에서는 조회만 제공합니다.'
                    : '이 화면에서 실행할 액션을 관리합니다. REST 액션은 동적 등록/수정이 가능하고, 코드 내장 액션은 읽기 전용으로 표시됩니다.'}
            </PageDescription>

            <OptionList>
                {filteredTools.length > 0 ? (
                    filteredTools.map((item) => {
                        const toolKey = String(item.id)
                        const displayName = String(item.displayName ?? item.toolName ?? '-')
                        const endpoint = String(item.endpoint ?? '-')
                        const method = String(item.method ?? '').toUpperCase() || '-'
                        const isReadOnly = Boolean(item?.isReadOnly || item?.isCodeTool)

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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isReadOnly ? (
                                            <span
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: '#92400e',
                                                    border: '1px solid #fcd34d',
                                                    background: '#fffbeb',
                                                    borderRadius: '999px',
                                                    padding: '2px 8px',
                                                }}
                                            >
                                                코드 내장
                                            </span>
                                        ) : null}
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
                        <ModalDescription>
                            {selectedIsReadOnly
                                ? '코드 내장 액션입니다. 동작은 백엔드 코드에서 관리되며 이 화면에서는 조회만 가능합니다.'
                                : '필수 정보는 목록에서 확인하고, 상세 수정은 팝업에서 관리합니다.'}
                        </ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                            <PromptMeta>
                                <span>{selectedTool.toolName}</span>
                                <span>{selectedTool.key}</span>
                                <span>parent: {selectedTool.routeKey || '-'}</span>
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
                                    disabled={selectedIsReadOnly}
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
                                            disabled={selectedIsReadOnly}
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
                                            <TextInput value={selectedDraft.apiName} onChange={(e) => onToolChange(selectedToolKey, 'apiName', e.target.value)} disabled={selectedIsReadOnly} />
                                            <TextInput value={selectedDraft.method} onChange={(e) => onToolChange(selectedToolKey, 'method', e.target.value)} disabled={selectedIsReadOnly} />
                                            <TextInput value={selectedDraft.endpoint} onChange={(e) => onToolChange(selectedToolKey, 'endpoint', e.target.value)} disabled={selectedIsReadOnly} />
                                        </InlineFields>
                                    </FieldGroup>

                                    <FieldGroup>
                                        <FieldLabel>Base URL (base_url)</FieldLabel>
                                        <FieldHint>endpoint가 상대 경로면 필수입니다. endpoint를 절대 URL로 넣으면 생략 가능합니다.</FieldHint>
                                        <TextInput
                                            value={selectedDraft.baseUrl}
                                            onChange={(e) => onToolChange(selectedToolKey, 'baseUrl', e.target.value)}
                                            disabled={selectedIsReadOnly}
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
                                            disabled={selectedIsReadOnly}
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
                                            disabled={selectedIsReadOnly}
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
                                            disabled={selectedIsReadOnly}
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
                                disabled={selectedIsReadOnly}
                            >
                                {selectedDraft.enabled ? '활성' : '비활성'}
                            </ToggleButton>

                            <SecondaryTextButton type="button" onClick={() => onDeleteTool(selectedTool)} disabled={selectedIsReadOnly}>
                                삭제
                            </SecondaryTextButton>

                            <SecondaryTextButton type="button" onClick={closeDetail}>
                                닫기
                            </SecondaryTextButton>

                            <PrimaryButton
                                type="button"
                                onClick={() => onSaveTool(selectedTool)}
                                disabled={savingToolKey === selectedToolKey || selectedIsReadOnly}
                            >
                                {savingToolKey === selectedToolKey ? '저장 중...' : '저장'}
                            </PrimaryButton>
                        </ModalActions>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}

            {!readOnly && createOpen ? (
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
