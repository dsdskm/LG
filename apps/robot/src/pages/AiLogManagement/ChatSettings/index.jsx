import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createCommonChatScreenTool,
  createChatGuidance,
  createChatPrompt,
  createChatRagDoc,
  createChatScreenTool,
  getChatSettings,
  createCommonChatRagDoc,
  deleteChatScreenTool,
  deleteChatRagDoc,
  updateChatGuidance,
  updateChatPrompt,
  updateChatRagDoc,
  updateChatScreenTool,
  updateChatSettings,
  upsertCommonChatPrompt,
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

import { APP_TAB, EMPTY_MANAGEMENT } from './chatSettings.constants'
import {
  buildAppRouteTree,
  getFirstRouteKeyFromTree,
  groupScreenSettings,
  hasRouteKeyInTree,
  getPromptDraft,
} from './chatSettings.utils'
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
  const [activeRouteKey, setActiveRouteKey] = useState('')

  const [schema, setSchema] = useState([])
  const [values, setValues] = useState({})
  const [draftProvider, setDraftProvider] = useState('')

  const [management, setManagement] = useState(EMPTY_MANAGEMENT)
  const [commonPromptDraft, setCommonPromptDraft] = useState({
    label: '공통 프롬프트',
    content: '',
    enabled: true,
  })
  const [newCommonRagDraft, setNewCommonRagDraft] = useState({
    chunkKey: '',
    title: '공통 RAG',
    body: '',
    keywordsText: '[]',
    enabled: true,
  })
  const [promptDrafts, setPromptDrafts] = useState({})
  const [guidanceDrafts, setGuidanceDrafts] = useState({})
  const [ragDrafts, setRagDrafts] = useState({})
  const [toolDrafts, setToolDrafts] = useState({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [saving, setSaving] = useState(false)
  const [savingPromptKey, setSavingPromptKey] = useState('')
  const [creatingPromptRouteKey, setCreatingPromptRouteKey] = useState('')
  const [savingCommonPrompt, setSavingCommonPrompt] = useState(false)
  const [savingGuidanceKey, setSavingGuidanceKey] = useState('')
  const [creatingGuidanceRouteKey, setCreatingGuidanceRouteKey] = useState('')
  const [savingRagKey, setSavingRagKey] = useState('')
  const [savingCreateCommonRag, setSavingCreateCommonRag] = useState(false)
  const [savingCreateScreenRag, setSavingCreateScreenRag] = useState(false)
  const [savingCreateCommonTool, setSavingCreateCommonTool] = useState(false)
  const [savingCreateScreenTool, setSavingCreateScreenTool] = useState(false)
  const [deletingCommonRagKey, setDeletingCommonRagKey] = useState('')
  const [deletingToolKey, setDeletingToolKey] = useState('')
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
        actionTypes: Array.isArray(nextManagement.actionTypes) ? nextManagement.actionTypes : [],
        history: Array.isArray(nextManagement.history) ? nextManagement.history : [],
      }

      console.info('[chat-settings] management payload summary', {
        screens: normalizedManagement.screens.length,
        prompts: normalizedManagement.prompts.length,
        guidance: normalizedManagement.guidance.length,
        ragDocs: normalizedManagement.ragDocs.length,
        screenTools: normalizedManagement.screenTools.length,
        actionTypes: normalizedManagement.actionTypes.length,
      })

      setManagement(normalizedManagement)

      const nextCommonPrompt = normalizedManagement.prompts.find(
        (item) => String(item?.key ?? '') === 'common' && String(item?.promptType ?? item?.category ?? '').toLowerCase() === 'system'
      )
      setCommonPromptDraft({
        label: String(nextCommonPrompt?.label ?? '공통 프롬프트'),
        content: String(nextCommonPrompt?.content ?? ''),
        enabled: nextCommonPrompt?.enabled !== false,
      })

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
              examplesText: JSON.stringify(item.examples ?? [], null, 2),
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
              baseUrl: String(item.baseUrl ?? ''),
              requestHeadersText: JSON.stringify(item.requestHeaders ?? {}, null, 2),
              requestQueryText: JSON.stringify(item.requestQuery ?? {}, null, 2),
              requestBodyText: JSON.stringify(item.requestBody ?? {}, null, 2),
              contextParamsText: JSON.stringify(item.contextParams ?? [], null, 2),
              requestParamsText: JSON.stringify(item.requestParams ?? [], null, 2),
              staticPayloadText: JSON.stringify(item.staticPayload ?? {}, null, 2),
              path: String(item?.staticPayload?.path ?? item?.endpoint ?? ''),
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

  const commonPromptItem = useMemo(
    () =>
      management.prompts.find(
        (item) =>
          String(item?.key ?? '') === 'common' &&
          String(item?.promptType ?? item?.category ?? '').toLowerCase() === 'system'
      ) ?? null,
    [management.prompts]
  )

  const commonRagDocs = useMemo(
    () => management.ragDocs.filter((item) => String(item?.key ?? '') === 'common'),
    [management.ragDocs]
  )

  const commonTools = useMemo(
    () =>
      management.screenTools.filter(
        (item) =>
          String(item?.key ?? '') === 'common' &&
          String(item?.method ?? '').trim().toUpperCase() !== 'NAVIGATE'
      ),
    [management.screenTools]
  )

  const commonActionTypes = useMemo(
    () =>
      (management.actionTypes ?? []).filter(
        (item) => String(item?.method ?? '').trim().toUpperCase() !== 'NAVIGATE'
      ),
    [management.actionTypes]
  )

  const screenActionTypes = useMemo(
    () =>
      (management.actionTypes ?? []).filter(
        (item) => String(item?.method ?? '').trim().toUpperCase() !== 'NAVIGATE'
      ),
    [management.actionTypes]
  )

  const screenGroups = useMemo(
    () => groupScreenSettings(management.screens, management.prompts, management.guidance, management.ragDocs, management.screenTools),
    [management.guidance, management.prompts, management.ragDocs, management.screenTools, management.screens]
  )

  const appRouteTree = useMemo(
    () => buildAppRouteTree(management.screens, activeAppTab),
    [management.screens, activeAppTab]
  )

  useEffect(() => {
    if (activeAppTab === APP_TAB.COMMON || activeAppTab === APP_TAB.HISTORY) {
      if (activeRouteKey) setActiveRouteKey('')
      return
    }

    if (!hasRouteKeyInTree(appRouteTree, activeRouteKey)) {
      setActiveRouteKey(getFirstRouteKeyFromTree(appRouteTree))
    }
  }, [activeAppTab, appRouteTree, activeRouteKey])

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

  const handleCommonPromptChange = useCallback((field, nextValue) => {
    setCommonPromptDraft((prev) => ({
      ...prev,
      [field]: nextValue,
    }))
  }, [])

  const handleSaveCommonPrompt = useCallback(async () => {
    setSavingCommonPrompt(true)
    setError('')

    try {
      const res = await upsertCommonChatPrompt({
        label: String(commonPromptDraft.label ?? ''),
        content: String(commonPromptDraft.content ?? ''),
        enabled: Boolean(commonPromptDraft.enabled),
      })
      const next = res?.data ?? {}

      setCommonPromptDraft({
        label: String(next.label ?? commonPromptDraft.label ?? '공통 프롬프트'),
        content: String(next.content ?? commonPromptDraft.content ?? ''),
        enabled: next.enabled !== false,
      })
      setSavedMessage(`${String(next.label ?? '공통 프롬프트')}가 저장되었습니다.`)
      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || '공통 프롬프트 저장에 실패했습니다.')
    } finally {
      setSavingCommonPrompt(false)
    }
  }, [commonPromptDraft, load])

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

  const handleCreatePrompt = useCallback(async ({ appKey, routeKey, routeParentKey, content, label, promptType, enabled }) => {
    const normalizedRouteKey = String(routeKey ?? '').trim()
    if (!normalizedRouteKey) return false

    setCreatingPromptRouteKey(normalizedRouteKey)
    setError('')

    try {
      const res = await createChatPrompt({
        appKey: String(appKey ?? '').trim(),
        key: normalizedRouteKey,
        routeKey: String(routeParentKey ?? '').trim(),
        promptType: String(promptType ?? 'system').trim() || 'system',
        label: String(label ?? '화면 프롬프트').trim() || '화면 프롬프트',
        content: String(content ?? ''),
        enabled: Boolean(enabled),
      })

      if (Number(res?.code ?? 0) !== 200) {
        throw new Error(String(res?.message ?? '화면 프롬프트 생성 응답이 올바르지 않습니다.'))
      }

      const next = res?.data ?? {}
      setSavedMessage(`${String(next.label ?? next.key ?? '화면 프롬프트')}가 생성되었습니다.`)
      setSavedOpen(true)
      await load()
      return true
    } catch (e) {
      setError(e?.message || '화면 프롬프트 생성에 실패했습니다.')
      return false
    } finally {
      setCreatingPromptRouteKey('')
    }
  }, [load])

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
    async (item, overrideDraft) => {
      const draftKey = String(item.id)
      const draft = overrideDraft ?? guidanceDrafts[draftKey] ?? {}

      let examples = []
      try {
        examples = JSON.parse(String(draft.examplesText ?? '[]'))
      } catch {
        setError('guidance examples는 JSON 형식이어야 합니다.')
        return
      }

      setSavingGuidanceKey(draftKey)
      setError('')

      try {
        const res = await updateChatGuidance(item.id, {
          examples,
        })

        if (Number(res?.code ?? 0) !== 200) {
          throw new Error(String(res?.message ?? '가이드 저장 응답이 올바르지 않습니다.'))
        }

        setSavedMessage(`${item.screenName || item.key} 가이드가 저장되었습니다.`)
        setSavedOpen(true)
        await load()
        return true
      } catch (e) {
        setError(e?.message || '가이드 저장에 실패했습니다.')
        return false
      } finally {
        setSavingGuidanceKey('')
      }
    },
    [guidanceDrafts, load]
  )

  const handleCreateGuidance = useCallback(async ({ appKey, routeKey, routeParentKey, initialExamples }) => {
    const normalizedRouteKey = String(routeKey ?? '').trim()
    if (!normalizedRouteKey) return false

    setCreatingGuidanceRouteKey(normalizedRouteKey)
    setError('')

    try {
      const res = await createChatGuidance({
        appKey: String(appKey ?? '').trim(),
        key: normalizedRouteKey,
        routeKey: String(routeParentKey ?? '').trim(),
      })

      if (Number(res?.code ?? 0) !== 200) {
        throw new Error(String(res?.message ?? '화면 가이드 생성 응답이 올바르지 않습니다.'))
      }

      const next = res?.data ?? {}

      const examples = Array.isArray(initialExamples) ? initialExamples : []

      if (next?.id && examples.length > 0) {
        const updateRes = await updateChatGuidance(next.id, {
          examples,
        })

        if (Number(updateRes?.code ?? 0) !== 200) {
          throw new Error(String(updateRes?.message ?? '추천 메세지 저장 응답이 올바르지 않습니다.'))
        }
      }

      setSavedMessage(`${normalizedRouteKey} 추천 메세지 설정이 생성되었습니다.`)
      setSavedOpen(true)
      await load()
      return true
    } catch (e) {
      setError(e?.message || '화면 가이드 생성에 실패했습니다.')
      return false
    } finally {
      setCreatingGuidanceRouteKey('')
    }
  }, [load])

  const handleRagChange = useCallback((id, field, nextValue) => {
    setRagDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        [field]: nextValue,
      },
    }))
  }, [])

  const handleNewCommonRagChange = useCallback((field, nextValue) => {
    setNewCommonRagDraft((prev) => ({
      ...prev,
      [field]: nextValue,
    }))
  }, [])

  const handleCreateCommonRag = useCallback(async () => {
    let keywords = []
    try {
      keywords = JSON.parse(String(newCommonRagDraft.keywordsText ?? '[]'))
    } catch {
      setError('공통 RAG keywords는 JSON 배열 형식이어야 합니다.')
      return
    }

    if (!Array.isArray(keywords)) {
      setError('공통 RAG keywords는 JSON 배열 형식이어야 합니다.')
      return
    }

    const chunkKey = String(newCommonRagDraft.chunkKey ?? '').trim()
    if (!chunkKey) {
      setError('공통 RAG chunk key(목차 ID)는 필수입니다.')
      return
    }

    setSavingCreateCommonRag(true)
    setError('')

    try {
      const res = await createCommonChatRagDoc({
        chunkKey,
        title: String(newCommonRagDraft.title ?? ''),
        body: String(newCommonRagDraft.body ?? ''),
        keywords,
        enabled: Boolean(newCommonRagDraft.enabled),
      })
      const next = res?.data ?? {}

      setNewCommonRagDraft({
        chunkKey: '',
        title: '공통 RAG',
        body: '',
        keywordsText: '[]',
        enabled: true,
      })
      setSavedMessage(`${String(next.title ?? '공통 RAG')} 청크가 등록되었습니다.`)
      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || '공통 RAG 등록에 실패했습니다.')
    } finally {
      setSavingCreateCommonRag(false)
    }
  }, [newCommonRagDraft, load])

  const handleDeleteCommonRag = useCallback(async (item) => {
    const id = Number(item?.id)
    if (!Number.isFinite(id) || id <= 0) return

    const deletingKey = String(id)
    setDeletingCommonRagKey(deletingKey)
    setError('')

    try {
      await deleteChatRagDoc(id)
      setSavedMessage(`${String(item?.title ?? item?.chunkKey ?? '공통 RAG')} 청크가 삭제되었습니다.`)
      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || '공통 RAG 삭제에 실패했습니다.')
    } finally {
      setDeletingCommonRagKey('')
    }
  }, [load])

  const handleDeleteRag = useCallback(async (item) => {
    const id = Number(item?.id)
    if (!Number.isFinite(id) || id <= 0) return

    const deletingKey = String(id)
    setDeletingCommonRagKey(deletingKey)
    setError('')

    try {
      await deleteChatRagDoc(id)
      setSavedMessage(`${String(item?.title ?? item?.chunkKey ?? 'RAG')} 청크가 삭제되었습니다.`)
      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || 'RAG 삭제에 실패했습니다.')
    } finally {
      setDeletingCommonRagKey('')
    }
  }, [load])

  const handleCreateScreenRag = useCallback(async (draft) => {
    let keywords = []
    try {
      keywords = JSON.parse(String(draft?.keywordsText ?? '[]'))
    } catch {
      setError('화면 RAG keywords는 JSON 배열 형식이어야 합니다.')
      return false
    }

    if (!Array.isArray(keywords)) {
      setError('화면 RAG keywords는 JSON 배열 형식이어야 합니다.')
      return false
    }

    setSavingCreateScreenRag(true)
    setError('')

    try {
      const res = await createChatRagDoc({
        appKey: String(draft?.appKey ?? '').trim(),
        key: String(draft?.key ?? '').trim(),
        routeKey: String(draft?.routeKey ?? '').trim(),
        title: String(draft?.title ?? ''),
        body: String(draft?.body ?? ''),
        keywords,
        enabled: Boolean(draft?.enabled),
      })

      const next = res?.data ?? {}
      setSavedMessage(`${String(next.title ?? next.chunkKey ?? '화면 RAG')} 청크가 등록되었습니다.`)
      setSavedOpen(true)
      await load()
      return true
    } catch (e) {
      setError(e?.message || '화면 RAG 등록에 실패했습니다.')
      return false
    } finally {
      setSavingCreateScreenRag(false)
    }
  }, [load])

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
    async (item, overrideDraft) => {
      const draftKey = String(item.id)
      const draft = overrideDraft ?? toolDrafts[draftKey] ?? {}

      if (String(item?.key ?? '') === 'common') {
        const path = String(draft.path ?? draft.endpoint ?? '').trim().replace(/^\/+/, '')
        if (!path) {
          setError('공통 액션 경로(path)는 필수입니다.')
          return
        }

        setSavingToolKey(draftKey)
        setError('')

        try {
          await updateChatScreenTool(item.id, {
            enabled: Boolean(draft.enabled),
            displayName: String(draft.displayName ?? ''),
            description: null,
            apiName: String(item.apiName ?? ''),
            method: String(item.method ?? ''),
            endpoint: path,
            contextParams: [],
            requestParams: [],
            staticPayload: { path },
          })

          setSavedMessage(`${item.displayName || item.toolName} 공통 액션이 저장되었습니다.`)
          setSavedOpen(true)
          await load()
          return true
        } catch (e) {
          setError(e?.message || '공통 액션 저장에 실패했습니다.')
          return false
        } finally {
          setSavingToolKey('')
        }
        return false
      }

      let contextParams = []
      let requestParams = []
      let requestHeaders = {}
      let requestQuery = {}
      let requestBody = {}
      let staticPayload = {}
      try {
        contextParams = JSON.parse(String(draft.contextParamsText ?? '[]'))
        requestParams = JSON.parse(String(draft.requestParamsText ?? '[]'))
        requestHeaders = JSON.parse(String(draft.requestHeadersText ?? '{}'))
        requestQuery = JSON.parse(String(draft.requestQueryText ?? '{}'))
        requestBody = JSON.parse(String(draft.requestBodyText ?? '{}'))
        staticPayload = JSON.parse(String(draft.staticPayloadText ?? '{}'))
      } catch {
        setError('툴 JSON 필드(context/request/headers/query/body/staticPayload) 형식이 올바르지 않습니다.')
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
          baseUrl: String(draft.baseUrl ?? ''),
          requestHeaders,
          requestQuery,
          requestBody,
          contextParams,
          requestParams,
          staticPayload,
        })

        setSavedMessage(`${item.toolName} 툴 설정이 저장되었습니다.`)
        setSavedOpen(true)
        await load()
        return true
      } catch (e) {
        setError(e?.message || '툴 설정 저장에 실패했습니다.')
        return false
      } finally {
        setSavingToolKey('')
      }
    },
    [load, toolDrafts]
  )

  const handleCreateCommonTool = useCallback(async (overrideDraft) => {
    const draft = overrideDraft ?? {}

    const displayName = String(draft.displayName ?? '').trim()
    if (!displayName) {
      setError('공통 액션 표시명은 필수입니다.')
      return
    }

    const path = String(draft.path ?? '').trim().replace(/^\/+/, '')
    if (!path) {
      setError('공통 액션 경로(path)는 필수입니다.')
      return
    }

    const actionTypeKey = String(draft.actionTypeKey ?? '').trim()
    if (!actionTypeKey) {
      setError('액션 유형은 필수입니다.')
      return false
    }

    setSavingCreateCommonTool(true)
    setError('')

    try {
      const res = await createCommonChatScreenTool({
        actionTypeKey,
        displayName,
        path,
        enabled: Boolean(draft.enabled),
      })
      const next = res?.data ?? {}

      setSavedMessage(`${String(next.displayName ?? '공통 액션')}이 추가되었습니다.`)
      setSavedOpen(true)
      await load()
      return true
    } catch (e) {
      setError(e?.message || '공통 액션 추가에 실패했습니다.')
      return false
    } finally {
      setSavingCreateCommonTool(false)
    }
  }, [load])

  const handleDeleteTool = useCallback(async (item) => {
    const id = Number(item?.id)
    if (!Number.isFinite(id) || id <= 0) return

    const targetKey = String(id)
    setDeletingToolKey(targetKey)
    setError('')

    try {
      await deleteChatScreenTool(id)
      setSavedMessage(`${String(item?.displayName ?? item?.toolName ?? '공통 액션')}이 삭제되었습니다.`)
      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || '공통 액션 삭제에 실패했습니다.')
    } finally {
      setDeletingToolKey('')
    }
  }, [load])

  const handleCreateScreenTool = useCallback(async (draft) => {
    const appKey = String(draft?.appKey ?? '').trim()
    const key = String(draft?.key ?? '').trim()
    const displayName = String(draft?.displayName ?? '').trim()
    const toolName = String(draft?.toolName ?? '').trim()
    const actionTypeKey = String(draft?.actionTypeKey ?? '').trim()

    if (!appKey) {
      setError('앱 키(appKey)가 필요합니다.')
      return false
    }

    if (!key) {
      setError('화면 키(routeKey)가 필요합니다.')
      return false
    }

    if (!actionTypeKey) {
      setError('액션 유형은 필수입니다.')
      return false
    }

    if (!toolName) {
      setError('액션 키(tool_name)는 필수입니다.')
      return false
    }

    if (!displayName) {
      setError('표시명(display_name)은 필수입니다.')
      return false
    }

    let contextParams = []
    let requestParams = []
    let requestHeaders = {}
    let requestQuery = {}
    let requestBody = {}
    let staticPayload = {}

    try {
      contextParams = JSON.parse(String(draft?.contextParamsText ?? '[]'))
      requestParams = JSON.parse(String(draft?.requestParamsText ?? '[]'))
      requestHeaders = JSON.parse(String(draft?.requestHeadersText ?? '{}'))
      requestQuery = JSON.parse(String(draft?.requestQueryText ?? '{}'))
      requestBody = JSON.parse(String(draft?.requestBodyText ?? '{}'))
      staticPayload = JSON.parse(String(draft?.staticPayloadText ?? '{}'))
    } catch {
      setError('신규 화면 액션 JSON 필드(context/request/headers/query/body/staticPayload) 형식이 올바르지 않습니다.')
      return false
    }

    setSavingCreateScreenTool(true)
    setError('')

    try {
      const res = await createChatScreenTool({
        appKey,
        key,
        routeKey: String(draft?.routeKey ?? '').trim(),
        actionTypeKey,
        toolName,
        displayName,
        description: String(draft?.description ?? ''),
        endpoint: String(draft?.endpoint ?? ''),
        baseUrl: String(draft?.baseUrl ?? ''),
        requestHeaders,
        requestQuery,
        requestBody,
        contextParams,
        requestParams,
        staticPayload,
        enabled: Boolean(draft?.enabled),
      })

      const next = res?.data ?? {}
      setSavedMessage(`${String(next.displayName ?? next.toolName ?? '화면 액션')}이 추가되었습니다.`)
      setSavedOpen(true)
      await load()
      return true
    } catch (e) {
      setError(e?.message || '화면 액션 추가에 실패했습니다.')
      return false
    } finally {
      setSavingCreateScreenTool(false)
    }
  }, [load])

  const handleChangeAppTab = useCallback((nextApp) => {
    setActiveAppTab(nextApp)
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
              commonPromptItem={commonPromptItem}
              commonPromptDraft={commonPromptDraft}
              savingCommonPrompt={savingCommonPrompt}
              onCommonPromptChange={handleCommonPromptChange}
              onSaveCommonPrompt={handleSaveCommonPrompt}
              commonRagDocs={commonRagDocs}
              ragDrafts={ragDrafts}
              savingRagKey={savingRagKey}
              onRagChange={handleRagChange}
              onSaveRag={handleSaveRag}
              newCommonRagDraft={newCommonRagDraft}
              savingCreateCommonRag={savingCreateCommonRag}
              deletingCommonRagKey={deletingCommonRagKey}
              onNewCommonRagChange={handleNewCommonRagChange}
              onCreateCommonRag={handleCreateCommonRag}
              onDeleteCommonRag={handleDeleteCommonRag}
              commonTools={commonTools}
              actionTypes={commonActionTypes}
              savingToolKey={savingToolKey}
              savingCreateCommonTool={savingCreateCommonTool}
              deletingToolKey={deletingToolKey}
              onSaveTool={handleSaveTool}
              onCreateCommonTool={handleCreateCommonTool}
              onDeleteTool={handleDeleteTool}
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
              <AppSideTabs routeTree={appRouteTree} activeRouteKey={activeRouteKey} onChange={setActiveRouteKey} />

              <AppScreenSettingsTab
                appKey={activeAppTab}
                activeRouteKey={activeRouteKey}
                screenGroups={screenGroups}
                commonPromptItem={commonPromptItem}
                commonPromptDraft={commonPromptDraft}
                actionTypes={screenActionTypes}
                promptDrafts={promptDrafts}
                guidanceDrafts={guidanceDrafts}
                ragDrafts={ragDrafts}
                toolDrafts={toolDrafts}
                savingPromptKey={savingPromptKey}
                creatingPromptRouteKey={creatingPromptRouteKey}
                savingGuidanceKey={savingGuidanceKey}
                creatingGuidanceRouteKey={creatingGuidanceRouteKey}
                savingRagKey={savingRagKey}
                deletingRagKey={deletingCommonRagKey}
                savingCreateRag={savingCreateScreenRag}
                savingCreateTool={savingCreateScreenTool}
                savingToolKey={savingToolKey}
                onPromptChange={handlePromptChange}
                onSavePrompt={handleSavePrompt}
                onCreatePrompt={handleCreatePrompt}
                onGuidanceChange={handleGuidanceChange}
                onSaveGuidance={handleSaveGuidance}
                onCreateGuidance={handleCreateGuidance}
                onRagChange={handleRagChange}
                onSaveRag={handleSaveRag}
                onCreateRag={handleCreateScreenRag}
                onDeleteRag={handleDeleteRag}
                onToolChange={handleToolChange}
                onSaveTool={handleSaveTool}
                onCreateTool={handleCreateScreenTool}
                onDeleteTool={handleDeleteTool}
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