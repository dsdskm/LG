import {
    SettingCard,
    CardHeader,
    CardTitle,
    ComingSoonBadge,
    OptionList,
    OptionButton,
    ActiveBadge,
    ActionRow,
    PrimaryButton,
    ManagementGrid,
    SectionTitleRow,
    SmallBadge,
    PromptCard,
    PromptMeta,
    PromptTextarea,
    PromptFooter,
    SecondaryTextButton,
    ToggleButton,
    PageDescription,
    FieldLabel,
    FieldHint,
    TextInput,
} from '../styles'

import { formatDateTime, getPromptDraft } from '../chatSettings.utils'

const SETTING_HELP_TEXT = {
    temperature: 'LLM 응답 다양성 수준입니다. 높을수록 답변이 더 다양해집니다.',
    maxTokens: '응답 최대 길이 제한입니다. 값이 크면 응답이 길어질 수 있습니다.',
    ragTopK: 'RAG에서 참조할 문서 청크 개수입니다.',
    systemPrompt: '모든 요청에 공통으로 적용될 시스템 지침입니다.',
    historyTurns: '멀티턴 처리 시 참조할 과거 대화 턴 수입니다.',
    greeting: '초기 인사 응답에 사용할 기본 문구입니다.',
}

const isLongTextSetting = (key, type) => {
    if (type === 'textarea') return true
    return ['systemPrompt', 'greeting'].includes(String(key))
}

const renderSettingInput = ({ item, value, onChange }) => {
    const type = String(item?.type || 'text')
    const key = String(item?.key || '')

    if (type === 'number') {
        return (
            <TextInput
                type="number"
                step="any"
                value={value}
                onChange={onChange}
            />
        )
    }

    if (isLongTextSetting(key, type)) {
        return (
            <PromptTextarea
                value={value}
                onChange={onChange}
                style={{ minHeight: '84px' }}
            />
        )
    }

    return <TextInput type="text" value={value} onChange={onChange} />
}

export const CommonSettingsTab = ({
    providerItem,
    values,
    draftProvider,
    setDraftProvider,
    isDirty,
    saving,
    onSaveProvider,
    futureItems,
    settingDrafts,
    savingSettingKey,
    onSettingChange,
    onSaveSetting,
    groupedPrompts,
    management,
    promptDrafts,
    savingPromptKey,
    onPromptChange,
    onSavePrompt,
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

            <PromptManagementCard
                groupedPrompts={groupedPrompts}
                management={management}
                promptDrafts={promptDrafts}
                savingPromptKey={savingPromptKey}
                onPromptChange={onPromptChange}
                onSavePrompt={onSavePrompt}
            />

            <FutureSettingsCard
                futureItems={futureItems}
                settingDrafts={settingDrafts}
                savingSettingKey={savingSettingKey}
                onSettingChange={onSettingChange}
                onSaveSetting={onSaveSetting}
            />
        </ManagementGrid>
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
    groupedPrompts,
    management,
    promptDrafts,
    savingPromptKey,
    onPromptChange,
    onSavePrompt,
}) => {
    return (
        <SettingCard>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>프롬프트 관리</CardTitle>
                    <SmallBadge>{management.prompts.length}개</SmallBadge>
                </CardHeader>
            </SectionTitleRow>

            <PageDescription>DB에 저장된 프롬프트 문구를 여기서 바로 수정할 수 있습니다.</PageDescription>

            <OptionList>
                {groupedPrompts.length > 0 ? (
                    groupedPrompts.map((group) => (
                        <div key={group.category} style={{ display: 'grid', gap: '12px' }}>
                            <CardHeader>
                                <CardTitle>{group.category}</CardTitle>
                                <ComingSoonBadge>{group.items.length}개</ComingSoonBadge>
                            </CardHeader>

                            {group.items.map((item) => {
                                const draft = getPromptDraft(promptDrafts, item)
                                const promptKey = String(item.id)
                                const promptDisplayKey = String(item.key)

                                return (
                                    <PromptCard key={promptKey}>
                                        <PromptMeta>
                                            <span>{item.label || promptDisplayKey}</span>
                                            {item.routeKey ? <span>routeKey: {item.routeKey}</span> : null}
                                            <span>key: {promptDisplayKey}</span>
                                            <span>type: {item.promptType || item.category}</span>
                                            <span>updated: {formatDateTime(item.updatedAt)}</span>
                                        </PromptMeta>

                                        <PromptTextarea
                                            value={draft.content}
                                            onChange={(e) => onPromptChange(promptKey, 'content', e.target.value)}
                                        />

                                        <PromptFooter>
                                            <ToggleButton
                                                type="button"
                                                $active={draft.enabled}
                                                onClick={() => onPromptChange(promptKey, 'enabled', !draft.enabled)}
                                            >
                                                {draft.enabled ? '활성' : '비활성'}
                                            </ToggleButton>

                                            <SecondaryTextButton
                                                type="button"
                                                onClick={() => onPromptChange(promptKey, 'content', String(item.content ?? ''))}
                                            >
                                                원본 복원
                                            </SecondaryTextButton>

                                            <PrimaryButton
                                                type="button"
                                                onClick={() => onSavePrompt(item)}
                                                disabled={savingPromptKey === promptKey}
                                            >
                                                {savingPromptKey === promptKey ? '저장 중...' : '저장'}
                                            </PrimaryButton>
                                        </PromptFooter>
                                    </PromptCard>
                                )
                            })}
                        </div>
                    ))
                ) : (
                    <PageDescription>등록된 프롬프트가 없습니다.</PageDescription>
                )}
            </OptionList>
        </SettingCard>
    )
}

const FutureSettingsCard = ({
    futureItems,
    settingDrafts,
    savingSettingKey,
    onSettingChange,
    onSaveSetting,
}) => {
    if (futureItems.length <= 0) return null

    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>추가 설정</CardTitle>
                <ComingSoonBadge>수정 가능</ComingSoonBadge>
            </CardHeader>

            <PageDescription>스키마에 등록된 모든 설정 값을 수정할 수 있습니다.</PageDescription>

            <OptionList
                style={{
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    alignItems: 'stretch',
                    gap: '12px',
                }}
            >
                {futureItems.map((item) => (
                    <PromptCard
                        key={item.key}
                        style={{
                            height: '100%',
                            alignContent: 'start',
                        }}
                    >
                        <PromptMeta>
                            <span>{item.label}</span>
                            <span>key: {item.key}</span>
                            <span>type: {item.type || 'text'}</span>
                        </PromptMeta>

                        {renderSettingInput({
                            item,
                            value: String(settingDrafts[item.key] ?? ''),
                            onChange: (e) => onSettingChange(item.key, e.target.value),
                        })}

                        <FieldHint>{SETTING_HELP_TEXT[item.key] || '이 설정은 서비스 동작 파라미터로 사용됩니다.'}</FieldHint>

                        <PromptFooter>
                            <PrimaryButton
                                type="button"
                                onClick={() => onSaveSetting(item)}
                                disabled={savingSettingKey === item.key}
                            >
                                {savingSettingKey === item.key ? '저장 중...' : '저장'}
                            </PrimaryButton>
                        </PromptFooter>
                    </PromptCard>
                ))}
            </OptionList>
        </SettingCard>
    )
}