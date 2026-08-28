import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createChatGuidance,
  getChatHistory,
  getGuidanceList,
  getRagList,
  listAllChatRules,
  listPrompts,
  createChatPrompt,
  createChatRagDoc,
  getChatSettings,
  createCommonChatRagDoc,
  deleteChatRagDoc,
  updateChatGuidance,
  updateChatPrompt,
  updateChatRagDoc,
  updateChatSettings,
  upsertCommonChatPrompt,
} from '@repo/apis/ai/chatSettings'

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
import { AppScopeSettingsCard, AppScreenSettingsTab } from './sections/AppScreenSettingsTab'
import { HistoryTab } from './sections/HistoryTab'
import { DatabaseTableSettingsTab } from './sections/DatabaseTableSettingsTab'

const normalizeKeywordArray = (value) => {
  const rows = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []

  const normalized = rows
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)

  return Array.from(new Set(normalized))
}

const parseKeywordsFallback = (value) => {
  if (Array.isArray(value)) return normalizeKeywordArray(value)

  try {
    const parsed = JSON.parse(String(value ?? '[]'))
    return Array.isArray(parsed) ? normalizeKeywordArray(parsed) : []
  } catch {
    return []
  }
}

const normalizeRagIntentType = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'info' || normalized === 'action' || normalized === 'both') return normalized
  return 'both'
}

const isCommonScopeRecord = (item) => {
  const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
  const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? '').trim().toLowerCase()
  const legacyKey = String(item?.key ?? '').trim().toLowerCase()

  return (
    (appKey === 'common' && (screenKey === 'common' || screenKey === 'common_info' || screenKey === 'common_action')) ||
    legacyKey === 'common'
  )
}

const normalizeCommonRagIntentType = (item) => {
  const intentType = normalizeRagIntentType(item?.intentType)
  if (!isCommonScopeRecord(item) || intentType !== 'both') return intentType

  const hint = `${String(item?.title ?? '')} ${String(item?.chunkKey ?? '')}`.toLowerCase()
  if (hint.includes('action') || hint.includes('액션')) return 'action'
  if (hint.includes('info') || hint.includes('정보')) return 'info'

  return 'both'
}

const normalizeImageAttachMode = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'always' || normalized === 'never' || normalized === 'auto') return normalized
  return 'auto'
}

const UNIFIED_MODAL_STYLE = {
  width: 'min(760px, 100%)',
  height: 'auto',
  minHeight: 'auto',
  maxHeight: '72vh',
  overflowY: 'auto',
}

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
  const [draftFinalFallbackText, setDraftFinalFallbackText] = useState('')
  const [draftRagContextTopK, setDraftRagContextTopK] = useState('3')
  const [draftRagContextMaxCharsPerChunk, setDraftRagContextMaxCharsPerChunk] = useState('700')
  const [savingFinalFallbackText, setSavingFinalFallbackText] = useState(false)
  const [savingRagContextLimits, setSavingRagContextLimits] = useState(false)

  const [management, setManagement] = useState(EMPTY_MANAGEMENT)
  const [settingDrafts, setSettingDrafts] = useState({})
  const [commonPromptDraft, setCommonPromptDraft] = useState({
    label: '공통 프롬프트',
    content: '',
    enabled: true,
  })
  const [commonIntentPromptDraft, setCommonIntentPromptDraft] = useState({
    label: '공통 인텐트 분류 프롬프트',
    content: '',
    enabled: true,
  })
  const [commonRagPromptDraft, setCommonRagPromptDraft] = useState({
    label: '공통 RAG 프롬프트',
    content: '',
    enabled: true,
  })
  const [commonInputHintPromptDraft, setCommonInputHintPromptDraft] = useState({
    label: '공통 입력 힌트',
    examples: [],
    enabled: true,
  })
  const [newCommonInfoRagDraft, setNewCommonInfoRagDraft] = useState({
    title: '공통 info RAG',
    body: '',
    imageUrl: '',
    imageAttachMode: 'auto',
    keywords: [],
    enabled: true,
  })
  const [newCommonActionRagDraft, setNewCommonActionRagDraft] = useState({
    title: '공통 action RAG',
    body: '',
    imageUrl: '',
    imageAttachMode: 'auto',
    keywords: [],
    enabled: true,
  })
  const [promptDrafts, setPromptDrafts] = useState({})
  const [guidanceDrafts, setGuidanceDrafts] = useState({})
  const [ragDrafts, setRagDrafts] = useState({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  })

  const [saving, setSaving] = useState(false)
  const [savingSettingScope, setSavingSettingScope] = useState('')
  const [savingPromptKey, setSavingPromptKey] = useState('')
  const [creatingPromptRouteKey, setCreatingPromptRouteKey] = useState('')
  const [savingCommonPrompt, setSavingCommonPrompt] = useState(false)
  const [savingCommonIntentPrompt, setSavingCommonIntentPrompt] = useState(false)
  const [savingCommonRagPrompt, setSavingCommonRagPrompt] = useState(false)
  const [savingCommonInputHintPrompt, setSavingCommonInputHintPrompt] = useState(false)
  const [savingGuidanceKey, setSavingGuidanceKey] = useState('')
  const [creatingGuidanceRouteKey, setCreatingGuidanceRouteKey] = useState('')
  const [savingRagKey, setSavingRagKey] = useState('')
  const [savingCreateCommonInfoRag, setSavingCreateCommonInfoRag] = useState(false)
  const [savingCreateCommonActionRag, setSavingCreateCommonActionRag] = useState(false)
  const [savingCreateScreenRag, setSavingCreateScreenRag] = useState(false)
  const [deletingCommonRagKey, setDeletingCommonRagKey] = useState('')

  const [savedOpen, setSavedOpen] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  const loadHistoryPage = useCallback(async (page = 1, pageSize = 20) => {
    setHistoryLoading(true)
    try {
      const res = await getChatHistory({ page, pageSize })
      const data = res?.data ?? {}
      const items = Array.isArray(data?.items) ? data.items : []
      const pagination = data?.pagination && typeof data.pagination === 'object' ? data.pagination : {}
      const itemIds = items
        .map((item) => Number(item?.id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0)

      console.info('[chat-settings][history:list]', {
        request: { page, pageSize },
        response: {
          page: Number(pagination.page ?? page) || 1,
          pageSize: Number(pagination.pageSize ?? pageSize) || pageSize,
          total: Number(pagination.total ?? 0) || 0,
          totalPages: Math.max(1, Number(pagination.totalPages ?? 1) || 1),
          hasNext: Boolean(pagination.hasNext),
          hasPrev: Boolean(pagination.hasPrev),
          returned: items.length,
        },
        ids: itemIds,
        items,
      })

      setManagement((prev) => ({
        ...prev,
        history: items,
      }))
      setHistoryPagination({
        page: Number(pagination.page ?? page) || 1,
        pageSize: Number(pagination.pageSize ?? pageSize) || pageSize,
        total: Number(pagination.total ?? 0) || 0,
        totalPages: Math.max(1, Number(pagination.totalPages ?? 1) || 1),
        hasNext: Boolean(pagination.hasNext),
        hasPrev: Boolean(pagination.hasPrev),
      })
    } catch (error) {
      console.warn('[chat-settings][history:list] failed', {
        request: { page, pageSize },
        error,
      })
      setManagement((prev) => ({
        ...prev,
        history: [],
      }))
      setHistoryPagination((prev) => ({
        ...prev,
        page,
        pageSize,
      }))
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [settingsRes, guidanceRes, promptRes, ragRes, ruleRes] = await Promise.all([
        getChatSettings(),
        getGuidanceList(),
        listPrompts(),
        getRagList(),
        listAllChatRules(),
      ])
      const data = settingsRes?.data ?? {}
      const guidanceItems = Array.isArray(guidanceRes?.data?.items)
        ? guidanceRes.data.items
        : Array.isArray(guidanceRes?.items)
          ? guidanceRes.items
          : []
      const promptItemsFromList = Array.isArray(promptRes?.data?.items)
        ? promptRes.data.items
        : Array.isArray(promptRes?.items)
          ? promptRes.items
          : []
      const ragItemsFromList = Array.isArray(ragRes?.data?.items)
        ? ragRes.data.items
        : Array.isArray(ragRes?.items)
          ? ragRes.items
          : []
      const ruleItems = Array.isArray(ruleRes?.data?.items)
        ? ruleRes.data.items
        : Array.isArray(ruleRes?.items)
          ? ruleRes.items
          : []

      console.info('[chat-settings] common prompt listPrompts result', {
        promptItemsFromList,
      })
      console.info('[chat-settings] common rag getRagList result', {
        appKey: 'common',
        screenKey: 'common',
        ragItemsFromList,
      })

      setSchema(Array.isArray(data.schema) ? data.schema : [])
      setValues(data.values ?? {})
      setSettingDrafts({})
      setDraftProvider(String(data.values?.llmProvider ?? 'azure'))
      setDraftFinalFallbackText(String(data.values?.finalFallbackText ?? ''))
      setDraftRagContextTopK(String(data.values?.ragContextTopK ?? 3))
      setDraftRagContextMaxCharsPerChunk(String(data.values?.ragContextMaxCharsPerChunk ?? 700))

      const nextManagement = data.management ?? EMPTY_MANAGEMENT

      const normalizedManagement = {
        screens: Array.isArray(nextManagement.screens) ? nextManagement.screens : [],
        prompts: promptItemsFromList.length > 0 ? promptItemsFromList : Array.isArray(nextManagement.prompts) ? nextManagement.prompts : [],
        guidance: guidanceItems,
        ragDocs: ragItemsFromList.length > 0 ? ragItemsFromList : Array.isArray(nextManagement.ragDocs) ? nextManagement.ragDocs : [],
        rules: ruleItems,
        history: Array.isArray(nextManagement.history) ? nextManagement.history : [],
      }

      console.info('[chat-settings] management payload summary', {
        screens: normalizedManagement.screens.length,
        prompts: normalizedManagement.prompts.length,
        guidance: normalizedManagement.guidance.length,
        ragDocs: normalizedManagement.ragDocs.length,
        rules: normalizedManagement.rules.length,
      })

      setManagement(normalizedManagement)

      console.info('[chat-settings][management-loaded]', {
        promptCount: normalizedManagement.prompts.length,
        screenCount: normalizedManagement.screens.length,
        activeAppTab,
        promptRows: normalizedManagement.prompts.slice(0, 12).map((item) => ({
          id: item?.id,
          appKey: item?.appKey ?? item?.app_key,
          screenKey: item?.screenKey ?? item?.screen_key ?? item?.key,
          routeKey: item?.routeKey ?? item?.route_key,
          type: item?.type ?? item?.promptType ?? item?.category,
          contentLength: String(item?.content ?? item?.prompt ?? '').length,
        })),
      })

      const nextCommonPrompt = normalizedManagement.prompts.find((item) => {
        const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
        const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? '').trim().toLowerCase()
        const type = String(item?.type ?? item?.promptType ?? item?.category ?? '').trim().toLowerCase()
        return appKey === 'common' && screenKey === 'common' && type === 'instruction'
      }) ?? normalizedManagement.prompts.find(
        (item) => String(item?.key ?? '') === 'common' && String(item?.promptType ?? item?.category ?? '').toLowerCase() === 'instruction'
      )

      console.info('[chat-settings] common prompt resolved', {
        promptCount: normalizedManagement.prompts.length,
        matchedCommonPrompt: nextCommonPrompt,
        promptKeys: normalizedManagement.prompts.map((item) => ({
          id: item?.id,
          appKey: item?.appKey ?? item?.app_key,
          screenKey: item?.screenKey ?? item?.screen_key ?? item?.key,
          type: item?.type ?? item?.promptType ?? item?.category,
          content: item?.content,
        })),
      })

      const nextCommonIntentPrompt = normalizedManagement.prompts.find((item) => {
        const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
        const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? '').trim().toLowerCase()
        const type = String(item?.type ?? item?.promptType ?? item?.category ?? '').trim().toLowerCase()
        return appKey === 'common' && (screenKey === 'common' || screenKey === 'common_intent') && type === 'intent-classifier'
      }) ?? normalizedManagement.prompts.find(
        (item) => String(item?.key ?? '') === 'common' && String(item?.promptType ?? item?.category ?? '').toLowerCase() === 'intent-classifier'
      ) ?? null

      const nextCommonRagPrompt = normalizedManagement.prompts.find((item) => {
        const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
        const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? '').trim().toLowerCase()
        const type = String(item?.type ?? item?.promptType ?? item?.category ?? '').trim().toLowerCase()
        return appKey === 'common' && screenKey === 'common' && type === 'rag'
      }) ?? null

      setCommonPromptDraft({
        label: String(nextCommonPrompt?.label ?? '공통 프롬프트'),
        content: String(nextCommonPrompt?.content ?? nextCommonPrompt?.prompt ?? ''),
        enabled: nextCommonPrompt?.enabled !== false,
      })
      setCommonIntentPromptDraft({
        label: String(nextCommonIntentPrompt?.label ?? '기본 분류 LLM 프롬프트'),
        content: String(nextCommonIntentPrompt?.content ?? nextCommonIntentPrompt?.prompt ?? ''),
        enabled: nextCommonIntentPrompt?.enabled !== false,
      })
      setCommonRagPromptDraft({
        label: String(nextCommonRagPrompt?.label ?? '공통 RAG 프롬프트'),
        content: String(nextCommonRagPrompt?.content ?? nextCommonRagPrompt?.prompt ?? ''),
        enabled: nextCommonRagPrompt?.enabled !== false,
      })

      const nextCommonInputHintGuidance = normalizedManagement.guidance.find(
        (item) => {
          const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
          const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? item?.routeKey ?? item?.route_key ?? '').trim().toLowerCase()
          return appKey === 'common' && (screenKey === 'common' || String(item?.key ?? '').trim().toLowerCase() === 'common')
        }
      )
      const nextExamples = Array.isArray(nextCommonInputHintGuidance?.examples)
        ? nextCommonInputHintGuidance.examples
            .map((item) => String(item ?? '').trim())
            .filter(Boolean)
        : []

      console.info('[chat-settings] common guidance resolved', {
        guidanceCount: normalizedManagement.guidance.length,
        matchedCommonGuidance: nextCommonInputHintGuidance,
        examples: nextExamples,
        guidanceKeys: normalizedManagement.guidance.map((item) => ({
          id: item?.id,
          appKey: item?.appKey ?? item?.app_key,
          screenKey: item?.screenKey ?? item?.screen_key ?? item?.key,
          examples: Array.isArray(item?.examples) ? item.examples : [],
        })),
      })

      setCommonInputHintPromptDraft({
        label: '공통 입력 힌트',
        examples: nextExamples,
        enabled: true,
      })

      setPromptDrafts(
        Object.fromEntries(
          normalizedManagement.prompts.map((item) => [
            String(item.id),
            {
              id: item.id,
              content: String(item.content ?? item.prompt ?? ''),
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
              imageUrl: String(item.imageUrl ?? ''),
              imageAttachMode: normalizeImageAttachMode(item.imageAttachMode),
              keywords: normalizeKeywordArray(item.keywords ?? []),
              intentType: normalizeCommonRagIntentType(item),
              enabled: item.enabled !== false,
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

  useEffect(() => {
    if (activeAppTab !== APP_TAB.HISTORY) return
    loadHistoryPage(historyPagination.page, historyPagination.pageSize)
  }, [activeAppTab, loadHistoryPage, historyPagination.page, historyPagination.pageSize])

  const providerItem = useMemo(() => schema.find((s) => s.key === 'llmProvider'), [schema])

  const commonPromptItem = useMemo(
    () =>
      management.prompts.find((item) => {
        const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
        const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? '').trim().toLowerCase()
        const type = String(item?.type ?? item?.promptType ?? item?.category ?? '').trim().toLowerCase()
        return appKey === 'common' && screenKey === 'common' && type === 'instruction'
      }) ?? management.prompts.find(
        (item) =>
          String(item?.key ?? '') === 'common' &&
          String(item?.promptType ?? item?.category ?? '').toLowerCase() === 'instruction'
      ) ?? null,
    [management.prompts]
  )

  const commonIntentPromptItem = useMemo(
    () =>
      management.prompts.find((item) => {
        const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
        const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? '').trim().toLowerCase()
        const type = String(item?.type ?? item?.promptType ?? item?.category ?? '').trim().toLowerCase()
        return appKey === 'common' && (screenKey === 'common' || screenKey === 'common_intent') && type === 'intent-classifier'
      }) ?? management.prompts.find(
        (item) =>
          String(item?.key ?? '') === 'common' &&
          String(item?.promptType ?? item?.category ?? '').toLowerCase() === 'intent-classifier'
      ) ?? null,
    [management.prompts]
  )

  const commonRagPromptItem = useMemo(
    () =>
      management.prompts.find((item) => {
        const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
        const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? '').trim().toLowerCase()
        const type = String(item?.type ?? item?.promptType ?? item?.category ?? '').trim().toLowerCase()
        return appKey === 'common' && screenKey === 'common' && type === 'rag'
      }) ?? null,
    [management.prompts]
  )

  const commonInputHintPromptItem = useMemo(
    () =>
      management.guidance.find((item) => {
        const appKey = String(item?.appKey ?? item?.app_key ?? '').trim().toLowerCase()
        const screenKey = String(item?.screenKey ?? item?.screen_key ?? item?.key ?? item?.routeKey ?? item?.route_key ?? '').trim().toLowerCase()
        return appKey === 'common' && (screenKey === 'common' || String(item?.key ?? '').trim().toLowerCase() === 'common')
      }) ?? null,
    [management.guidance]
  )

  const commonRagDocs = useMemo(
    () => management.ragDocs.filter((item) => isCommonScopeRecord(item)),
    [management.ragDocs]
  )

  const screenGroups = useMemo(
    () => groupScreenSettings(management.screens, management.prompts, management.guidance, management.ragDocs),
    [management.guidance, management.prompts, management.ragDocs, management.screens]
  )

  const appRouteTree = useMemo(
    () => buildAppRouteTree(management.screens, activeAppTab),
    [management.screens, activeAppTab]
  )

  useEffect(() => {
    if (activeAppTab === APP_TAB.COMMON) {
      if (activeRouteKey) setActiveRouteKey('')
      return
    }

    console.info('[chat-settings][route-resolution]', {
      activeAppTab,
      currentActiveRouteKey: activeRouteKey,
      appRouteTreeKeys: (Array.isArray(appRouteTree) ? appRouteTree : []).map((row) => ({
        key: row?.key,
        parentKey: row?.parentKey,
        appKey: row?.appKey,
      })),
      hasCurrentRouteInTree: hasRouteKeyInTree(appRouteTree, activeRouteKey),
    })

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

  const handleSaveFinalFallbackText = useCallback(async () => {
    if (savingFinalFallbackText) return

    setSavingFinalFallbackText(true)
    setError('')

    try {
      const res = await updateChatSettings({
        settings: [{ key: 'finalFallbackText', value: draftFinalFallbackText }],
      })
      const next = res?.data?.values ?? {}

      setValues(next)
      setDraftFinalFallbackText(String(next.finalFallbackText ?? draftFinalFallbackText))
      setSavedMessage('최종 fallback 텍스트가 적용되었습니다.')
      setSavedOpen(true)
    } catch (e) {
      setError(e?.message || '최종 fallback 텍스트 저장에 실패했습니다.')
    } finally {
      setSavingFinalFallbackText(false)
    }
  }, [draftFinalFallbackText, savingFinalFallbackText])

  const handleSaveRagContextLimits = useCallback(async () => {
    if (savingRagContextLimits) return

    const topK = Number(draftRagContextTopK)
    const maxCharsPerChunk = Number(draftRagContextMaxCharsPerChunk)

    if (!Number.isFinite(topK) || topK < 1 || !Number.isFinite(maxCharsPerChunk) || maxCharsPerChunk < 100) {
      setError('RAG 청크 수는 1 이상, 각 청크 길이는 100자 이상이어야 합니다.')
      return
    }

    setSavingRagContextLimits(true)
    setError('')

    try {
      const res = await updateChatSettings({
        settings: [
          { key: 'ragContextTopK', value: Math.floor(topK) },
          { key: 'ragContextMaxCharsPerChunk', value: Math.floor(maxCharsPerChunk) },
        ],
      })
      const next = res?.data?.values ?? {}

      setValues(next)
      setDraftRagContextTopK(String(next.ragContextTopK ?? topK))
      setDraftRagContextMaxCharsPerChunk(String(next.ragContextMaxCharsPerChunk ?? maxCharsPerChunk))
      setSavedMessage('RAG 본문 제한 설정이 저장되었습니다.')
      setSavedOpen(true)
    } catch (e) {
      setError(e?.message || 'RAG 본문 제한 저장에 실패했습니다.')
    } finally {
      setSavingRagContextLimits(false)
    }
  }, [draftRagContextMaxCharsPerChunk, draftRagContextTopK, savingRagContextLimits])

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
        prompt: String(commonPromptDraft.content ?? ''),
        enabled: Boolean(commonPromptDraft.enabled),
      })
      const next = res?.data ?? {}

      setCommonPromptDraft({
        label: String(next.label ?? commonPromptDraft.label ?? '공통 프롬프트'),
        content: String(next.prompt ?? next.content ?? commonPromptDraft.content ?? ''),
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

  const handleCommonIntentPromptChange = useCallback((field, nextValue) => {
    setCommonIntentPromptDraft((prev) => ({
      ...prev,
      [field]: nextValue,
    }))
  }, [])

  const handleSaveCommonIntentPrompt = useCallback(async () => {
    setSavingCommonIntentPrompt(true)
    setError('')

    try {
      const content = String(commonIntentPromptDraft.content ?? '').trim()
      const enabled = Boolean(commonIntentPromptDraft.enabled)

      if (commonIntentPromptItem?.id) {
        const res = await updateChatPrompt(commonIntentPromptItem.id, {
          prompt: content,
          enabled,
        })
        const next = res?.data ?? {}
        setSavedMessage(`${String(next.label ?? '기본 분류 LLM 프롬프트')}가 저장되었습니다.`)
      } else {
        const res = await createChatPrompt({
          appKey: 'common',
          screenKey: 'common',
          type: 'intent-classifier',
          prompt: content,
          enabled,
        })
        if (Number(res?.code ?? 0) !== 200) {
          throw new Error(String(res?.message ?? '기본 분류 LLM 프롬프트 생성 응답이 올바르지 않습니다.'))
        }
        setSavedMessage('기본 분류 LLM 프롬프트가 생성되었습니다.')
      }

      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || '기본 분류 LLM 프롬프트 저장에 실패했습니다.')
    } finally {
      setSavingCommonIntentPrompt(false)
    }
  }, [commonIntentPromptDraft, commonIntentPromptItem, load])

  const handleCommonRagPromptChange = useCallback((field, nextValue) => {
    setCommonRagPromptDraft((prev) => ({
      ...prev,
      [field]: nextValue,
    }))
  }, [])

  const handleSaveCommonRagPrompt = useCallback(async () => {
    setSavingCommonRagPrompt(true)
    setError('')

    try {
      const prompt = String(commonRagPromptDraft.content ?? '').trim()
      const enabled = Boolean(commonRagPromptDraft.enabled)

      if (commonRagPromptItem?.id) {
        await updateChatPrompt(commonRagPromptItem.id, { prompt, enabled })
      } else {
        const res = await createChatPrompt({
          appKey: 'common',
          screenKey: 'common',
          type: 'rag',
          prompt,
          enabled,
        })
        if (Number(res?.code ?? 0) !== 200) {
          throw new Error(String(res?.message ?? '공통 RAG 프롬프트 생성 응답이 올바르지 않습니다.'))
        }
      }

      setSavedMessage('공통 RAG 프롬프트가 저장되었습니다.')
      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || '공통 RAG 프롬프트 저장에 실패했습니다.')
    } finally {
      setSavingCommonRagPrompt(false)
    }
  }, [commonRagPromptDraft, commonRagPromptItem, load])

  const handleCommonInputHintPromptChange = useCallback((field, nextValue) => {
    setCommonInputHintPromptDraft((prev) => ({
      ...prev,
      [field]: nextValue,
    }))
  }, [])

  const handleSettingDraftChange = useCallback((key, nextValue) => {
    setSettingDrafts((prev) => ({
      ...prev,
      [key]: nextValue,
    }))
  }, [])

  const handleSaveSettingGroup = useCallback(async (scopeKey, settings, successMessage) => {
    setSavingSettingScope(String(scopeKey ?? ''))
    setError('')

    try {
      const res = await updateChatSettings({ settings })
      const next = res?.data?.values ?? {}
      setValues(next)
      setSavedMessage(String(successMessage ?? '설정이 저장되었습니다.'))
      setSavedOpen(true)
      await load()
      return true
    } catch (e) {
      setError(e?.message || '설정 저장에 실패했습니다.')
      return false
    } finally {
      setSavingSettingScope('')
    }
  }, [load])

  const handleSaveCommonInputHintPrompt = useCallback(async () => {
    setSavingCommonInputHintPrompt(true)
    setError('')

    try {
      const examples = Array.isArray(commonInputHintPromptDraft.examples)
        ? commonInputHintPromptDraft.examples
            .map((item) => String(item ?? '').trim())
            .filter(Boolean)
        : []

      if (commonInputHintPromptItem?.id) {
        const res = await updateChatGuidance(commonInputHintPromptItem.id, { examples })
        const next = res?.data ?? {}
        setSavedMessage('저장되었습니다.')
      } else {
        const createRes = await createChatGuidance({
          appKey: 'common',
          screenKey: 'common',
        })

        if (Number(createRes?.code ?? 0) !== 200) {
          throw new Error(String(createRes?.message ?? '공통 입력 힌트 생성 응답이 올바르지 않습니다.'))
        }

        const created = createRes?.data ?? {}
        const updateRes = await updateChatGuidance(created.id, { examples })
        const next = updateRes?.data ?? {}
        setSavedMessage('저장되었습니다.')
      }

      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || '공통 입력 힌트 저장에 실패했습니다.')
    } finally {
      setSavingCommonInputHintPrompt(false)
    }
  }, [commonInputHintPromptDraft, commonInputHintPromptItem, load])

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
    async (item, overrideDraft) => {
      const draft = overrideDraft ?? getPromptDraft(promptDrafts, item)
      const draftKey = String(item.id)

      setSavingPromptKey(draftKey)
      setError('')

      try {
        await updateChatPrompt(item.id, {
          prompt: draft.content,
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
        screenKey: normalizedRouteKey,
        type: String(promptType ?? 'system').trim() || 'system',
        prompt: String(content ?? ''),
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

        setSavedMessage('가이드가 저장되었습니다.')
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
        screenKey: normalizedRouteKey,
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

  const handleNewCommonInfoRagChange = useCallback((field, nextValue) => {
    setNewCommonInfoRagDraft((prev) => ({
      ...prev,
      [field]: nextValue,
    }))
  }, [])

  const handleNewCommonActionRagChange = useCallback((field, nextValue) => {
    setNewCommonActionRagDraft((prev) => ({
      ...prev,
      [field]: nextValue,
    }))
  }, [])

  const getDbRagLimitValue = useCallback((key, fallback) => {
    const rawValue = Number(values?.[key] ?? fallback)
    if (!Number.isFinite(rawValue) || rawValue <= 0) return fallback
    return Math.floor(rawValue)
  }, [values])

  const handleCreateCommonInfoRag = useCallback(async () => {
    const keywords = normalizeKeywordArray(newCommonInfoRagDraft.keywords)
    const maxCharsPerChunk = getDbRagLimitValue('ragContextMaxCharsPerChunk', 700)
    const bodyLength = String(newCommonInfoRagDraft.body ?? '').length

    if (bodyLength > maxCharsPerChunk) {
      setError(`공통 info RAG 본문은 ${maxCharsPerChunk}자를 넘길 수 없습니다. 현재 ${bodyLength}자입니다.`)
      return
    }

    setSavingCreateCommonInfoRag(true)
    setError('')

    try {
      const res = await createCommonChatRagDoc({
        title: String(newCommonInfoRagDraft.title ?? ''),
        body: String(newCommonInfoRagDraft.body ?? ''),
        imageUrl: String(newCommonInfoRagDraft.imageUrl ?? ''),
        imageAttachMode: normalizeImageAttachMode(newCommonInfoRagDraft.imageAttachMode),
        keywords,
        intentType: 'info',
        enabled: Boolean(newCommonInfoRagDraft.enabled),
      })
      const next = res?.data ?? {}

      setNewCommonInfoRagDraft({
        title: '공통 info RAG',
        body: '',
        imageUrl: '',
        imageAttachMode: 'auto',
        keywords: [],
        enabled: true,
      })
      setSavedMessage(`${String(next.title ?? '공통 info RAG')} 청크가 등록되었습니다.`)
      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || '공통 info RAG 등록에 실패했습니다.')
    } finally {
      setSavingCreateCommonInfoRag(false)
    }
  }, [newCommonInfoRagDraft, load])

  const handleCreateCommonActionRag = useCallback(async () => {
    const keywords = normalizeKeywordArray(newCommonActionRagDraft.keywords)
    const maxCharsPerChunk = getDbRagLimitValue('ragContextMaxCharsPerChunk', 700)
    const bodyLength = String(newCommonActionRagDraft.body ?? '').length

    if (bodyLength > maxCharsPerChunk) {
      setError(`공통 action RAG 본문은 ${maxCharsPerChunk}자를 넘길 수 없습니다. 현재 ${bodyLength}자입니다.`)
      return
    }

    setSavingCreateCommonActionRag(true)
    setError('')

    try {
      const res = await createCommonChatRagDoc({
        title: String(newCommonActionRagDraft.title ?? ''),
        body: String(newCommonActionRagDraft.body ?? ''),
        imageUrl: String(newCommonActionRagDraft.imageUrl ?? ''),
        imageAttachMode: normalizeImageAttachMode(newCommonActionRagDraft.imageAttachMode),
        keywords,
        intentType: 'action',
        enabled: Boolean(newCommonActionRagDraft.enabled),
      })
      const next = res?.data ?? {}

      setNewCommonActionRagDraft({
        title: '공통 action RAG',
        body: '',
        imageUrl: '',
        imageAttachMode: 'auto',
        keywords: [],
        enabled: true,
      })
      setSavedMessage(`${String(next.title ?? '공통 action RAG')} 청크가 등록되었습니다.`)
      setSavedOpen(true)
      await load()
    } catch (e) {
      setError(e?.message || '공통 action RAG 등록에 실패했습니다.')
    } finally {
      setSavingCreateCommonActionRag(false)
    }
  }, [newCommonActionRagDraft, load])

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
    const keywords = normalizeKeywordArray(
      Array.isArray(draft?.keywords)
        ? draft?.keywords
        : parseKeywordsFallback(draft?.keywordsText),
    )
    const maxCharsPerChunk = getDbRagLimitValue('ragContextMaxCharsPerChunk', 700)
    const bodyLength = String(draft?.body ?? '').length

    if (bodyLength > maxCharsPerChunk) {
      setError(`본문은 ${maxCharsPerChunk}자를 넘길 수 없습니다. 현재 ${bodyLength}자입니다.`)
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
        imageUrl: String(draft?.imageUrl ?? ''),
        imageAttachMode: normalizeImageAttachMode(draft?.imageAttachMode),
        keywords,
        intentType: normalizeRagIntentType(draft?.intentType),
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
      const keywords = normalizeKeywordArray(
        Array.isArray(draft.keywords)
          ? draft.keywords
          : parseKeywordsFallback(draft.keywordsText),
      )
      const maxCharsPerChunk = getDbRagLimitValue('ragContextMaxCharsPerChunk', 700)
      const bodyLength = String(draft.body ?? '').length

      if (bodyLength > maxCharsPerChunk) {
        setError(`본문은 ${maxCharsPerChunk}자를 넘길 수 없습니다. 현재 ${bodyLength}자입니다.`)
        return false
      }

      setSavingRagKey(draftKey)
      setError('')

      try {
        await updateChatRagDoc(item.id, {
          title: String(draft.title ?? ''),
          body: String(draft.body ?? ''),
          imageUrl: String(draft.imageUrl ?? ''),
          imageAttachMode: normalizeImageAttachMode(draft.imageAttachMode),
          keywords,
          intentType: normalizeRagIntentType(draft.intentType),
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
    [getDbRagLimitValue, load, ragDrafts]
  )

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
              draftFinalFallbackText={draftFinalFallbackText}
              setDraftFinalFallbackText={setDraftFinalFallbackText}
              savingFinalFallbackText={savingFinalFallbackText}
              onSaveFinalFallbackText={handleSaveFinalFallbackText}
              draftRagContextTopK={draftRagContextTopK}
              setDraftRagContextTopK={setDraftRagContextTopK}
              draftRagContextMaxCharsPerChunk={draftRagContextMaxCharsPerChunk}
              setDraftRagContextMaxCharsPerChunk={setDraftRagContextMaxCharsPerChunk}
              savingRagContextLimits={savingRagContextLimits}
              onSaveRagContextLimits={handleSaveRagContextLimits}
            />
          ) : null}

          {activeAppTab === APP_TAB.GUIDANCE ? (
            <DatabaseTableSettingsTab kind="guidance" items={management.guidance} screens={management.screens} onChanged={load} />
          ) : null}

          {activeAppTab === APP_TAB.SCREEN ? (
            <DatabaseTableSettingsTab kind="screen" items={management.screens} screens={management.screens} onChanged={load} />
          ) : null}

          {activeAppTab === APP_TAB.PROMPT ? (
            <DatabaseTableSettingsTab kind="prompt" items={management.prompts} screens={management.screens} onChanged={load} />
          ) : null}

          {activeAppTab === APP_TAB.RAG ? (
            <DatabaseTableSettingsTab
              kind="rag"
              items={management.ragDocs}
              screens={management.screens}
              onChanged={load}
              maxCharsPerChunk={Number(values?.ragContextMaxCharsPerChunk ?? 700)}
              maxChunksPerApp={Number(values?.ragContextTopK ?? 3)}
            />
          ) : null}

          {activeAppTab === APP_TAB.RULE ? (
            <DatabaseTableSettingsTab kind="rule" items={management.rules} screens={management.screens} onChanged={load} />
          ) : null}

          {activeAppTab === APP_TAB.HISTORY ? (
            <HistoryTab
              history={management.history}
              ragDocs={management.ragDocs}
              pagination={historyPagination}
              refreshing={historyLoading}
              onRefresh={() => loadHistoryPage(historyPagination.page, historyPagination.pageSize)}
              onChangePage={(page) => setHistoryPagination((prev) => ({ ...prev, page }))}
              onChangePageSize={(pageSize) => {
                setHistoryPagination((prev) => ({ ...prev, page: 1, pageSize }))
                loadHistoryPage(1, pageSize)
              }}
            />
          ) : null}
        </>
      )}

      {savedOpen ? (
        <ModalBackdrop onClick={() => setSavedOpen(false)}>
          <ModalCard style={UNIFIED_MODAL_STYLE} onClick={(e) => e.stopPropagation()}>
            <ModalTitle>저장 완료</ModalTitle>
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