import { useEffect, useMemo, useState } from 'react'

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
    SmallBadge,
} from '../styles'

import { formatDateTime } from '../chatSettings.utils'

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
    commonRagDocs,
    ragDrafts,
    savingRagKey,
    onRagChange,
    onSaveRag,
    newCommonRagDraft,
    savingCreateCommonRag,
    deletingCommonRagKey,
    onNewCommonRagChange,
    onCreateCommonRag,
    onDeleteCommonRag,
    commonTools,
    toolDrafts,
    savingToolKey,
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
                newCommonRagDraft={newCommonRagDraft}
                savingCreateCommonRag={savingCreateCommonRag}
                deletingCommonRagKey={deletingCommonRagKey}
                onNewCommonRagChange={onNewCommonRagChange}
                onCreateCommonRag={onCreateCommonRag}
                onDeleteCommonRag={onDeleteCommonRag}
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
    newCommonRagDraft,
    savingCreateCommonRag,
    deletingCommonRagKey,
    onNewCommonRagChange,
    onCreateCommonRag,
    onDeleteCommonRag,
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

    useEffect(() => {
        if (sortedRagDocs.length === 0) {
            if (activeRagKey) setActiveRagKey('')
            return
        }

        const exists = sortedRagDocs.some((item) => String(item.id) === activeRagKey)
        if (!exists) {
            setActiveRagKey(String(sortedRagDocs[0].id))
        }
    }, [sortedRagDocs, activeRagKey])

    const activeRagDoc = sortedRagDocs.find((item) => String(item.id) === activeRagKey) ?? null
    const activeRagDraft = activeRagDoc
        ? ragDrafts[activeRagKey] ?? {
            title: String(activeRagDoc.title ?? ''),
            body: String(activeRagDoc.body ?? ''),
            keywordsText: JSON.stringify(activeRagDoc.keywords ?? [], null, 2),
            enabled: activeRagDoc.enabled !== false,
        }
        : null

    return (
        <SettingCard>
            <CardHeader>
                <CardTitle>공통 RAG 데이터</CardTitle>
                <SmallBadge>{sortedRagDocs.length}개 청크</SmallBadge>
            </CardHeader>

            <PageDescription>
                공통 RAG는 단일 문서가 아니라 목차/단락 단위 청크 목록으로 관리하는 것이 권장됩니다.
            </PageDescription>

            {sortedRagDocs.length > 0 ? (
                <>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <strong style={{ fontSize: '13px', color: '#334155' }}>탭 구성</strong>
                            <PrimaryButton
                                type="button"
                                onClick={() => setCreatingOpen((prev) => !prev)}
                                disabled={savingCreateCommonRag}
                                style={{ height: '36px' }}
                            >
                                {creatingOpen ? '등록 닫기' : '+ RAG 추가'}
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
                                        <span style={{ fontSize: '12px' }}>chunk: {item.chunkKey}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {creatingOpen ? (
                        <PromptCard>
                            <PromptMeta>
                                <span>새 공통 RAG 청크 추가</span>
                            </PromptMeta>

                            <FieldLabel>chunk key (목차/단락 ID)</FieldLabel>
                            <PromptTextarea
                                value={newCommonRagDraft.chunkKey}
                                onChange={(e) => onNewCommonRagChange('chunkKey', e.target.value)}
                                style={{ minHeight: '56px' }}
                            />
                            <FieldHint>예: site-overview, menu-navigation, ailog-guide 처럼 의미가 드러나는 키를 사용하세요.</FieldHint>

                            <FieldLabel>제목</FieldLabel>
                            <PromptTextarea
                                value={newCommonRagDraft.title}
                                onChange={(e) => onNewCommonRagChange('title', e.target.value)}
                                style={{ minHeight: '56px' }}
                            />

                            <FieldLabel>keywords (JSON 배열)</FieldLabel>
                            <PromptTextarea
                                value={newCommonRagDraft.keywordsText}
                                onChange={(e) => onNewCommonRagChange('keywordsText', e.target.value)}
                                style={{ minHeight: '96px' }}
                            />

                            <FieldLabel>body</FieldLabel>
                            <PromptTextarea
                                value={newCommonRagDraft.body}
                                onChange={(e) => onNewCommonRagChange('body', e.target.value)}
                                style={{ minHeight: '160px' }}
                            />

                            <PromptFooter>
                                <ToggleButton
                                    type="button"
                                    $active={Boolean(newCommonRagDraft.enabled)}
                                    onClick={() => onNewCommonRagChange('enabled', !newCommonRagDraft.enabled)}
                                >
                                    {newCommonRagDraft.enabled ? '활성' : '비활성'}
                                </ToggleButton>

                                <PrimaryButton type="button" onClick={onCreateCommonRag} disabled={savingCreateCommonRag}>
                                    {savingCreateCommonRag ? '등록 중...' : '청크 등록'}
                                </PrimaryButton>
                            </PromptFooter>
                        </PromptCard>
                    ) : null}

                    {activeRagDoc && activeRagDraft ? (
                        <PromptCard>
                            <PromptMeta>
                                <span>{activeRagDoc.title || activeRagDoc.chunkKey}</span>
                                <span>key: common</span>
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
                            <FieldHint>동의어/사용자 표현까지 넣어야 조회 정확도가 올라갑니다.</FieldHint>

                            <FieldLabel>body</FieldLabel>
                            <PromptTextarea
                                value={activeRagDraft.body}
                                onChange={(e) => onRagChange(activeRagKey, 'body', e.target.value)}
                                style={{ minHeight: '180px' }}
                            />
                            <FieldHint>한 청크는 한 주제만 다루는 것이 좋습니다(목차/단락 단위).</FieldHint>

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
                            onClick={() => setCreatingOpen((prev) => !prev)}
                            disabled={savingCreateCommonRag}
                            style={{ height: '36px' }}
                        >
                            {creatingOpen ? '등록 닫기' : '+ RAG 추가'}
                        </PrimaryButton>
                    </div>
                    {creatingOpen ? (
                        <PromptCard>
                            <FieldLabel>chunk key (목차/단락 ID)</FieldLabel>
                            <PromptTextarea
                                value={newCommonRagDraft.chunkKey}
                                onChange={(e) => onNewCommonRagChange('chunkKey', e.target.value)}
                                style={{ minHeight: '56px' }}
                            />

                            <FieldLabel>제목</FieldLabel>
                            <PromptTextarea
                                value={newCommonRagDraft.title}
                                onChange={(e) => onNewCommonRagChange('title', e.target.value)}
                                style={{ minHeight: '56px' }}
                            />

                            <FieldLabel>keywords (JSON 배열)</FieldLabel>
                            <PromptTextarea
                                value={newCommonRagDraft.keywordsText}
                                onChange={(e) => onNewCommonRagChange('keywordsText', e.target.value)}
                                style={{ minHeight: '96px' }}
                            />

                            <FieldLabel>body</FieldLabel>
                            <PromptTextarea
                                value={newCommonRagDraft.body}
                                onChange={(e) => onNewCommonRagChange('body', e.target.value)}
                                style={{ minHeight: '160px' }}
                            />

                            <PromptFooter>
                                <ToggleButton
                                    type="button"
                                    $active={Boolean(newCommonRagDraft.enabled)}
                                    onClick={() => onNewCommonRagChange('enabled', !newCommonRagDraft.enabled)}
                                >
                                    {newCommonRagDraft.enabled ? '활성' : '비활성'}
                                </ToggleButton>
                                <PrimaryButton type="button" onClick={onCreateCommonRag} disabled={savingCreateCommonRag}>
                                    {savingCreateCommonRag ? '등록 중...' : '청크 등록'}
                                </PrimaryButton>
                            </PromptFooter>
                        </PromptCard>
                    ) : (
                        <PageDescription>등록된 공통 RAG 청크가 없습니다. 우측의 + RAG 추가 버튼으로 등록해 주세요.</PageDescription>
                    )}
                </>
            )}
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