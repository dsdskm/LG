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
} from '../styles'

import { formatDateTime, getPromptDraft } from '../chatSettings.utils'

export const CommonSettingsTab = ({
    providerItem,
    values,
    draftProvider,
    setDraftProvider,
    isDirty,
    saving,
    onSaveProvider,
    groupedPrompts,
    management,
    commonRagDocs,
    commonTools,
    promptDrafts,
    ragDrafts,
    toolDrafts,
    savingPromptKey,
    savingRagKey,
    savingToolKey,
    onPromptChange,
    onSavePrompt,
    onRagChange,
    onSaveRag,
    onToolChange,
    onSaveTool,
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

            <CommonRagManagementCard
                ragDocs={commonRagDocs}
                ragDrafts={ragDrafts}
                savingRagKey={savingRagKey}
                onRagChange={onRagChange}
                onSaveRag={onSaveRag}
            />

            <CommonToolManagementCard
                tools={commonTools}
                toolDrafts={toolDrafts}
                savingToolKey={savingToolKey}
                onToolChange={onToolChange}
                onSaveTool={onSaveTool}
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

const CommonRagManagementCard = ({ ragDocs, ragDrafts, savingRagKey, onRagChange, onSaveRag }) => {
    return (
        <SettingCard>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>공통 RAG 데이터</CardTitle>
                    <SmallBadge>{ragDocs.length}개</SmallBadge>
                </CardHeader>
            </SectionTitleRow>

            <PageDescription>
                각 화면에서 답을 찾지 못할 때 함께 참조되는 공통 지식 문서입니다.
            </PageDescription>

            <OptionList>
                {ragDocs.length > 0 ? (
                    ragDocs.map((item) => {
                        const ragKey = String(item.id)
                        const draft = ragDrafts[ragKey] ?? {
                            title: String(item.title ?? ''),
                            body: String(item.body ?? ''),
                            keywordsText: JSON.stringify(item.keywords ?? [], null, 2),
                            enabled: item.enabled !== false,
                        }

                        return (
                            <PromptCard key={ragKey}>
                                <PromptMeta>
                                    <span>{item.title || item.chunkKey}</span>
                                    <span>chunk: {item.chunkKey}</span>
                                    <span>updated: {formatDateTime(item.updatedAt)}</span>
                                </PromptMeta>

                                <PromptTextarea
                                    value={draft.title}
                                    onChange={(e) => onRagChange(ragKey, 'title', e.target.value)}
                                    style={{ minHeight: '56px' }}
                                />
                                <FieldHint>검색 결과 카드에 표시할 제목입니다.</FieldHint>

                                <FieldLabel>keywords (JSON 배열)</FieldLabel>
                                <PromptTextarea
                                    value={draft.keywordsText}
                                    onChange={(e) => onRagChange(ragKey, 'keywordsText', e.target.value)}
                                    style={{ minHeight: '96px' }}
                                />
                                <FieldHint>공통 검색 매칭에 사용하는 키워드 배열입니다.</FieldHint>

                                <FieldLabel>body</FieldLabel>
                                <PromptTextarea
                                    value={draft.body}
                                    onChange={(e) => onRagChange(ragKey, 'body', e.target.value)}
                                    style={{ minHeight: '180px' }}
                                />
                                <FieldHint>실제 답변 근거로 사용하는 공통 본문입니다.</FieldHint>

                                <PromptFooter>
                                    <ToggleButton
                                        type="button"
                                        $active={draft.enabled}
                                        onClick={() => onRagChange(ragKey, 'enabled', !draft.enabled)}
                                    >
                                        {draft.enabled ? '활성' : '비활성'}
                                    </ToggleButton>

                                    <PrimaryButton
                                        type="button"
                                        onClick={() => onSaveRag(item)}
                                        disabled={savingRagKey === ragKey}
                                    >
                                        {savingRagKey === ragKey ? '저장 중...' : '저장'}
                                    </PrimaryButton>
                                </PromptFooter>
                            </PromptCard>
                        )
                    })
                ) : (
                    <PageDescription>등록된 공통 RAG 데이터가 없습니다.</PageDescription>
                )}
            </OptionList>
        </SettingCard>
    )
}

const CommonToolManagementCard = ({ tools, toolDrafts, savingToolKey, onToolChange, onSaveTool }) => {
    return (
        <SettingCard>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>공통 액션</CardTitle>
                    <SmallBadge>{tools.length}개</SmallBadge>
                </CardHeader>
            </SectionTitleRow>

            <PageDescription>
                화면별 액션으로 처리하지 못할 때 공통으로 사용할 액션입니다. 현재는 화면 이동 액션을 여기서 관리합니다.
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
                                    <span>kind: {item.kind}</span>
                                    <span>updated: {formatDateTime(item.updatedAt)}</span>
                                </PromptMeta>

                                <FieldLabel>표시명 (display_name)</FieldLabel>
                                <PromptTextarea
                                    value={draft.displayName}
                                    onChange={(e) => onToolChange(toolKey, 'displayName', e.target.value)}
                                    style={{ minHeight: '56px' }}
                                />
                                <FieldHint>AI Assistant 설정 화면에 노출되는 공통 액션 이름입니다.</FieldHint>

                                <FieldLabel>설명 (description)</FieldLabel>
                                <PromptTextarea
                                    value={draft.description}
                                    onChange={(e) => onToolChange(toolKey, 'description', e.target.value)}
                                    style={{ minHeight: '96px' }}
                                />
                                <FieldHint>언제 이 공통 액션을 사용해야 하는지 설명합니다.</FieldHint>

                                <FieldLabel>API 정보</FieldLabel>
                                <PromptTextarea
                                    value={[draft.apiName, draft.method, draft.endpoint].filter(Boolean).join(' | ')}
                                    onChange={(e) => {
                                        const [apiName = '', method = '', endpoint = ''] = String(e.target.value).split('|').map((v) => v.trim())
                                        onToolChange(toolKey, 'apiName', apiName)
                                        onToolChange(toolKey, 'method', method)
                                        onToolChange(toolKey, 'endpoint', endpoint)
                                    }}
                                    style={{ minHeight: '56px' }}
                                />
                                <FieldHint>`apiName | method | endpoint` 형식으로 관리합니다.</FieldHint>

                                <FieldLabel>context_params (JSON)</FieldLabel>
                                <PromptTextarea
                                    value={draft.contextParamsText}
                                    onChange={(e) => onToolChange(toolKey, 'contextParamsText', e.target.value)}
                                    style={{ minHeight: '120px' }}
                                />

                                <FieldLabel>request_params (JSON)</FieldLabel>
                                <PromptTextarea
                                    value={draft.requestParamsText}
                                    onChange={(e) => onToolChange(toolKey, 'requestParamsText', e.target.value)}
                                    style={{ minHeight: '120px' }}
                                />

                                <FieldLabel>static_payload (JSON)</FieldLabel>
                                <PromptTextarea
                                    value={draft.staticPayloadText}
                                    onChange={(e) => onToolChange(toolKey, 'staticPayloadText', e.target.value)}
                                    style={{ minHeight: '120px' }}
                                />

                                <PromptFooter>
                                    <ToggleButton
                                        type="button"
                                        $active={draft.enabled}
                                        onClick={() => onToolChange(toolKey, 'enabled', !draft.enabled)}
                                    >
                                        {draft.enabled ? '활성' : '비활성'}
                                    </ToggleButton>

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
                    <PageDescription>등록된 공통 액션이 없습니다.</PageDescription>
                )}
            </OptionList>
        </SettingCard>
    )
}