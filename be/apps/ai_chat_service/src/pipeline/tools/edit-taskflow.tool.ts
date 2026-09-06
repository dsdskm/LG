import type { ToolContext, ToolDefinition } from '../tool.type'
import { getPropertyTmsStore } from '../../features/taskflow/service/property-tms-store.service'
import { CHAT_PROMPT_TYPE } from '../../features/chat/prompt-types'
import { renderPromptTemplate } from '../prompt-template.util'
import {
  describeGraphNode,
  describeGraphNodeForUser,
  findContentRef,
  findGraphNodes,
  formatNodeTarget,
  parseNodeTarget,
  readCurrentGraph,
  readTaskContents,
  toMatchKey,
  TASKFLOW_CANVAS_SCREEN_KEY,
  type CurrentGraph,
  type GraphNodeRef,
  type TaskContentRef,
} from './taskflow-palette'
import { taskflowMessage, TASKFLOW_MESSAGE_KEY } from './taskflow-message'

const TOOL_NAME = 'edit_taskflow'

type EditAction = 'insert' | 'replace' | 'remove' | 'clone_all'

type EditOperationArg = {
  action: EditAction
  target: string
  after: string
  taskName: string
  contentName: string
  branch: boolean
  all: boolean
  refId: string
}

/** 프론트 applyEditDraftToFlowDefinition 이 그대로 소비하는 스텝. */
type DraftStep = {
  label: string
  taskName: string
  taskType?: string
  contentName?: string
  contentId?: number
  taskId?: number
  /** 요청한 대상을 못 찾아 같은 Task 의 다른 콘텐츠로 임시 채운 경우 원래 요청한 이름. */
  placeholderFor?: string
}

function buildDescription(catalogText: string): string {
  return renderPromptTemplate(TASKFLOW_CANVAS_SCREEN_KEY, CHAT_PROMPT_TYPE.toolEditTaskflow, {
    catalog: catalogText,
  })
}

function appendedMessage(branch: boolean, anchor: string, label: string): string {
  const key = branch ? TASKFLOW_MESSAGE_KEY.editAppliedAppendBranch : TASKFLOW_MESSAGE_KEY.editAppliedAppendAfter
  return taskflowMessage(key, { anchor, label })
}

function ambiguousEntry(name: string, options: string[]): string {
  return taskflowMessage(TASKFLOW_MESSAGE_KEY.editAmbiguousEntry, { name, options: options.join(', ') })
}

function emphasize(values: string[]): string {
  return values.map((value) => `**${value}**`).join(', ')
}

function toEditOperations(value: unknown): EditOperationArg[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      action: String(item.action || '').trim() as EditAction,
      target: String(item.target || '').trim(),
      after: String(item.after || '').trim(),
      taskName: String(item.taskName || '').trim(),
      contentName: String(item.contentName || '').trim(),
      branch: Boolean(item.branch),
      all: Boolean(item.all),
      refId: String(item.refId || '').trim(),
    }))
    .filter((item) => item.action === 'insert' || item.action === 'replace' || item.action === 'remove' || item.action === 'clone_all')
}

type TargetResolution =
  | { kind: 'ok'; nodes: GraphNodeRef[] }
  | { kind: 'missing' }
  | { kind: 'ambiguous'; options: string[] }

/** 번호나 all 이 없는데 동명 노드가 여러 개면 임의로 고르지 않고 되묻는다. */
function resolveTargetNodes(name: string, graph: CurrentGraph, all: boolean): TargetResolution {
  const matched = findGraphNodes(name, graph)
  if (matched.length === 0) return { kind: 'missing' }
  if (all || matched.length === 1) return { kind: 'ok', nodes: matched }

  return { kind: 'ambiguous', options: matched.map(describeGraphNodeForUser) }
}

/** 앞선 operation 이 만든 노드 이름과 같으면 그걸 기준으로 쓴다. 프론트가 순서대로 적용하며 찾아낸다. */
function findPendingLabel(name: string, createdLabels: string[]): string | undefined {
  const key = toMatchKey(parseNodeTarget(name).name)
  if (!key) return undefined

  return [...createdLabels].reverse().find((label) => toMatchKey(label) === key)
}

function resolveStep(
  taskName: string,
  contentName: string,
  store: NonNullable<ReturnType<typeof getPropertyTmsStore>>,
  contents: TaskContentRef[],
): DraftStep | null {
  const contentRef = contentName ? findContentRef(contentName, taskName, contents) : undefined
  const effectiveTaskName = store.get(taskName) ? taskName : contentRef?.taskName
  const semantics = effectiveTaskName ? store.get(effectiveTaskName) : undefined
  if (!semantics) return null

  if (contentRef) {
    return {
      label: contentRef.contentName,
      taskName: semantics.taskName,
      taskType: semantics.taskType,
      contentName: contentRef.contentName,
      contentId: contentRef.contentId,
      taskId: contentRef.taskId,
    }
  }

  // 대상을 지정했는데 팔레트에 없으면, 같은 Task 의 다른 콘텐츠로 임시 채우고 사용자가 바꾸게 한다.
  // 구조가 없으면 뒤이어지는 요청(자식 추가 등)이 전부 막힐 수 있어 임의로 따지지 않고 구조부터 유지한다.
  if (contentName) {
    const placeholder = contents.find((row) => toMatchKey(row.taskName) === toMatchKey(semantics.taskName))
    if (!placeholder) return null

    return {
      label: placeholder.contentName,
      taskName: semantics.taskName,
      taskType: semantics.taskType,
      contentName: placeholder.contentName,
      contentId: placeholder.contentId,
      taskId: placeholder.taskId,
      placeholderFor: contentName,
    }
  }

  // 콘텐츠를 지정하지 않은 제어 노드는 Task 이름 자체가 팔레트 라벨이다.
  return { label: semantics.taskName, taskName: semantics.taskName, taskType: semantics.taskType }
}

export function createEditTaskflowTool(): ToolDefinition | null {
  const store = getPropertyTmsStore()
  if (!store) return null

  const catalogText = store.buildCatalogText()
  if (!catalogText) return null

  // 설명은 prompt 테이블에서 온다. 행이 없으면 tool 을 등록하지 않아 설정 누락이 드러나게 한다.
  const description = buildDescription(catalogText)
  if (!description) return null

  return {
    declaration: {
      name: TOOL_NAME,
      description,
      parameters: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            description: taskflowMessage(TASKFLOW_MESSAGE_KEY.editParamOperations),
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', description: taskflowMessage(TASKFLOW_MESSAGE_KEY.editParamAction) },
                target: { type: 'string', description: taskflowMessage(TASKFLOW_MESSAGE_KEY.editParamTarget) },
                after: { type: 'string', description: taskflowMessage(TASKFLOW_MESSAGE_KEY.editParamAfter) },
                taskName: { type: 'string', description: taskflowMessage(TASKFLOW_MESSAGE_KEY.editParamTaskName) },
                contentName: { type: 'string', description: taskflowMessage(TASKFLOW_MESSAGE_KEY.editParamContentName) },
                branch: { type: 'boolean', description: taskflowMessage(TASKFLOW_MESSAGE_KEY.editParamBranch) },
                all: { type: 'boolean', description: taskflowMessage(TASKFLOW_MESSAGE_KEY.editParamAll) },
                refId: { type: 'string', description: taskflowMessage(TASKFLOW_MESSAGE_KEY.editParamRefId) },
              },
              required: ['action'],
            },
          },
        },
        required: ['operations'],
      },
    },

    execute: async (args: Record<string, any>, ctx: ToolContext) => {
      const operations = toEditOperations(args.operations)
      if (operations.length === 0) return {}

      const graph: CurrentGraph = readCurrentGraph(ctx)
      ctx.log?.log(
        `[${TOOL_NAME}] ops=${JSON.stringify(operations)} graphNodes=${graph.nodes.map(describeGraphNode).join(' | ') || '-'}`,
      )
      if (graph.nodes.length === 0) {
        return { clarification: taskflowMessage(TASKFLOW_MESSAGE_KEY.editEmptyCanvas), suggestions: [] }
      }

      const contents = readTaskContents(ctx).filter((row) => Boolean(store.get(row.taskName)))

      const removeByName: string[] = []
      const replaceByName: Array<{ target: string; step: DraftStep }> = []
      const insertAfter: Array<{
        after: string
        step: DraftStep
        appendOnly: boolean
        sourceHandle: 'left' | 'right'
        targetHandle: 'left'
        afterCreatedIndex?: number
        /** 캔버스 우측 끝으로 밀어내 기존과 겹치지 않게 배치해야 하는 경우(전체 복제 등). */
        placement?: 'right-of-all'
      }> = []
      const applied: string[] = []
      const missing: string[] = []
      const ambiguous: string[] = []
      const createdLabels: string[] = []
      // 요청한 대상을 못 찾아 다른 콘텐츠로 임시 채운 경우. 채팅에 그대로 노출해 바꿔야 함을 알린다.
      const placeholders: string[] = []
      // refId -> 그 노드를 만드는 insertAfter 인덱스. 동명 노드를 여러 개 만들 때 섞이지 않게 한다.
      const insertIndexByRefId = new Map<string, number>()

      // 흐름 맨 끝을 기준으로 삼는 요청은 after 를 비워 프론트가 꼬리 노드를 찾게 한다.
      const tailIsExplicit = (operation: EditOperationArg) => operation.after.length > 0

      for (const operation of operations) {
        if (operation.action === 'clone_all') {
          const nodeIds = new Set(graph.nodes.map((node) => node.id))
          const incomingCount = new Map<string, number>()
          const outgoingByNode = new Map<string, Array<{ target: string; branch: boolean }>>()
          for (const node of graph.nodes) incomingCount.set(node.id, 0)
          for (const edge of graph.edges) {
            if (!nodeIds.has(edge.target) || !nodeIds.has(edge.source)) continue
            incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1)
            const entry = { target: edge.target, branch: edge.branch }
            const bucket = outgoingByNode.get(edge.source)
            if (bucket) bucket.push(entry)
            else outgoingByNode.set(edge.source, [entry])
          }

          // 다른 노드 안에서 오지 않는 노드(= start 바로 다음)가 복제된 흐름의 시작점이다.
          const roots = graph.nodes.filter((node) => (incomingCount.get(node.id) ?? 0) === 0).map((node) => node.id)
          if (roots.length === 0) {
            missing.push(taskflowMessage(TASKFLOW_MESSAGE_KEY.editCloneTargetMissing))
            continue
          }

          const cloneRefByOriginalId = new Map<string, string>()
          let cloneSeq = 0
          const rootAnchorResolved = tailIsExplicit(operation)
            ? resolveTargetNodes(operation.after, graph, false)
            : undefined

          const enqueueClone = (originalId: string, parentRef: string, branch: boolean): boolean => {
            const original = graph.nodes.find((node) => node.id === originalId)
            if (!original) return false

            const step = resolveStep(original.taskName ?? '', original.contentName ?? '', store, contents)
            if (!step) {
              missing.push(original.label)
              return false
            }

            cloneSeq += 1
            const refId = `clone-${cloneSeq}`
            cloneRefByOriginalId.set(originalId, refId)

            if (parentRef) {
              insertAfter.push({
                after: '',
                afterCreatedIndex: insertIndexByRefId.get(parentRef),
                step,
                appendOnly: true,
                sourceHandle: branch ? 'left' : 'right',
                targetHandle: 'left',
                placement: 'right-of-all',
              })
            } else {
              insertAfter.push({
                after: rootAnchorResolved?.kind === 'ok' ? formatNodeTarget(rootAnchorResolved.nodes[0]) : '',
                step,
                appendOnly: true,
                sourceHandle: branch ? 'left' : 'right',
                targetHandle: 'left',
                placement: 'right-of-all',
              })
            }

            insertIndexByRefId.set(refId, insertAfter.length - 1)
            applied.push(taskflowMessage(TASKFLOW_MESSAGE_KEY.editAppliedClone, { node: describeGraphNodeForUser(original) }))
            return true
          }

          if (tailIsExplicit(operation) && rootAnchorResolved?.kind === 'missing') {
            missing.push(parseNodeTarget(operation.after).name)
            continue
          }
          if (tailIsExplicit(operation) && rootAnchorResolved?.kind === 'ambiguous') {
            ambiguous.push(ambiguousEntry(parseNodeTarget(operation.after).name, rootAnchorResolved.options))
            continue
          }

          for (const rootId of roots) {
            const queue: Array<{ id: string; parentRef: string; branch: boolean }> = [
              { id: rootId, parentRef: '', branch: operation.branch },
            ]

            while (queue.length > 0) {
              const current = queue.shift()
              if (!current) continue

              const ok = enqueueClone(current.id, current.parentRef, current.branch)
              if (!ok) continue

              const newParentRef = cloneRefByOriginalId.get(current.id) ?? ''
              const outgoing = outgoingByNode.get(current.id) ?? []
              // 다음(순차) 먼저, 자식(분기)은 그 다음. Start 기준 순서와 같은 규칙을 쓴다.
              const ordered = [...outgoing.filter((edge) => !edge.branch), ...outgoing.filter((edge) => edge.branch)]
              for (const edge of ordered) {
                queue.push({ id: edge.target, parentRef: newParentRef, branch: edge.branch })
              }
            }
          }
          continue
        }

        if (operation.action === 'remove') {
          const resolved = resolveTargetNodes(operation.target, graph, operation.all)
          if (resolved.kind === 'missing') {
            missing.push(parseNodeTarget(operation.target).name)
            continue
          }
          if (resolved.kind === 'ambiguous') {
            ambiguous.push(ambiguousEntry(parseNodeTarget(operation.target).name, resolved.options))
            continue
          }

          for (const node of resolved.nodes) {
            removeByName.push(formatNodeTarget(node))
            applied.push(taskflowMessage(TASKFLOW_MESSAGE_KEY.editAppliedRemove, { node: describeGraphNodeForUser(node) }))
          }
          continue
        }

        const step = resolveStep(operation.taskName, operation.contentName, store, contents)
        if (!step) {
          missing.push(operation.contentName || operation.taskName)
          continue
        }
        if (step.placeholderFor) {
          placeholders.push(taskflowMessage(TASKFLOW_MESSAGE_KEY.editPlaceholderPair, { requested: step.placeholderFor, label: step.label }))
        }

        if (operation.action === 'replace') {
          const resolved = resolveTargetNodes(operation.target, graph, operation.all)
          if (resolved.kind === 'missing') {
            missing.push(parseNodeTarget(operation.target).name)
            continue
          }
          if (resolved.kind === 'ambiguous') {
            ambiguous.push(ambiguousEntry(parseNodeTarget(operation.target).name, resolved.options))
            continue
          }

          for (const node of resolved.nodes) {
            replaceByName.push({ target: formatNodeTarget(node), step })
            applied.push(taskflowMessage(TASKFLOW_MESSAGE_KEY.editAppliedReplace, { node: describeGraphNodeForUser(node), label: step.label }))
          }
          continue
        }

        if (!tailIsExplicit(operation)) {
          insertAfter.push({
            after: '',
            step,
            appendOnly: true,
            sourceHandle: operation.branch ? 'left' : 'right',
            targetHandle: 'left',
          })
          applied.push(taskflowMessage(TASKFLOW_MESSAGE_KEY.editAppliedAppend, { label: step.label }))
          createdLabels.push(step.label)
          if (operation.refId) insertIndexByRefId.set(operation.refId, insertAfter.length - 1)
          continue
        }

        // 별칭으로 지목한 경우가 가장 정확하다. 같은 이름을 여러 개 만들어도 섞이지 않는다.
        const refIndex = insertIndexByRefId.get(operation.after)
        if (refIndex !== undefined) {
          insertAfter.push({
            after: '',
            afterCreatedIndex: refIndex,
            step,
            appendOnly: true,
            sourceHandle: operation.branch ? 'left' : 'right',
            targetHandle: 'left',
          })
          const anchorLabel = insertAfter[refIndex]?.step.label ?? operation.after
          applied.push(appendedMessage(operation.branch, anchorLabel, step.label))
          createdLabels.push(step.label)
          if (operation.refId) insertIndexByRefId.set(operation.refId, insertAfter.length - 1)
          continue
        }

        // 같은 호출에서 방금 만든 노드를 기준으로 삼는 경우가 기존 캔버스 노드보다 우선한다.
        const pendingAnchor = findPendingLabel(operation.after, createdLabels)
        if (pendingAnchor) {
          insertAfter.push({
            after: pendingAnchor,
            step,
            appendOnly: true,
            sourceHandle: operation.branch ? 'left' : 'right',
            targetHandle: 'left',
          })
          applied.push(appendedMessage(operation.branch, pendingAnchor, step.label))
          createdLabels.push(step.label)
          if (operation.refId) insertIndexByRefId.set(operation.refId, insertAfter.length - 1)
          continue
        }

        const resolved = resolveTargetNodes(operation.after, graph, operation.all)
        if (resolved.kind === 'missing') {
          missing.push(parseNodeTarget(operation.after).name)
          continue
        }
        if (resolved.kind === 'ambiguous') {
          ambiguous.push(ambiguousEntry(parseNodeTarget(operation.after).name, resolved.options))
          continue
        }

        // "모든 Parallel 에" 같은 요청은 기준 노드 수만큼 같은 삽입을 펼친다.
        for (const anchor of resolved.nodes) {
          insertAfter.push({
            after: formatNodeTarget(anchor),
            step,
            appendOnly: true,
            sourceHandle: operation.branch ? 'left' : 'right',
            targetHandle: 'left',
          })
          applied.push(appendedMessage(operation.branch, describeGraphNodeForUser(anchor), step.label))
        }
        createdLabels.push(step.label)
        if (operation.refId) insertIndexByRefId.set(operation.refId, insertAfter.length - 1)
      }

      if (ambiguous.length > 0 && applied.length === 0) {
        return {
          clarification: taskflowMessage(TASKFLOW_MESSAGE_KEY.editAmbiguousClarification, { options: ambiguous.join(' / ') }),
          suggestions: [],
        }
      }

      if (applied.length === 0) {
        return {
          clarification: taskflowMessage(TASKFLOW_MESSAGE_KEY.editNotFound, { names: missing.join(', ') }),
          suggestions: [],
        }
      }

      ctx.log?.log(
        `[${TOOL_NAME}] applied=${applied.length} remove=${removeByName.length} replace=${replaceByName.length} insert=${insertAfter.length} missing=${missing.length} ambiguous=${ambiguous.length} placeholders=${placeholders.length}`,
      )

      const lines = [taskflowMessage(TASKFLOW_MESSAGE_KEY.editDone, { applied: emphasize(applied) })]
      if (placeholders.length > 0) {
        lines.push(taskflowMessage(TASKFLOW_MESSAGE_KEY.editPlaceholders, { pairs: emphasize(placeholders) }))
      }
      if (missing.length > 0) {
        lines.push(taskflowMessage(TASKFLOW_MESSAGE_KEY.editMissing, { names: emphasize(missing) }))
      }
      if (ambiguous.length > 0) {
        lines.push(taskflowMessage(TASKFLOW_MESSAGE_KEY.editAmbiguous, { names: emphasize(ambiguous) }))
      }

      const canvasDraft: Record<string, unknown> = { mode: 'edit' }
      if (removeByName.length > 0) canvasDraft.removeByName = removeByName
      if (replaceByName.length > 0) canvasDraft.replaceByName = replaceByName
      if (insertAfter.length > 0) canvasDraft.insertAfter = insertAfter

      // 프론트가 이 draft 를 그대로 소비한다. 화면이 안 바뀌면 여기와 브라우저 로그를 대조한다.
      ctx.log?.log(`[${TOOL_NAME}] draft=${JSON.stringify(canvasDraft)}`)

      return {
        canvasDraft,
        assistantText: lines.filter(Boolean).join('\n'),
      }
    },
  }
}
