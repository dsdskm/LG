import { useEffect, useMemo, useState } from 'react'

import {
    SettingCard,
    CardHeader,
    CardTitle,
    SmallBadge,
    PageDescription,
    PromptTextarea,
    PromptFooter,
    PrimaryButton,
    SecondaryTextButton,
    FieldHint,
    FieldLabel,
    OptionList,
    OptionButton,
    ActiveBadge,
} from '../styles'

import {
    deleteChatRule,
    listChatRules,
    upsertChatRule,
} from '@repo/apis/ai/chatSettings.js'

const JSON_TEXTAREA_STYLE = {
    minHeight: '180px',
}

const EMPTY_FORM = {
    ruleKey: '',
    ruleType: 'taskflow-command',
    valueJson: '{\n  "type": "custom-rule"\n}',
    enabled: true,
    priority: 100,
}

const parseRuleValueJson = (raw, fallback = {}) => {
    const text = String(raw ?? '').trim()
    if (!text) return fallback

    try {
        const parsed = JSON.parse(text)
        return parsed && typeof parsed === 'object' ? parsed : fallback
    } catch {
        return fallback
    }
}

const formatRuleJson = (value) => {
    try {
        return JSON.stringify(value ?? {}, null, 2)
    } catch {
        return '{}'
    }
}

export const EventRuleDbEditorSection = ({
    scopeKey = 'robot/ailog/event',
    title = 'Front Rule Engine (화면별)',
    description,
    showHeader = true,
}) => {
    const resolvedScopeKey = String(scopeKey ?? '').trim() || 'robot/ailog/event'
    const appKey = useMemo(() => {
        const raw = String(resolvedScopeKey ?? '').trim()
        if (!raw || raw === 'common') return 'common'
        const first = raw.split('/')[0]
        return first || 'common'
    }, [resolvedScopeKey])

    const [rules, setRules] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [draft, setDraft] = useState(EMPTY_FORM)
    const [editingId, setEditingId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    const fetchRules = async () => {
        setLoading(true)
        setError('')

        try {
            console.info('[chat-settings][rule-list] request', {
                appKey,
                screenKey: resolvedScopeKey,
                endpoint: `${appKey}/${resolvedScopeKey}`,
            })

            const res = await listChatRules({ appKey, screenKey: resolvedScopeKey })
            const items = Array.isArray(res?.data?.items)
                ? res.data.items
                : Array.isArray(res?.items)
                    ? res.items
                    : []

            console.info('[chat-settings][rule-list] response', {
                appKey,
                screenKey: resolvedScopeKey,
                raw: res,
                count: items.length,
                items: items.map((row) => ({
                    id: row?.id,
                    appKey: row?.appKey ?? row?.app_key,
                    screenKey: row?.screenKey ?? row?.screen_key,
                    ruleType: row?.ruleType ?? row?.rule_type,
                    ruleKey: row?.ruleKey ?? row?.rule_key,
                    valueJson: row?.valueJson ?? row?.value_json,
                    enabled: row?.enabled,
                    priority: row?.priority,
                })),
            })

            setRules(items)
        } catch (e) {
            console.error('[chat-settings][rule-list] error', {
                appKey,
                screenKey: resolvedScopeKey,
                error: e,
            })
            setError(e?.message || '룰 목록을 불러오지 못했습니다.')
            setRules([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRules()
    }, [appKey, resolvedScopeKey])

    const handleDraftChange = (field, nextValue) => {
        setDraft((prev) => ({
            ...prev,
            [field]: nextValue,
        }))
    }

    const resetDraft = () => {
        setEditingId(null)
        setDraft({ ...EMPTY_FORM })
    }

    const handleSubmit = async () => {
        const trimmedKey = String(draft.ruleKey ?? '').trim()
        const trimmedType = String(draft.ruleType ?? '').trim() || 'taskflow-command'
        if (!trimmedKey) {
            setError('ruleKey는 필수입니다.')
            return
        }

        setSaving(true)
        setError('')

        try {
            const payload = {
                appKey,
                screenKey: resolvedScopeKey,
                ruleType: trimmedType,
                ruleKey: trimmedKey,
                valueJson: parseRuleValueJson(draft.valueJson, {}),
                enabled: Boolean(draft.enabled),
                priority: Number(draft.priority) || 100,
            }

            await upsertChatRule(payload)
            resetDraft()
            await fetchRules()
        } catch (e) {
            setError(e?.message || '룰 저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (row) => {
        setEditingId(Number(row?.id))
        setDraft({
            ruleKey: String(row?.ruleKey ?? ''),
            ruleType: String(row?.ruleType ?? 'taskflow-command'),
            valueJson: formatRuleJson(row?.valueJson ?? {}),
            enabled: row?.enabled !== false,
            priority: Number(row?.priority ?? 100),
        })
    }

    const handleDelete = async (row) => {
        const id = Number(row?.id)
        if (!Number.isFinite(id) || id <= 0) return

        setDeletingId(id)
        setError('')

        try {
            await deleteChatRule(id)
            if (editingId === id) resetDraft()
            await fetchRules()
        } catch (e) {
            setError(e?.message || '룰 삭제에 실패했습니다.')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <SettingCard>
            {showHeader ? (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <SmallBadge>screenKey: {resolvedScopeKey}</SmallBadge>
                </CardHeader>
            ) : null}

            <PageDescription>
                {description || '해당 상세 화면에 등록된 rule 테이블 값을 조회하고 추가/수정/삭제할 수 있습니다.'}
            </PageDescription>

            <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gap: '10px', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                    <FieldLabel>{editingId ? '기존 룰 수정' : '새 룰 추가'}</FieldLabel>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <FieldHint>ruleKey</FieldHint>
                            <input
                                value={draft.ruleKey}
                                onChange={(e) => handleDraftChange('ruleKey', e.target.value)}
                                placeholder='예: clear-all'
                                style={{ width: '100%', height: '34px', border: '1px solid #dbe3ef', borderRadius: '10px', padding: '0 10px' }}
                            />
                        </div>
                        <div>
                            <FieldHint>ruleType</FieldHint>
                            <input
                                value={draft.ruleType}
                                onChange={(e) => handleDraftChange('ruleType', e.target.value)}
                                placeholder='taskflow-command'
                                style={{ width: '100%', height: '34px', border: '1px solid #dbe3ef', borderRadius: '10px', padding: '0 10px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                        <div>
                            <FieldHint>priority</FieldHint>
                            <input
                                type='number'
                                value={draft.priority}
                                onChange={(e) => handleDraftChange('priority', e.target.value)}
                                style={{ width: '100%', height: '34px', border: '1px solid #dbe3ef', borderRadius: '10px', padding: '0 10px' }}
                            />
                        </div>
                        <div>
                            <FieldHint>enabled</FieldHint>
                            <OptionList>
                                {[
                                    { value: true, label: 'true' },
                                    { value: false, label: 'false' },
                                ].map((option) => {
                                    const active = Boolean(draft.enabled) === Boolean(option.value)
                                    return (
                                        <OptionButton
                                            key={`rule-enabled-${String(option.value)}`}
                                            type='button'
                                            $active={active}
                                            onClick={() => handleDraftChange('enabled', option.value)}
                                            style={{ minWidth: '70px' }}
                                        >
                                            <span>{option.label}</span>
                                            {active ? <ActiveBadge>선택</ActiveBadge> : null}
                                        </OptionButton>
                                    )
                                })}
                            </OptionList>
                        </div>
                    </div>

                    <div>
                        <FieldHint>value_json</FieldHint>
                        <PromptTextarea
                            value={draft.valueJson}
                            onChange={(e) => handleDraftChange('valueJson', e.target.value)}
                            placeholder='{"type":"custom-rule","aliases":["..."],"description":"..."}'
                            style={JSON_TEXTAREA_STYLE}
                        />
                    </div>

                    <PromptFooter>
                        {editingId ? (
                            <SecondaryTextButton type='button' onClick={resetDraft}>
                                취소
                            </SecondaryTextButton>
                        ) : null}
                        <PrimaryButton type='button' onClick={handleSubmit} disabled={saving}>
                            {saving ? '저장 중...' : editingId ? '수정 저장' : '추가'}
                        </PrimaryButton>
                    </PromptFooter>
                </div>

                {error ? <FieldHint style={{ color: '#b91c1c' }}>{error}</FieldHint> : null}

                <div style={{ display: 'grid', gap: '10px' }}>
                    <FieldHint>등록된 rule 목록 ({rules.length}개)</FieldHint>

                    {loading ? (
                        <PageDescription>룰을 불러오는 중입니다...</PageDescription>
                    ) : rules.length === 0 ? (
                        <PageDescription>현재 화면에 등록된 rule이 없습니다. (0개)</PageDescription>
                    ) : (
                        rules.map((row) => (
                            <div key={row.id ?? `${row.ruleKey}-${row.ruleType}`} style={{ display: 'grid', gap: '8px', padding: '12px 14px', border: '1px solid #dbe3ef', borderRadius: '12px', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{String(row.ruleKey ?? '-')}</div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <SmallBadge>{String(row.ruleType ?? 'taskflow-command')}</SmallBadge>
                                        <SmallBadge>{row.enabled === false ? '비활성' : '활성'}</SmallBadge>
                                        <SmallBadge>priority {Number(row.priority ?? 100)}</SmallBadge>
                                    </div>
                                </div>
                                <FieldHint>app: {String(row.appKey ?? appKey)} / screen: {String(row.screenKey ?? resolvedScopeKey)}</FieldHint>
                                <PromptTextarea value={formatRuleJson(row.valueJson ?? {})} readOnly style={{ ...JSON_TEXTAREA_STYLE, background: '#f8fafc' }} />
                                <PromptFooter>
                                    <SecondaryTextButton type='button' onClick={() => handleEdit(row)}>
                                        수정
                                    </SecondaryTextButton>
                                    <PrimaryButton type='button' onClick={() => handleDelete(row)} disabled={deletingId === Number(row.id)}>
                                        {deletingId === Number(row.id) ? '삭제 중...' : '삭제'}
                                    </PrimaryButton>
                                </PromptFooter>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </SettingCard>
    )
}
