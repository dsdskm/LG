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
    ToolRow,
    ToolLabel,
    ToolTitle,
    ToolDescription,
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
} from '../styles'

import { APP_TAB } from '../chatSettings.constants'
import { filterScreenGroupsByRoute, formatDateTime, getPromptDraft, getScreenTitle } from '../chatSettings.utils'

export const AppScreenSettingsTab = ({
    appKey,
    activeRouteKey,
    screenGroups,
    promptDrafts,
    guidanceDrafts,
    ragDrafts,
    toolDrafts,
    savingPromptKey,
    savingGuidanceKey,
    savingRagKey,
    savingToolKey,
    onPromptChange,
    onSavePrompt,
    onGuidanceChange,
    onSaveGuidance,
    onRagChange,
    onSaveRag,
    onToolChange,
    onSaveTool,
}) => {
    if (appKey !== APP_TAB.ROBOT) {
        return (
            <SettingCard>
                <CardHeader>
                    <CardTitle>{appKey} 설정</CardTitle>
                    <ComingSoonBadge>준비 중</ComingSoonBadge>
                </CardHeader>

                <PageDescription>{appKey} 앱의 화면별 설정은 아직 구성되지 않았습니다.</PageDescription>
            </SettingCard>
        )
    }

    const filteredGroups = filterScreenGroupsByRoute(screenGroups, activeRouteKey)

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            <SettingCard>
                <CardHeader>
                    <CardTitle>{activeRouteKey}</CardTitle>
                    <SmallBadge>화면별 설정</SmallBadge>
                </CardHeader>

                <PageDescription>
                    선택한 routeKey와 일치하는 화면 가이드 및 화면 액션 툴을 관리합니다.
                </PageDescription>
            </SettingCard>

            {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                    <ScreenSettingGroup
                        key={group.routeKey}
                        group={group}
                        promptDrafts={promptDrafts}
                        guidanceDrafts={guidanceDrafts}
                        ragDrafts={ragDrafts}
                        toolDrafts={toolDrafts}
                        savingPromptKey={savingPromptKey}
                        savingGuidanceKey={savingGuidanceKey}
                        savingRagKey={savingRagKey}
                        savingToolKey={savingToolKey}
                        onPromptChange={onPromptChange}
                        onSavePrompt={onSavePrompt}
                        onGuidanceChange={onGuidanceChange}
                        onSaveGuidance={onSaveGuidance}
                        onRagChange={onRagChange}
                        onSaveRag={onSaveRag}
                        onToolChange={onToolChange}
                        onSaveTool={onSaveTool}
                    />
                ))
            ) : (
                <SettingCard>
                    <CardHeader>
                        <CardTitle>등록된 설정 없음</CardTitle>
                    </CardHeader>

                    <PageDescription>
                        현재 선택한 routeKey에 등록된 화면 가이드 또는 화면 액션 툴이 없습니다.
                    </PageDescription>

                    <PageDescription>routeKey: {activeRouteKey || '-'}</PageDescription>
                </SettingCard>
            )}
        </div>
    )
}

const ScreenSettingGroup = ({
    group,
    promptDrafts,
    guidanceDrafts,
    ragDrafts,
    toolDrafts,
    savingPromptKey,
    savingGuidanceKey,
    savingRagKey,
    savingToolKey,
    onPromptChange,
    onSavePrompt,
    onGuidanceChange,
    onSaveGuidance,
    onRagChange,
    onSaveRag,
    onToolChange,
    onSaveTool,
}) => {
    const title = getScreenTitle(group)

    return (
        <SettingCard>
            <SectionTitleRow>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <SmallBadge>
                        가이드 {group.guidance.length}개 · 툴 {group.tools.length}개
                    </SmallBadge>
                </CardHeader>
            </SectionTitleRow>

            <PageDescription>routeKey: {group.routeKey}</PageDescription>

            <SectionGrid>
                <ScreenPromptList
                    prompts={group.prompts}
                    promptDrafts={promptDrafts}
                    savingPromptKey={savingPromptKey}
                    onPromptChange={onPromptChange}
                    onSavePrompt={onSavePrompt}
                />
                <ScreenGuidanceList
                    guidance={group.guidance}
                    guidanceDrafts={guidanceDrafts}
                    savingGuidanceKey={savingGuidanceKey}
                    onGuidanceChange={onGuidanceChange}
                    onSaveGuidance={onSaveGuidance}
                />
                <ScreenRagList
                    ragDocs={group.ragDocs}
                    ragDrafts={ragDrafts}
                    savingRagKey={savingRagKey}
                    onRagChange={onRagChange}
                    onSaveRag={onSaveRag}
                />
                <ScreenToolList
                    tools={group.tools}
                    toolDrafts={toolDrafts}
                    savingToolKey={savingToolKey}
                    onToolChange={onToolChange}
                    onSaveTool={onSaveTool}
                />
            </SectionGrid>
        </SettingCard>
    )
}

const ScreenPromptList = ({ prompts, promptDrafts, savingPromptKey, onPromptChange, onSavePrompt }) => {
    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <CardHeader>
                <CardTitle>화면 프롬프트</CardTitle>
                <ComingSoonBadge>{prompts.length}개</ComingSoonBadge>
            </CardHeader>

            <OptionList>
                {prompts.length > 0 ? (
                    prompts.map((item) => (
                        (() => {
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
                        })()
                    ))
                ) : (
                    <PageDescription>등록된 화면 프롬프트가 없습니다.</PageDescription>
                )}
            </OptionList>
        </div>
    )
}

const ScreenGuidanceList = ({ guidance, guidanceDrafts, savingGuidanceKey, onGuidanceChange, onSaveGuidance }) => {
    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <CardHeader>
                <CardTitle>화면 가이드</CardTitle>
                <ComingSoonBadge>{guidance.length}개</ComingSoonBadge>
            </CardHeader>

            <OptionList>
                {guidance.length > 0 ? (
                    guidance.map((item) => {
                        const draftKey = String(item.id)
                        const draft = guidanceDrafts[draftKey] ?? {
                            screenName: String(item.screenName ?? ''),
                            fallbackText: String(item.fallbackText ?? ''),
                            sectionsText: JSON.stringify(item.sections ?? [], null, 2),
                            examplesText: JSON.stringify(item.examples ?? [], null, 2),
                            enabled: item.enabled !== false,
                        }

                        return (
                            <PromptCard key={item.id}>
                                <PromptMeta>
                                    <span>{item.screenName || item.key}</span>
                                    <span>key: {item.key}</span>
                                    <span>updated: {formatDateTime(item.updatedAt)}</span>
                                </PromptMeta>

                                <PromptTextarea
                                    value={draft.screenName}
                                    onChange={(e) => onGuidanceChange(draftKey, 'screenName', e.target.value)}
                                    style={{ minHeight: '56px' }}
                                />
                                <FieldHint>가이드 응답에서 사용하는 화면 표시명입니다.</FieldHint>

                                <PromptTextarea
                                    value={draft.fallbackText}
                                    onChange={(e) => onGuidanceChange(draftKey, 'fallbackText', e.target.value)}
                                    style={{ minHeight: '100px' }}
                                />
                                <FieldHint>질문 매칭 실패 시 반환하는 기본 안내 문구입니다.</FieldHint>

                                <FieldLabel>sections (JSON)</FieldLabel>
                                <PromptTextarea
                                    value={draft.sectionsText}
                                    onChange={(e) => onGuidanceChange(draftKey, 'sectionsText', e.target.value)}
                                    style={{ minHeight: '140px' }}
                                />
                                <FieldHint>화면 섹션 분류 기준입니다. JSON 배열 형식이어야 합니다.</FieldHint>

                                <FieldLabel>examples (JSON)</FieldLabel>
                                <PromptTextarea
                                    value={draft.examplesText}
                                    onChange={(e) => onGuidanceChange(draftKey, 'examplesText', e.target.value)}
                                    style={{ minHeight: '140px' }}
                                />
                                <FieldHint>예시 질문/응답 매핑입니다. JSON 배열 형식이어야 합니다.</FieldHint>

                                <PromptFooter>
                                    <ToggleButton
                                        type="button"
                                        $active={draft.enabled}
                                        onClick={() => onGuidanceChange(draftKey, 'enabled', !draft.enabled)}
                                    >
                                        {draft.enabled ? '활성' : '비활성'}
                                    </ToggleButton>

                                    <PrimaryButton
                                        type="button"
                                        onClick={() => onSaveGuidance(item)}
                                        disabled={savingGuidanceKey === draftKey}
                                    >
                                        {savingGuidanceKey === draftKey ? '저장 중...' : '저장'}
                                    </PrimaryButton>
                                </PromptFooter>
                            </PromptCard>
                        )
                    })
                ) : (
                    <PageDescription>등록된 화면 가이드가 없습니다.</PageDescription>
                )}
            </OptionList>
        </div>
    )
}

const ScreenToolList = ({ tools, toolDrafts, savingToolKey, onToolChange, onSaveTool }) => {
    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <CardHeader>
                <CardTitle>화면 액션 툴</CardTitle>
                <ComingSoonBadge>{tools.length}개</ComingSoonBadge>
            </CardHeader>

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
                                    <FieldHint>연동 대상 API 이름/메서드/엔드포인트입니다.</FieldHint>
                                    <InlineFields>
                                        <TextInput value={draft.apiName} onChange={(e) => onToolChange(toolKey, 'apiName', e.target.value)} />
                                        <TextInput value={draft.method} onChange={(e) => onToolChange(toolKey, 'method', e.target.value)} />
                                        <TextInput value={draft.endpoint} onChange={(e) => onToolChange(toolKey, 'endpoint', e.target.value)} />
                                    </InlineFields>
                                </FieldGroup>

                                <FieldGroup>
                                    <FieldLabel>context_params (JSON)</FieldLabel>
                                    <FieldHint>화면 컨텍스트에서 참조할 파라미터 정의입니다.</FieldHint>
                                <PromptTextarea
                                    value={draft.contextParamsText}
                                    onChange={(e) => onToolChange(toolKey, 'contextParamsText', e.target.value)}
                                    style={{ minHeight: '120px' }}
                                />
                                </FieldGroup>

                                <FieldGroup>
                                    <FieldLabel>request_params (JSON)</FieldLabel>
                                    <FieldHint>사용자 입력에서 받을 요청 파라미터 정의입니다.</FieldHint>
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
                    <PageDescription>등록된 화면 액션 툴이 없습니다.</PageDescription>
                )}
            </OptionList>
        </div>
    )
}

const ScreenRagList = ({ ragDocs, ragDrafts, savingRagKey, onRagChange, onSaveRag }) => {
    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <CardHeader>
                <CardTitle>RAG 데이터</CardTitle>
                <ComingSoonBadge>{ragDocs.length}개</ComingSoonBadge>
            </CardHeader>

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
                            <PromptCard key={item.id}>
                                <PromptMeta>
                                    <span>{item.title || item.chunkKey}</span>
                                    <span>chunk: {item.chunkKey}</span>
                                    <span>routeKey: {item.routeKey || '-'}</span>
                                    <span>updated: {formatDateTime(item.updatedAt)}</span>
                                </PromptMeta>

                                <PromptTextarea
                                    value={draft.title}
                                    onChange={(e) => onRagChange(ragKey, 'title', e.target.value)}
                                    style={{ minHeight: '56px' }}
                                />
                                <FieldHint>RAG 검색 결과 카드에 표시될 제목입니다.</FieldHint>

                                <FieldLabel>keywords (JSON 배열)</FieldLabel>
                                <PromptTextarea
                                    value={draft.keywordsText}
                                    onChange={(e) => onRagChange(ragKey, 'keywordsText', e.target.value)}
                                    style={{ minHeight: '96px' }}
                                />
                                <FieldHint>검색 매칭 가중치에 사용하는 키워드 배열입니다.</FieldHint>

                                <FieldLabel>body</FieldLabel>
                                <PromptTextarea
                                    value={draft.body}
                                    onChange={(e) => onRagChange(ragKey, 'body', e.target.value)}
                                    style={{ minHeight: '180px' }}
                                />
                                <FieldHint>실제 답변 근거로 사용되는 본문입니다.</FieldHint>

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
                    <PageDescription>등록된 RAG 데이터가 없습니다.</PageDescription>
                )}
            </OptionList>
        </div>
    )
}