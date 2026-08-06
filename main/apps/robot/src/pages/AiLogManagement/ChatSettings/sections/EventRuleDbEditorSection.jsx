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
} from '../styles'

const JSON_TEXTAREA_STYLE = {
    minHeight: '180px',
}

const buildSettingKeys = (scopeKey) => ({
    ruleRows: `eventRules.${scopeKey}`,
    periodAliases: `eventFilterAliases.${scopeKey}.period`,
    severityAliases: `eventFilterAliases.${scopeKey}.severity`,
    statusAliases: `eventFilterAliases.${scopeKey}.status`,
})

const toDraftText = (value) => {
    try {
        return JSON.stringify(value ?? [], null, 2)
    } catch {
        return '[]'
    }
}

const parseJsonArray = (raw, label) => {
    try {
        const parsed = JSON.parse(String(raw ?? '[]'))
        if (!Array.isArray(parsed)) {
            throw new Error(`${label}는 배열(JSON Array)이어야 합니다.`)
        }
        return parsed
    } catch (e) {
        throw new Error(`${label} JSON 형식이 올바르지 않습니다: ${String(e?.message ?? e)}`)
    }
}

export const EventRuleDbEditorSection = ({
    scopeKey = 'robot/ailog/event',
    title = 'Front Rule Engine (화면별)',
    description,
    showHeader = true,
    values,
    settingDrafts,
    savingSettingScope,
    onSettingDraftChange,
    onSaveSettingGroup,
}) => {
    const currentValues = values && typeof values === 'object' ? values : {}
    const drafts = settingDrafts && typeof settingDrafts === 'object' ? settingDrafts : {}

    const resolvedScopeKey = String(scopeKey ?? '').trim() || 'robot/ailog/event'
    const keys = buildSettingKeys(resolvedScopeKey)

    const currentRuleRows = currentValues?.[keys.ruleRows] ?? []
    const currentPeriodAliases = currentValues?.[keys.periodAliases] ?? []
    const currentSeverityAliases = currentValues?.[keys.severityAliases] ?? []
    const currentStatusAliases = currentValues?.[keys.statusAliases] ?? []

    const draftRuleRows = drafts?.[keys.ruleRows] ?? toDraftText(currentRuleRows)
    const draftPeriodAliases = drafts?.[keys.periodAliases] ?? toDraftText(currentPeriodAliases)
    const draftSeverityAliases = drafts?.[keys.severityAliases] ?? toDraftText(currentSeverityAliases)
    const draftStatusAliases = drafts?.[keys.statusAliases] ?? toDraftText(currentStatusAliases)

    const saveKey = `event-rule-db.${resolvedScopeKey}`

    const handleRestore = () => {
        onSettingDraftChange(keys.ruleRows, toDraftText(currentRuleRows))
        onSettingDraftChange(keys.periodAliases, toDraftText(currentPeriodAliases))
        onSettingDraftChange(keys.severityAliases, toDraftText(currentSeverityAliases))
        onSettingDraftChange(keys.statusAliases, toDraftText(currentStatusAliases))
    }

    const handleSave = async () => {
        const settings = [
            {
                key: keys.ruleRows,
                value: parseJsonArray(draftRuleRows, 'eventRules'),
            },
            {
                key: keys.periodAliases,
                value: parseJsonArray(draftPeriodAliases, 'eventFilterAliases.period'),
            },
            {
                key: keys.severityAliases,
                value: parseJsonArray(draftSeverityAliases, 'eventFilterAliases.severity'),
            },
            {
                key: keys.statusAliases,
                value: parseJsonArray(draftStatusAliases, 'eventFilterAliases.status'),
            },
        ]

        await onSaveSettingGroup(
            saveKey,
            settings,
            `Front rule 설정이 저장되었습니다. (${resolvedScopeKey})`,
        )
    }

    return (
        <SettingCard>
            {showHeader ? (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <SmallBadge>route: {resolvedScopeKey}</SmallBadge>
                </CardHeader>
            ) : null}

            <PageDescription>
                {description || '모든 메시지를 앞단 룰로 처리합니다. intent 분기, info chunk 연결, action tool 실행을 JSON 룰로 관리합니다.'}
            </PageDescription>

            <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                    <FieldHint>eventRules.{resolvedScopeKey}</FieldHint>
                    <FieldHint>최소 필드만 입력해도 됩니다: ruleKey, patternRegex, filtersTemplate</FieldHint>
                    <PromptTextarea
                        value={draftRuleRows}
                        onChange={(e) => onSettingDraftChange(keys.ruleRows, e.target.value)}
                        placeholder='[{ "ruleKey": "default", "patternRegex": ".+", "filtersTemplate": {"intent":"action", "toolName":"query_events", "toolArgs":{"period":"today"}} }]'
                        style={JSON_TEXTAREA_STYLE}
                    />
                </div>

                <div>
                    <FieldHint>eventFilterAliases.{resolvedScopeKey}.period</FieldHint>
                    <PromptTextarea
                        value={draftPeriodAliases}
                        onChange={(e) => onSettingDraftChange(keys.periodAliases, e.target.value)}
                        placeholder='[{ "sourcePattern": "오늘", "normalizedValue": "today" }]'
                        style={JSON_TEXTAREA_STYLE}
                    />
                </div>

                <div>
                    <FieldHint>eventFilterAliases.{resolvedScopeKey}.severity</FieldHint>
                    <PromptTextarea
                        value={draftSeverityAliases}
                        onChange={(e) => onSettingDraftChange(keys.severityAliases, e.target.value)}
                        placeholder='[{ "sourcePattern": "치명", "normalizedValue": "critical" }]'
                        style={JSON_TEXTAREA_STYLE}
                    />
                </div>

                <div>
                    <FieldHint>eventFilterAliases.{resolvedScopeKey}.status</FieldHint>
                    <PromptTextarea
                        value={draftStatusAliases}
                        onChange={(e) => onSettingDraftChange(keys.statusAliases, e.target.value)}
                        placeholder='[{ "sourcePattern": "분석완료", "normalizedValue": "analyzed" }]'
                        style={JSON_TEXTAREA_STYLE}
                    />
                </div>
            </div>

            <PromptFooter>
                <SecondaryTextButton type='button' onClick={handleRestore}>
                    현재값으로 복원
                </SecondaryTextButton>
                <PrimaryButton
                    type='button'
                    onClick={handleSave}
                    disabled={savingSettingScope === saveKey}
                >
                    {savingSettingScope === saveKey ? '저장 중...' : '저장'}
                </PrimaryButton>
            </PromptFooter>
        </SettingCard>
    )
}
