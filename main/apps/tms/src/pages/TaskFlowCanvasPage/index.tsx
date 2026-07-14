import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import TaskFlowCanvasHeader from './Header'
import { useTaskFlowStore } from '@/store/taskflow.store'
import { useFlowEditorStore } from '@/store/taskflow.canvas.store'

import PropertyPanel from '@/pages/TaskFlowCanvasPage/PropertyPanel'
import ConfirmModal from '@/pages/components/modal/ConfirmModal'

import { TaskFlow } from '@/types/taskflow'
import { ensureStartNode } from '@/utils/node.util'

import { useCreateTaskFlow, useUpdateTaskFlow } from '@/api/taskFlowApis'
import TaskFlowInfoDialog from '../components/dialog/TaskFlowInfoDialog'
import PalettePanel from './PalettePanel'
import { buildBehaviorTreeFromFlowDefinition } from '@/bt/build'
import { buildTaskFlowPersistPayload } from '@/types/api/savePayload'
import { useOrganizationStore } from '@repo/stores'
import { Main, PageRoot } from './styles'
import PanelLayout from './PanelLayout'
import DrawPanel from './DrawPanel'

type SaveMode = 'save' | 'temp'
type SubmitState = 'save' | 'temp' | null
type SaveOverride = { name: string; description: string }
type BtModalMode = 'save-gate' | null
type BtModalStatus = 'success' | 'error'

function normalizeOrgId(value: any) {
  if (value == null) return ''
  const str = String(value).trim()
  return str
}

export default function TaskFlowCanvasPage() {
  const { t } = useTranslation(['tms', 'common'])
  const navigate = useNavigate()
  const { taskFlowId } = useParams()

  const flows = useTaskFlowStore((s) => s.flows)
  const selectFlow = useTaskFlowStore((s) => s.selectFlow)
  const refreshFlows = useTaskFlowStore((s) => s.refreshFlows)
  const refreshSelectedFlow = useTaskFlowStore((s) => s.refreshSelectedFlow)

  const { mutateAsync: createTaskFlowAsync } = useCreateTaskFlow()
  const { mutateAsync: updateTaskFlowAsync } = useUpdateTaskFlow()

  const nodes = useFlowEditorStore((s) => s.nodes)
  const edges = useFlowEditorStore((s) => s.edges)
  const viewport = useFlowEditorStore((s) => s.viewport)
  const flowMode = useFlowEditorStore((s) => s.flowMode)

  const initFlowEditor = useFlowEditorStore((s) => s.initFlowEditor)
  const resetFlowEditor = useFlowEditorStore((s) => s.resetFlowEditor)
  const clearPersistedHistory = useFlowEditorStore((s) => s.clearPersistedHistory)
  const adoptFlowKey = useFlowEditorStore((s) => s.adoptFlowKey)

  const undo = useFlowEditorStore((s) => s.undo)
  const redo = useFlowEditorStore((s) => s.redo)
  const canUndo = useFlowEditorStore((s) => s.canUndo)
  const canRedo = useFlowEditorStore((s) => s.canRedo)

  const numericFlowId = Number(taskFlowId)
  const isNewFlow = Number.isFinite(numericFlowId) && numericFlowId <= 0

  const { selectedOrgs, allOrgs } = useOrganizationStore()

  useEffect(() => {
    if (!Number.isFinite(numericFlowId)) {
      navigate('/tms', { replace: true })
      return
    }

    if (numericFlowId > 0) {
      selectFlow(numericFlowId)
    } else {
      selectFlow(null)
    }
  }, [navigate, numericFlowId, selectFlow])

  const selectedFlow = useMemo(
    () => flows.find((f) => f.id === numericFlowId) ?? null,
    [flows, numericFlowId]
  )

  const selectedFlowId = selectedFlow?.id ?? null

  const orgContext = useMemo(() => {
    const orgList = Array.isArray(allOrgs) ? allOrgs : []

    const groupCode = isNewFlow
      ? normalizeOrgId(selectedOrgs?.[0])
      : normalizeOrgId(selectedFlow?.groupId)

    const siteCode = isNewFlow
      ? normalizeOrgId(selectedOrgs?.[1])
      : normalizeOrgId(selectedFlow?.siteId)

    const matchedSite = orgList.find((o: any) => normalizeOrgId(o?.code) === siteCode)
    const matchedGroup = orgList.find((o: any) => normalizeOrgId(o?.code) === groupCode)

    const groupName =
      matchedSite?.parentDisplayName ||
      matchedGroup?.displayName ||
      matchedSite?.originalData?.groupName ||
      ''

    const siteName =
      matchedSite?.displayName ||
      matchedSite?.originalData?.siteName ||
      ''

    return {
      groupId: groupCode || normalizeOrgId(matchedSite?.parentCode),
      siteId: siteCode || normalizeOrgId(matchedSite?.code),
      groupName,
      siteName
    }
  }, [isNewFlow, selectedOrgs, allOrgs, selectedFlow?.groupId, selectedFlow?.siteId])

  const selectedGroupId = orgContext.groupId
  const selectedSiteId = orgContext.siteId

  const [flowName, setFlowName] = useState('')
  const [flowDescription, setFlowDescription] = useState('')

  useEffect(() => {
    if (isNewFlow) {
      setFlowName('')
      setFlowDescription('')
      return
    }

    setFlowName(selectedFlow?.name ?? '')
    setFlowDescription(selectedFlow?.description ?? '')
  }, [
    isNewFlow,
    selectedFlow?.id,
    selectedFlow?.name,
    selectedFlow?.description
  ])

  const prevKeyRef = useRef<string | null>(null)

  useEffect(() => {
    resetFlowEditor()
    prevKeyRef.current = null
  }, [numericFlowId, resetFlowEditor])

  useEffect(() => {
    if (isNewFlow) {
      const key = 'NEW'
      if (prevKeyRef.current === key) return
      prevKeyRef.current = key

      clearPersistedHistory('new')

      initFlowEditor(
        'new',
        ensureStartNode({
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          flowMode: 'default'
        }) as unknown as Record<string, unknown>
      )
      return
    }

    if (!selectedFlow) return

    const key = String(selectedFlow.id)
    if (prevKeyRef.current === key) return
    prevKeyRef.current = key

    initFlowEditor(
      String(selectedFlow.id),
      selectedFlow.flowDefinitionDraft as Record<string, unknown>
    )
  }, [isNewFlow, selectedFlow, initFlowEditor, clearPersistedHistory])

  const [saveDoneOpen, setSaveDoneOpen] = useState(false)
  const [saveErrorOpen, setSaveErrorOpen] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [saveMode, setSaveMode] = useState<SaveMode>('save')
  const [submitState, setSubmitState] = useState<SubmitState>(null)

  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const saveAfterInfoRef = useRef<SaveMode | null>(null)

  const [btModalOpen, setBtModalOpen] = useState(false)
  const [btModalMode, setBtModalMode] = useState<BtModalMode>(null)
  const [btModalStatus, setBtModalStatus] = useState<BtModalStatus>('success')
  const [btModalTitle, setBtModalTitle] = useState('')
  const [btModalMessage, setBtModalMessage] = useState('')
  const [pendingBehaviorTree, setPendingBehaviorTree] = useState<string>('')

  const syncAfterCreate = async (created: TaskFlow) => {
    adoptFlowKey(String(created.id))
    clearPersistedHistory('new')

    navigate(`/tms/taskflows/${created.id}/canvas`, { replace: true })

    await refreshFlows(selectedGroupId, selectedSiteId)
    selectFlow(created.id)

    try {
      await refreshSelectedFlow()
    } catch {
      // optional
    }
  }

  const validateOrganization = useCallback(() => {
    const groupId = selectedGroupId || normalizeOrgId(selectedFlow?.groupId)
    const siteId = selectedSiteId || normalizeOrgId(selectedFlow?.siteId)

    if (!groupId || !siteId) {
      setSaveErrorMessage(t('canvas.page.orgRequired'))
      setSaveErrorOpen(true)
      return null
    }

    return { groupId, siteId }
  }, [selectedGroupId, selectedSiteId, selectedFlow?.groupId, selectedFlow?.siteId, t])

  const doSave = async (mode: SaveMode, behaviorTreeXml?: string, override?: SaveOverride) => {
    try {
      setSaving(true)
      setSubmitState(mode)

      const trimmedName = (override?.name ?? flowName).trim()
      const trimmedDescription = (override?.description ?? flowDescription).trim()

      if (!trimmedName) {
        setSaveErrorMessage(t('canvas.page.nameRequired'))
        setSaveErrorOpen(true)
        return
      }

      const orgInfo = validateOrganization()
      if (!orgInfo) {
        return
      }

      if (mode === 'save' && !behaviorTreeXml?.trim()) {
        setSaveErrorMessage(t('canvas.page.btNoResult'))
        setSaveErrorOpen(true)
        return
      }

      const idForUpdate = numericFlowId > 0 ? numericFlowId : selectedFlowId

      const payload = buildTaskFlowPersistPayload({
        mode,
        flowId: isNewFlow ? 0 : idForUpdate,
        baseFlow: selectedFlow,
        flowName: trimmedName,
        flowDescription: trimmedDescription,
        nodes,
        edges,
        viewport,
        flowMode,
        behaviorTree: behaviorTreeXml,
        groupId: orgInfo.groupId,
        siteId: orgInfo.siteId
      })

      if (isNewFlow) {
        const created = await createTaskFlowAsync(payload)
        setSaveDoneOpen(true)
        await syncAfterCreate(created)
        return
      }

      if (!idForUpdate) return

      await updateTaskFlowAsync({ id: idForUpdate, patch: payload })

      setSaveDoneOpen(true)
      await refreshSelectedFlow()
    } catch (e: any) {
      console.error('[SAVE] failed:', e)

      const msg =
        e?.response?.data?.message ||
        e?.message ||
        t('canvas.page.saveError')

      setSaveErrorMessage(msg)
      setSaveErrorOpen(true)
    } finally {
      setSaving(false)
      setSubmitState(null)
    }
  }

  const runBtTransformForSave = async (mode: SaveMode, override?: SaveOverride) => {
    try {
      const result = buildBehaviorTreeFromFlowDefinition({
        nodes,
        edges,
        flowMode
      } as any)

      console.log('[BT 변환] model:', result.model)
      console.log('[BT 변환] xml:\n' + result.xml)

      if (result.warnings?.length > 0) {
        console.warn('[BT 변환] warnings:\n' + result.warnings.join('\n'))
      }

      await doSave(mode, result.xml ?? '', override)

      return true
    } catch (error: any) {
      console.error('[BT 변환] failed:', error)

      const message =
        error?.message ||
        (typeof error === 'string' ? error : t('canvas.page.btUnknownError'))

      setPendingBehaviorTree('')
      setBtModalMode('save-gate')
      setBtModalStatus('error')
      setBtModalTitle(t('canvas.page.btFailTitle'))
      setBtModalMessage(message)
      setBtModalOpen(true)

      return false
    }
  }

  const requestSave = async (mode: SaveMode, override?: SaveOverride) => {
    if (saving) return

    const trimmedName = (override?.name ?? flowName).trim()
    if (!trimmedName) {
      saveAfterInfoRef.current = mode
      setInfoDialogOpen(true)
      return
    }

    const orgInfo = validateOrganization()
    if (!orgInfo) {
      return
    }

    setSaveMode(mode)

    if (mode === 'temp') {
      await doSave('temp', undefined, override)
      return
    }

    runBtTransformForSave(mode, override)
  }

  const onSave = () => requestSave('save')
  const onTempSave = () => requestSave('temp')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return

      if (!(e.ctrlKey || e.metaKey)) return

      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <PageRoot>
      <TaskFlowCanvasHeader
        description={flowDescription}
        title={isNewFlow ? flowName || t('canvas.page.newFlowTitle') : flowName || t('canvas.page.defaultTitle')}
        status={(selectedFlow as any)?.status}
        onEditInfo={() => {
          saveAfterInfoRef.current = null
          setInfoDialogOpen(true)
        }}
        onSave={onSave}
        onTempSave={onTempSave}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving && saveMode === 'save'}
        tempSaving={saving && saveMode === 'temp'}
      />

      <Main>
        <PanelLayout
          left={
            <PalettePanel
              groupId={selectedGroupId}
              siteId={selectedSiteId}
            />
          }
          center={<DrawPanel />}
          right={<PropertyPanel />}
        />
      </Main>

      <TaskFlowInfoDialog
        open={infoDialogOpen}
        title={t('canvas.page.infoDialogTitle')}
        description={t('canvas.page.infoDialogDesc')}
        confirmText={t('canvas.page.apply')}
        loading={saving}
        initialName={flowName}
        initialDescription={flowDescription}
        onClose={() => {
          if (saving) return
          saveAfterInfoRef.current = null
          setInfoDialogOpen(false)
        }}
        onConfirm={({ name, description }: { name: string; description: string }) => {
          const trimmedName = name.trim()

          if (!trimmedName) {
            setSaveErrorMessage(t('canvas.page.nameRequired'))
            setSaveErrorOpen(true)
            return
          }

          setFlowName(name)
          setFlowDescription(description)
          setInfoDialogOpen(false)

          const pendingMode = saveAfterInfoRef.current
          saveAfterInfoRef.current = null
          if (pendingMode) {
            void requestSave(pendingMode, { name, description })
          }
        }}
      />

      <ConfirmModal
        open={btModalOpen}
        title={btModalTitle}
        description={btModalMessage}
        confirmText={
          btModalStatus === 'success' && btModalMode === 'save-gate'
            ? saveMode === 'temp'
              ? saving
                ? t('canvas.page.btTempSaving')
                : t('canvas.page.btTempSave')
              : saving
                ? t('canvas.page.btSaving')
                : t('canvas.page.btSave')
            : t('common:confirm')
        }
        showCancelButton={btModalStatus === 'success' && btModalMode === 'save-gate'}
        confirmDisabled={saving}
        onCancel={() => {
          if (saving) return
          setBtModalOpen(false)
          setBtModalMode(null)
        }}
        onConfirm={async () => {
          if (saving) return

          if (btModalStatus === 'success' && btModalMode === 'save-gate') {
            setBtModalOpen(false)
            await doSave(saveMode, pendingBehaviorTree)
            return
          }

          setBtModalOpen(false)
          setBtModalMode(null)
        }}
      />

      <ConfirmModal
        open={saveDoneOpen}
        title={saveMode === 'temp' ? t('canvas.page.tempSaveDoneTitle') : t('canvas.page.saveDoneTitle')}
        description={
          saveMode === 'temp'
            ? t('canvas.page.tempSaveDoneDesc')
            : t('canvas.page.saveDoneDesc')
        }
        showCancelButton={false}
        closeOnOverlayClick={true}
        onCancel={() => setSaveDoneOpen(false)}
        onConfirm={() => setSaveDoneOpen(false)}
      />

      <ConfirmModal
        open={saveErrorOpen}
        title={submitState === 'temp' ? t('canvas.page.tempSaveFailTitle') : t('canvas.page.saveFailTitle')}
        description={saveErrorMessage}
        showCancelButton={false}
        closeOnOverlayClick={true}
        onCancel={() => setSaveErrorOpen(false)}
        onConfirm={() => setSaveErrorOpen(false)}
      />
    </PageRoot>
  )
}