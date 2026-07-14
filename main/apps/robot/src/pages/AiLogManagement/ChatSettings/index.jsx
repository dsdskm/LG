import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getChatSettings,
  updateChatGuidance,
  updateChatPrompt,
  updateChatRagDoc,
  updateChatScreenTool,
  updateChatSettings,
} from '@repo/apis/ai/chatSettings.js'

import {
  PageRoot,
  HeaderRow,
  PageTitle,
  PageDescription,
  LoadingBox,
  ErrorBox,
  PrimaryButton,
  ModalBackdrop,
  ModalCard,
  ModalTitle,
  ModalDescription,
  ModalActions,
} from './styles'

import { APP_TAB, EMPTY_MANAGEMENT, ROBOT_ROUTE } from './chatSettings.constants'
import { groupPrompts, groupScreenSettings, getPromptDraft } from './chatSettings.utils'
import { TopTabs } from './components/TopTabs'
import { AppSideTabs } from './components/AppSideTabs'
import { CommonSettingsTab } from './sections/CommonSettingsTab'
import { AppScreenSettingsTab } from './sections/AppScreenSettingsTab'
import { HistoryTab } from './sections/HistoryTab'

/**
 * AI 챗봇(ai_chat_service) 설정 페이지.
 * AI Assistant 패널의 설정(⚙) 아이콘에서 진입한다.
 *
 * 구조:
 * - 상단 탭: 공통 / robot / ota / cms / tms
 * - 앱 탭 내부: 좌측 상세 화면 탭
 * - robot/ailog 하위는 event, stats, func, action, prompt, assignees, report 로 한 뎁스 더 분류
 */
const ChatSettings = () => {
  const [activeAppTab, setActiveAppTab] = useState(APP_TAB.COMMON)
  const [activeRouteKey, setActiveRouteKey] = useState(ROBOT_ROUTE.DASHBOARD)

  const [schema, setSchema] = useState([])
  const [values, setValues] = useState({})
  const [draftProvider, setDraftProvider] = useState('')

  const [management, setManagement] = useState(EMPTY_MANAGEMENT)
  const [promptDrafts, setPromptDrafts] = useState({})
  const [guidanceDrafts, setGuidanceDrafts] = useState({})
  const [ragDrafts, setRagDrafts] = useState({})
  const [toolDrafts, setToolDrafts] = useState({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [saving, setSaving] = useState(false)
  const [savingPromptKey, setSavingPromptKey] = useState('')
  const [savingGuidanceKey, setSavingGuidanceKey] = useState('')
  const [savingRagKey, setSavingRagKey] = useState('')
  const [savingToolKey, setSavingToolKey] = useState('')

  const [savedOpen, setSavedOpen] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const res = await getChatSettings()
      const data = res?.data ?? {}

      setSchema(Array.isArray(data.schema) ? data.schema : [])
      setValues(data.values ?? {})
      setDraftProvider(String(data.values?.llmProvider ?? 'azure'))

      const nextManagement = data.management ?? EMPTY_MANAGEMENT

      const normalizedManagement = {
        screens: Array.isArray(nextManagement.screens) ? nextManagement.screens : [],
        prompts: Array.isArray(nextManagement.prompts) ? nextManagement.prompts : [],
        guidance: Array.isArray(nextManagement.guidance) ? nextManagement.guidance : [],
        ragDocs: Array.isArray(nextManagement.ragDocs) ? nextManagement.ragDocs : [],
        screenTools: Array.isArray(nextManagement.screenTools) ? nextManagement.screenTools : [],
        history: Array.isArray(nextManagement.history) ? nextManagement.history : [],
      }

      setManagement(normalizedManagement)

      setPromptDrafts(
        Object.fromEntries(
          normalizedManagement.prompts.map((item) => [
            String(item.id),
            {
              id: item.id,
              content: String(item.content ?? ''),
              enabled: item.enabled !== false,
            },
          ])
        )
      )

      setGuidanceDrafts(
        Object.fromEntries(
          normalizedManagement.guidance.map((item) => [
            String(item.id),
            {
              id: item.id,
              screenName: String(item.screenName ?? ''),
              fallbackText: String(item.fallbackText ?? ''),
              sectionsText: JSON.stringify(item.sections ?? [], null, 2),
              examplesText: JSON.stringify(item.examples ?? [], null, 2),
              enabled: item.enabled !== false,
            },
          ])
        )
      )

      setRagDrafts(
        Object.fromEntries(
          normalizedManagement.ragDocs.map((item) => [
            String(item.id),
            {
              id: item.id,
              title: String(item.title ?? ''),
              body: String(item.body ?? ''),
              keywordsText: JSON.stringify(item.keywords ?? [], null, 2),
              enabled: item.enabled !== false,
            },
          ])
        )
      )

      setToolDrafts(
        Object.fromEntries(
          normalizedManagement.screenTools.map((item) => [
            String(item.id),
            {
              id: item.id,
              enabled: item.enabled !== false,
              displayName: String(item.displayName ?? ''),
              description: String(item.description ?? ''),
              apiName: String(item.apiName ?? ''),
              method: String(item.method ?? ''),
              endpoint: String(item.endpoint ?? ''),
              contextParamsText: JSON.stringify(item.contextParams ?? [], null, 2),
              requestParamsText: JSON.stringify(item.requestParams ?? [], null, 2),
              staticPayloadText: JSON.stringify(item.staticPayload ?? {}, null, 2),
            },
          ])
        )
      )
    } catch (e) {
      setError(e?.message || '설정을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const providerItem = useMemo(() => schema.find((s) => s.key === 'llmProvider'), [schema])

  const commonPrompts = useMemo(
    () =>
      management.prompts.filter(
        (item) =>
          String(item?.key ?? '') === 'common' &&
          String(item?.promptType ?? item?.category ?? '').toLowerCase() !== 'fallback'
      ),
    [management.prompts]
  )

  const groupedPrompts = useMemo(() => groupPrompts(commonPrompts), [commonPrompts])

  const commonRagDocs = useMemo(
    () => management.ragDocs.filter((item) => String(item?.key ?? '') === 'common'),
    [management.ragDocs]
  )

  const commonTools = useMemo(
    () => management.screenTools.filter((item) => String(item?.key ?? '') === 'common'),
    [management.screenTools]
  )

  const screenGroups = useMemo(
    () => groupScreenSettings(management.screens, management.prompts, management.guidance, management.ragDocs, management.screenTools),
    [management.guidance, management.prompts, management.ragDocs, management.screenTools, management.screens]
  )

  const isDirty = Boolean(draftProvider) && draftProvider !== values.llmProvider

  const handleSaveProvider = useCallback(async () => {
    if (!isDirty || saving) return

    setSaving(true)
    setError('')

    try {
      const res = await updateChatSettings({ llmProvider: draftProvider })
      const next = res?.data?.values ?? {}

      setValues(next)
      setDraftProvider(String(next.llmProvider ?? draftProvider))
      setSavedMessage('LLM Provider 설정이 적용되었습니다.')
      setSavedOpen(true)
    } catch (e) {
      setError(e?.message || '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [draftProvider, isDirty, saving])

  const handlePromptChange = useCallback((key, field, nextValue) => {
    setPromptDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {}),
        [field]: nextValue, // 기존 field 내용을 유지하거나 새로 덮어씁니다.
      },
    }))
  }, [])


  const handleSavePrompt = useCallback(
    async (item) => {
      const draft = getPromptDraft(promptDrafts, item)
      const draftKey = String(item.id)

      setSavingPromptKey(draftKey)
      setError('')

      try {
        await updateChatPrompt(item.id, {
          content: draft.content,
          enabled: draft.enabled,
        })

        setSavedMessage(`${item.label || item.key} 프롬프트가 저장되었습니다.`)
        setSavedOpen(true)
        await load()
      } catch (e) {
        setError(e?.message || '프롬프트 저장에 실패했습니다.')
      } finally {
        setSavingPromptKey('')
      }
    },
    [load, promptDrafts]
  )

  const handleGuidanceChange = useCallback((id, field, nextValue) => {
    setGuidanceDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        [field]: nextValue,
      },
    }))
  }, [])

  const handleSaveGuidance = useCallback(
    async (item) => {
      const draftKey = String(item.id)
      const draft = guidanceDrafts[draftKey] ?? {}

      let sections = []
      let examples = []
      try {
        sections = JSON.parse(String(draft.sectionsText ?? '[]'))
        examples = JSON.parse(String(draft.examplesText ?? '[]'))
      } catch {
        setError('guidance sections/examples는 JSON 형식이어야 합니다.')
        return
      }

      setSavingGuidanceKey(draftKey)
      setError('')

      try {
        await updateChatGuidance(item.id, {
          screenName: String(draft.screenName ?? ''),
          fallbackText: String(draft.fallbackText ?? ''),
          sections,
          examples,
          enabled: Boolean(draft.enabled),
        })

        setSavedMessage(`${item.screenName || item.key} 가이드가 저장되었습니다.`)
        setSavedOpen(true)
        await load()
      } catch (e) {
        setError(e?.message || '가이드 저장에 실패했습니다.')
      } finally {
        setSavingGuidanceKey('')
      }
    },
    [guidanceDrafts, load]
  )

  const handleRagChange = useCallback((id, field, nextValue) => {
    setRagDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        [field]: nextValue,
      },
    }))
  }, [])

  const handleSaveRag = useCallback(
    async (item) => {
      const draftKey = String(item.id)
      const draft = ragDrafts[draftKey] ?? {}

      let keywords = []
      try {
        keywords = JSON.parse(String(draft.keywordsText ?? '[]'))
      } catch {
        setError('RAG keywords는 JSON 배열 형식이어야 합니다.')
        return
      }

      if (!Array.isArray(keywords)) {
        setError('RAG keywords는 JSON 배열 형식이어야 합니다.')
        return
      }

      setSavingRagKey(draftKey)
      setError('')

      try {
        await updateChatRagDoc(item.id, {
          title: String(draft.title ?? ''),
          body: String(draft.body ?? ''),
          keywords,
          enabled: Boolean(draft.enabled),
        })

        setSavedMessage(`${item.title || item.chunkKey} RAG 문서가 저장되었습니다.`)
        setSavedOpen(true)
        await load()
      } catch (e) {
        setError(e?.message || 'RAG 저장에 실패했습니다.')
      } finally {
        setSavingRagKey('')
      }
    },
    [load, ragDrafts]
  )

  const handleToolChange = useCallback((id, field, nextValue) => {
    setToolDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        [field]: nextValue,
      },
    }))
  }, [])

  const handleSaveTool = useCallback(
    async (item) => {
      const draftKey = String(item.id)
      const draft = toolDrafts[draftKey] ?? {}

      let contextParams = []
      let requestParams = []
      let staticPayload = {}
      try {
        contextParams = JSON.parse(String(draft.contextParamsText ?? '[]'))
        requestParams = JSON.parse(String(draft.requestParamsText ?? '[]'))
        staticPayload = JSON.parse(String(draft.staticPayloadText ?? '{}'))
      } catch {
        setError('툴 JSON 필드(context/request/staticPayload) 형식이 올바르지 않습니다.')
        return
      }

      setSavingToolKey(draftKey)
      setError('')

      try {
        await updateChatScreenTool(item.id, {
          enabled: Boolean(draft.enabled),
          displayName: String(draft.displayName ?? ''),
          description: String(draft.description ?? ''),
          apiName: String(draft.apiName ?? ''),
          method: String(draft.method ?? ''),
          endpoint: String(draft.endpoint ?? ''),
          contextParams,
          requestParams,
          staticPayload,
        })

        setSavedMessage(`${item.toolName} 툴 설정이 저장되었습니다.`)
        setSavedOpen(true)
        await load()
      } catch (e) {
        setError(e?.message || '툴 설정 저장에 실패했습니다.')
      } finally {
        setSavingToolKey('')
      }
    },
    [load, toolDrafts]
  )

  const handleChangeAppTab = useCallback((nextApp) => {
    setActiveAppTab(nextApp)

    if (nextApp === APP_TAB.ROBOT) {
      setActiveRouteKey(ROBOT_ROUTE.DASHBOARD)
      return
    }

    setActiveRouteKey('')
  }, [])

  return (
    <PageRoot>
      <HeaderRow>
        <PageTitle>AI Assistant 설정</PageTitle>
        <PageDescription>
          챗봇 동작에 필요한 설정을 관리합니다. 변경 사항은 저장 즉시 이후 대화부터 반영됩니다.
        </PageDescription>
      </HeaderRow>

      {loading ? (
        <LoadingBox>설정을 불러오는 중...</LoadingBox>
      ) : (
        <>
          {error ? <ErrorBox>{error}</ErrorBox> : null}

          <TopTabs activeAppTab={activeAppTab} onChange={handleChangeAppTab} />

          {activeAppTab === APP_TAB.COMMON ? (
            <CommonSettingsTab
              providerItem={providerItem}
              values={values}
              draftProvider={draftProvider}
              setDraftProvider={setDraftProvider}
              isDirty={isDirty}
              saving={saving}
              onSaveProvider={handleSaveProvider}
              groupedPrompts={groupedPrompts}
              management={management}
              commonRagDocs={commonRagDocs}
              commonTools={commonTools}
              promptDrafts={promptDrafts}
              ragDrafts={ragDrafts}
              toolDrafts={toolDrafts}
              savingPromptKey={savingPromptKey}
              savingRagKey={savingRagKey}
              savingToolKey={savingToolKey}
              onPromptChange={handlePromptChange}
              onSavePrompt={handleSavePrompt}
              onRagChange={handleRagChange}
              onSaveRag={handleSaveRag}
              onToolChange={handleToolChange}
              onSaveTool={handleSaveTool}
            />
          ) : null}

          {activeAppTab === APP_TAB.HISTORY ? (
            <HistoryTab history={management.history} />
          ) : null}

          {activeAppTab !== APP_TAB.COMMON && activeAppTab !== APP_TAB.HISTORY ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '260px minmax(0, 1fr)',
                gap: '20px',
                alignItems: 'start',
              }}
            >
              <AppSideTabs appKey={activeAppTab} activeRouteKey={activeRouteKey} onChange={setActiveRouteKey} />

              <AppScreenSettingsTab
                appKey={activeAppTab}
                activeRouteKey={activeRouteKey}
                screenGroups={screenGroups}
                promptDrafts={promptDrafts}
                guidanceDrafts={guidanceDrafts}
                ragDrafts={ragDrafts}
                toolDrafts={toolDrafts}
                savingPromptKey={savingPromptKey}
                savingGuidanceKey={savingGuidanceKey}
                savingRagKey={savingRagKey}
                savingToolKey={savingToolKey}
                onPromptChange={handlePromptChange}
                onSavePrompt={handleSavePrompt}
                onGuidanceChange={handleGuidanceChange}
                onSaveGuidance={handleSaveGuidance}
                onRagChange={handleRagChange}
                onSaveRag={handleSaveRag}
                onToolChange={handleToolChange}
                onSaveTool={handleSaveTool}
              />
            </div>
          ) : null}
        </>
      )}

      {savedOpen ? (
        <ModalBackdrop onClick={() => setSavedOpen(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>저장되었습니다</ModalTitle>
            <ModalDescription>{savedMessage || '설정이 적용되었습니다. 이후 대화부터 반영됩니다.'}</ModalDescription>
            <ModalActions>
              <PrimaryButton type="button" onClick={() => setSavedOpen(false)}>
                확인
              </PrimaryButton>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      ) : null}
    </PageRoot>
  )
}

export default ChatSettings