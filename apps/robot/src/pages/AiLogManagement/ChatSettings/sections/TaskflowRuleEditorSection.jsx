import { useMemo, useState } from 'react'

import {
    SettingCard,
    CardHeader,
    CardTitle,
    SmallBadge,
    PageDescription,
    PromptCard,
    PromptMeta,
    PromptTextarea,
    PromptFooter,
    PrimaryButton,
    SecondaryTextButton,
    FieldLabel,
    FieldHint,
    OptionList,
    OptionButton,
    ActiveBadge,
    ModalBackdrop,
    ModalCard,
    ModalTitle,
    ModalDescription,
} from '../styles'

import {
    TASKFLOW_RULE_GROUPS,
    buildTaskflowSettingKey,
    parseTaskflowRuleDraftValue,
    toTaskflowRuleDraftValue,
} from '../taskflowRuleConfigs'

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

const BOOLEAN_OPTIONS = [
    { value: 'true', label: 'true' },
    { value: 'false', label: 'false' },
]

const DETAIL_MODAL_STYLE = {
    width: 'min(760px, 100%)',
    maxHeight: '78vh',
    overflowY: 'auto',
}

const isEmptyRuleValue = (kind, value) => {
    if (kind === 'list') return !Array.isArray(value) || value.length === 0
    if (kind === 'text') return String(value ?? '').trim() === ''
    if (kind === 'number') return value === undefined || value === null || String(value).trim() === ''
    if (kind === 'boolean') return value === undefined || value === null || String(value).trim() === ''
    return value === undefined || value === null
}

const summarizeRuleValue = (kind, value) => {
    if (kind === 'list') {
        const list = Array.isArray(value) ? value.filter(Boolean) : []
        if (list.length === 0) return '설정 없음'
        const preview = list.slice(0, 2).join(', ')
        return list.length > 2 ? `${preview} 외 ${list.length - 2}개` : preview
    }

    if (kind === 'boolean') {
        if (value === undefined || value === null || String(value).trim() === '') return '설정 없음'
        return String(value) === 'true' || value === true ? 'true' : 'false'
    }

    const text = String(value ?? '').trim()
    if (!text) return '설정 없음'
    return text.length > 48 ? `${text.slice(0, 48)}...` : text
}

const renderFieldEditor = ({ field, settingKey, draftValue, onSettingDraftChange }) => {
    if (field.kind === 'list') {
        return (
            <PromptTextarea
                value={draftValue}
                onChange={(e) => onSettingDraftChange(settingKey, e.target.value)}
                placeholder={field.placeholder || '한 줄에 한 개씩 입력'}
                style={{ minHeight: '180px' }}
            />
        )
    }

    if (field.kind === 'text') {
        return (
            <input
                value={draftValue}
                onChange={(e) => onSettingDraftChange(settingKey, e.target.value)}
                placeholder={field.placeholder || ''}
                style={ONE_LINE_INPUT_STYLE}
            />
        )
    }

    if (field.kind === 'number') {
        return (
            <input
                value={draftValue}
                onChange={(e) => onSettingDraftChange(settingKey, e.target.value)}
                inputMode="numeric"
                placeholder={field.placeholder || '숫자'}
                style={ONE_LINE_INPUT_STYLE}
            />
        )
    }

    if (field.kind === 'boolean') {
        return (
            <OptionList>
                {BOOLEAN_OPTIONS.map((option) => {
                    const active = String(draftValue ?? 'false') === option.value
                    return (
                        <OptionButton
                            key={`${settingKey}-${option.value}`}
                            type="button"
                            $active={active}
                            onClick={() => onSettingDraftChange(settingKey, option.value)}
                        >
                            <span>{option.label}</span>
                            {active ? <ActiveBadge>선택</ActiveBadge> : null}
                        </OptionButton>
                    )
                })}
            </OptionList>
        )
    }

    return null
}

export const TaskflowRuleEditorSection = ({
    scope,
    scopeLabel,
    values,
    settingDrafts,
    savingSettingScope,
    onSettingDraftChange,
    onSaveSettingGroup,
}) => {
    const currentValues = values && typeof values === 'object' ? values : {}
    const drafts = settingDrafts && typeof settingDrafts === 'object' ? settingDrafts : {}
    const [activeFieldKey, setActiveFieldKey] = useState('')

    const resolveCurrentValue = (groupPrefix, field) => {
        const scopedKey = buildTaskflowSettingKey(groupPrefix, scope, field.key)
        const scopedValue = currentValues?.[scopedKey]
        return {
            scopedKey,
            scopedValue,
            effectiveValue: scopedValue,
        }
    }

    const handleRestoreGroup = (group) => {
        for (const field of group.fields) {
            const settingKey = buildTaskflowSettingKey(group.prefix, scope, field.key)
            const { effectiveValue } = resolveCurrentValue(group.prefix, field)
            const currentValue = effectiveValue
            onSettingDraftChange(settingKey, toTaskflowRuleDraftValue(field.kind, currentValue))
        }
    }

    const handleSaveGroup = async (group) => {
        const settings = group.fields.map((field) => {
            const { scopedKey: settingKey, effectiveValue } = resolveCurrentValue(group.prefix, field)
            const rawDraft = drafts?.[settingKey]
            const effectiveDraft = rawDraft !== undefined ? rawDraft : toTaskflowRuleDraftValue(field.kind, effectiveValue)
            return {
                key: settingKey,
                value: parseTaskflowRuleDraftValue(field.kind, effectiveDraft),
            }
        })

        await onSaveSettingGroup(
            `${group.prefix}.${scope}`,
            settings,
            `${scopeLabel} ${group.successLabel}가 저장되었습니다.`,
        )
    }

    const fieldEntries = useMemo(() => {
        return TASKFLOW_RULE_GROUPS.flatMap((group) => {
            const savingKey = `${group.prefix}.${scope}`
            return group.fields.map((field) => {
                const resolved = resolveCurrentValue(group.prefix, field)
                const draftValue = drafts?.[resolved.scopedKey] ?? toTaskflowRuleDraftValue(field.kind, resolved.effectiveValue)
                return {
                    group,
                    field,
                    savingKey,
                    ...resolved,
                    draftValue,
                }
            })
        })
    }, [drafts, scope, currentValues])

    const activeEntry = fieldEntries.find((item) => item.scopedKey === activeFieldKey) ?? null

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            {TASKFLOW_RULE_GROUPS.map((group) => {
                const savingKey = `${group.prefix}.${scope}`
                return (
                    <SettingCard key={`${scope}-${group.id}`}>
                        <CardHeader>
                            <CardTitle>{scopeLabel} {group.title}</CardTitle>
                            <SmallBadge>{group.fields.length}개 키</SmallBadge>
                        </CardHeader>

                        <PageDescription>{group.description}</PageDescription>

                        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                            {group.fields.map((field) => {
                                const {
                                    scopedKey: settingKey,
                                    scopedValue: currentValue,
                                    effectiveValue,
                                } = resolveCurrentValue(group.prefix, field)
                                const draftValue = drafts?.[settingKey] ?? toTaskflowRuleDraftValue(field.kind, effectiveValue)
                                const summary = summarizeRuleValue(field.kind, parseTaskflowRuleDraftValue(field.kind, draftValue))

                                return (
                                    <button
                                        key={settingKey}
                                        type="button"
                                        onClick={() => setActiveFieldKey(settingKey)}
                                        style={{
                                            textAlign: 'left',
                                            display: 'grid',
                                            gap: '10px',
                                            padding: '14px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '14px',
                                            background: '#fdfefe',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <PromptMeta>
                                            <span>{field.label}</span>
                                        </PromptMeta>
                                        <FieldLabel>{summary}</FieldLabel>
                                        <FieldHint>{field.helpText || '클릭해서 상세 보기 및 수정'}</FieldHint>

                                        <FieldHint>
                                            {field.kind === 'list'
                                                ? '줄바꿈 기준 배열로 저장됩니다.'
                                                : field.kind === 'boolean'
                                                    ? 'boolean 값으로 저장됩니다.'
                                                    : field.kind === 'number'
                                                        ? 'number 값으로 저장됩니다.'
                                                        : '문자열 값으로 저장됩니다.'}
                                        </FieldHint>

                                        {isEmptyRuleValue(field.kind, currentValue) ? (
                                            <FieldHint>
                                                현재 화면 override 값이 비어 있습니다.
                                            </FieldHint>
                                        ) : null}
                                    </button>
                                )
                            })}
                        </div>

                        <PromptFooter>
                            <SecondaryTextButton type="button" onClick={() => handleRestoreGroup(group)}>
                                현재값으로 복원
                            </SecondaryTextButton>
                            <PrimaryButton
                                type="button"
                                onClick={() => handleSaveGroup(group)}
                                disabled={savingSettingScope === savingKey}
                            >
                                {savingSettingScope === savingKey ? '저장 중...' : '저장'}
                            </PrimaryButton>
                        </PromptFooter>
                    </SettingCard>
                )
            })}

            {activeEntry ? (
                <ModalBackdrop onClick={() => setActiveFieldKey('')}>
                    <ModalCard style={DETAIL_MODAL_STYLE} onClick={(e) => e.stopPropagation()}>
                        <ModalTitle>{activeEntry.field.label}</ModalTitle>
                        <ModalDescription>
                            {activeEntry.field.helpText || '이 항목의 값을 확인하고 수정합니다.'}
                        </ModalDescription>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
                            <PromptMeta>
                                <span>{activeEntry.scopedKey}</span>
                            </PromptMeta>

                            <FieldLabel>{activeEntry.field.label}</FieldLabel>

                            {renderFieldEditor({
                                field: activeEntry.field,
                                settingKey: activeEntry.scopedKey,
                                draftValue: activeEntry.draftValue,
                                onSettingDraftChange,
                            })}

                            <FieldHint>
                                {activeEntry.field.kind === 'list'
                                    ? '줄바꿈 한 줄이 배열 1개 값입니다.'
                                    : activeEntry.field.kind === 'boolean'
                                        ? 'true/false 중 하나를 선택합니다.'
                                        : activeEntry.field.kind === 'number'
                                            ? '숫자 값으로 저장됩니다.'
                                            : '문자열 그대로 저장됩니다.'}
                            </FieldHint>
                        </div>

                        <PromptFooter style={{ marginTop: '18px' }}>
                            <SecondaryTextButton type="button" onClick={() => setActiveFieldKey('')}>
                                닫기
                            </SecondaryTextButton>
                            <PrimaryButton
                                type="button"
                                onClick={async () => {
                                    await handleSaveGroup(activeEntry.group)
                                    setActiveFieldKey('')
                                }}
                                disabled={savingSettingScope === activeEntry.savingKey}
                            >
                                {savingSettingScope === activeEntry.savingKey ? '저장 중...' : '이 그룹 저장'}
                            </PrimaryButton>
                        </PromptFooter>
                    </ModalCard>
                </ModalBackdrop>
            ) : null}
        </div>
    )
}