import {
  type ComposeToolDeps,
  type FlowContextSummary,
  type FlowContextTaskContentSummary,
  inferLinearStepsFromMessage,
  isContentTaskContent,
  normalizeMessageKey,
  normalizeNameKey,
  normalizeNameToken,
  pickTaskContentByStep,
  resolveControlTaskContentCandidate,
  toFlowContextSummary,
} from '../../core'
import { isGenericNodePlaceholder } from './intent'

function normalizePickupTargetLabel(value: unknown): string {
  return normalizeNameToken(value)
    .replace(/^.*(?:에서)\s+/i, '')
    .replace(/\s*(?:을|를)?\s*(?:픽업|집어|집기|수거|적재)(?:하고|한\s*뒤|후)?\s*$/gi, '')
    .replace(/\s*(?:해줘|해주세요|부탁해|부탁합니다)\s*$/gi, '')
    .trim()
}

function inferPickupTargetLabelsFromMessage(value: unknown): string[] {
  const message = String(value ?? '').trim()
  if (!message) return []

  const cleaned = message
    .replace(/["'`]/g, '')
    .replace(/태스크\s*플로우|태스크\s*플로|태스크플로우|태스크플로|taskflow|구성해줘|구성해\s*줘|만들어줘|만들어\s*줘|생성해줘|생성해\s*줘/gi, '')
    .replace(/→/g, '->')

  const explicit = Array.from(
    cleaned.matchAll(/([^,\n]+?)\s*(?:을|를)?\s*(?:pickup|pick\s*up|픽업|집어|집기|수거|적재)/gi),
  )
    .map((match) => normalizePickupTargetLabel(match?.[1] ?? ''))
    .filter(Boolean)
  if (explicit.length > 0) return explicit

  if (cleaned.includes('->')) {
    const byArrow = cleaned
      .split('->')
      .map((part) => normalizePickupTargetLabel(part))
      .filter(Boolean)
    if (byArrow.length > 0) return byArrow
  }

  return inferLinearStepsFromMessage(cleaned)
    .map((step) => normalizePickupTargetLabel(step.label))
    .filter(Boolean)
}

function findBySameContentName(
  candidates: FlowContextTaskContentSummary[],
  contentName: unknown,
): FlowContextTaskContentSummary | null {
  const key = normalizeNameKey(contentName)
  if (!key) return null

  return candidates.find((item) => {
    const name = normalizeNameKey(item.contentName ?? item.label)
    return name === key
  }) ?? null
}

function toPositionValue(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function resolveAppendAnchor(
  nonStartNodes: Array<Record<string, unknown>>,
  edges: Array<Record<string, unknown>>,
  fallbackStartX: number,
  fallbackStartY: number,
): { nodeId: string; x: number; y: number } {
  if (nonStartNodes.length === 0) {
    return { nodeId: 'start', x: fallbackStartX, y: fallbackStartY }
  }

  const outgoingSources = new Set(
    edges
      .map((edge) => String(edge?.source ?? '').trim())
      .filter(Boolean),
  )

  const tailCandidates = nonStartNodes.filter((node) => {
    const id = String(node?.id ?? '').trim()
    return Boolean(id) && !outgoingSources.has(id)
  })

  const pool = tailCandidates.length > 0 ? tailCandidates : nonStartNodes

  const chosen = pool.reduce<Record<string, unknown> | null>((best, node) => {
    if (!best) return node

    const bestPos = (best.position as Record<string, unknown> | undefined) ?? {}
    const nodePos = (node.position as Record<string, unknown> | undefined) ?? {}
    const bestX = toPositionValue(bestPos.x)
    const nodeX = toPositionValue(nodePos.x)
    if (nodeX !== bestX) return nodeX > bestX ? node : best

    const bestY = toPositionValue(bestPos.y)
    const nodeY = toPositionValue(nodePos.y)
    return nodeY >= bestY ? node : best
  }, null)

  const chosenPos = (chosen?.position as Record<string, unknown> | undefined) ?? {}
  return {
    nodeId: String(chosen?.id ?? '').trim() || 'start',
    x: toPositionValue(chosenPos.x),
    y: toPositionValue(chosenPos.y),
  }
}

function pickPickupTargetsFromMessage(
  flowContext: FlowContextSummary,
  message: string,
): FlowContextTaskContentSummary[] {
  const taskContents = Array.isArray(flowContext.taskContents) ? flowContext.taskContents : []
  const pickupCandidates = taskContents.filter((item) => {
    if (!isContentTaskContent(item)) return false
    const task = normalizeNameKey(item.taskName)
    return task === 'pickup' || task.includes('pickup')
  })
  if (pickupCandidates.length === 0) return []

  const labels = inferPickupTargetLabelsFromMessage(message)
  const used = new Set<string>()
  const selected: FlowContextTaskContentSummary[] = []

  const keyOf = (item: FlowContextTaskContentSummary) => `${item.taskId ?? '-'}:${item.contentId ?? '-'}:${item.label ?? ''}`

  for (const label of labels) {
    const found = pickTaskContentByStep(pickupCandidates, {
      label,
      taskName: 'PickUp',
      contentName: label,
    })
    if (!found) continue
    const key = keyOf(found)
    if (used.has(key)) continue
    used.add(key)
    selected.push(found)
  }

  if (selected.length > 0) return selected

  const normalizedMessage = normalizeMessageKey(message)
  const mentioned = pickupCandidates.filter((item) => {
    const label = normalizeMessageKey(item.label)
    const contentName = normalizeMessageKey(item.contentName)
    return (label && normalizedMessage.includes(label)) || (contentName && normalizedMessage.includes(contentName))
  })
  if (mentioned.length > 0) return mentioned.slice(0, 3)

  return [pickupCandidates[0]].filter(Boolean)
}

function buildPickupPutDownFlowDraftFromMessage(
  logger: ComposeToolDeps['logger'],
  flowContext: FlowContextSummary,
  message: string,
  flowMode?: 'default' | 'tree',
): Record<string, unknown> | null {
  const pickedUp = pickPickupTargetsFromMessage(flowContext, message)
  if (pickedUp.length === 0) return null

  const taskContents = Array.isArray(flowContext.taskContents) ? flowContext.taskContents : []
  const doesObjectExistCandidates = taskContents.filter((item) => {
    if (!isContentTaskContent(item)) return false
    const task = normalizeNameKey(item.taskName)
    return task === 'doesobjectexist' || task.includes('doesobjectexist')
  })
  if (doesObjectExistCandidates.length === 0) return null

  const putDownCandidates = taskContents.filter((item) => {
    if (!isContentTaskContent(item)) return false
    const task = normalizeNameKey(item.taskName)
    return task === 'putdown' || task.includes('putdown')
  })
  if (putDownCandidates.length === 0) return null

  const fullFlow = flowContext.fullFlow
  const fullFlowNodes = Array.isArray(fullFlow?.nodes) ? fullFlow.nodes : []
  const startNode = fullFlowNodes.find((node) => String(node.id ?? '') === 'start')
  const existingNodes = fullFlowNodes.filter((node) => String(node.id ?? '') !== 'start')
  const existingEdges = Array.isArray(fullFlow?.edges) ? fullFlow.edges : []
  const startX = Number((startNode?.position as Record<string, unknown> | undefined)?.x ?? 0)
  const startY = Number((startNode?.position as Record<string, unknown> | undefined)?.y ?? 0)
  const appendAnchor = resolveAppendAnchor(existingNodes, existingEdges, startX, startY)
  const baseX = appendAnchor.x + 140
  const baseY = appendAnchor.y
  const gapX = 140
  const seed = Date.now()

  const nodes: Array<Record<string, unknown>> = []
  const edges: Array<Record<string, unknown>> = existingEdges.map((edge) => ({ ...edge }))

  const ensuredStartNode = startNode
    ? { ...startNode }
    : {
      id: 'start',
      type: 'startNode',
      position: { x: startX, y: startY },
      data: { label: 'Start', taskName: 'Start', taskType: 'ROOT' },
    }
  nodes.push(ensuredStartNode)
  nodes.push(...existingNodes.map((node) => ({ ...node })))

  let previousNodeId = appendAnchor.nodeId
  let nodeIndex = 0

  for (const pickup of pickedUp) {
    const sharedContentName = pickup.contentName ?? pickup.label
    const pairedDoesObjectExist = findBySameContentName(doesObjectExistCandidates, sharedContentName)
    const pairedPutDown = findBySameContentName(putDownCandidates, sharedContentName)
    if (!pairedDoesObjectExist || !pairedPutDown) return null

    const stage = [
      {
        id: `ai-pickup-${seed}-${nodeIndex}`,
        label: pickup.label ?? sharedContentName ?? 'PickUp',
        taskName: pickup.taskName ?? 'PickUp',
        contentName: sharedContentName,
        taskId: pickup.taskId,
        contentId: pickup.contentId,
      },
      {
        id: `ai-does-object-exist-${seed}-${nodeIndex + 1}`,
        label: pairedDoesObjectExist.label ?? pairedDoesObjectExist.contentName ?? sharedContentName ?? 'DoesObjectExist',
        taskName: pairedDoesObjectExist.taskName ?? 'DoesObjectExist',
        contentName: pairedDoesObjectExist.contentName ?? sharedContentName,
        taskId: pairedDoesObjectExist.taskId,
        contentId: pairedDoesObjectExist.contentId,
      },
      {
        id: `ai-putdown-${seed}-${nodeIndex + 2}`,
        label: pairedPutDown.label ?? sharedContentName ?? 'PutDown',
        taskName: pairedPutDown.taskName ?? 'PutDown',
        contentName: sharedContentName,
        taskId: pairedPutDown.taskId,
        contentId: pairedPutDown.contentId,
      },
    ]

    for (const step of stage) {
      nodes.push({
        id: step.id,
        type: 'taskNode',
        position: { x: baseX + nodeIndex * gapX, y: baseY },
        data: {
          label: step.label,
          taskId: step.taskId,
          taskName: step.taskName,
          taskType: 'ACTION',
          contentId: step.contentId,
          contentName: step.contentName,
          properties: {},
        },
      })

      edges.push({
        id: `ai-edge-${seed}-${nodeIndex}`,
        source: previousNodeId,
        target: step.id,
        sourceHandle: 'right',
        targetHandle: 'left',
        data: {
          sourceNodeId: previousNodeId,
          targetNodeId: step.id,
          sourceHandleId: 'right',
          targetHandleId: 'left',
          edgeType: 'straight',
        },
        markerEnd: {
          type: 'arrowclosed',
          width: 10,
          height: 10,
          color: '#94a3b8',
        },
        style: {
          stroke: '#94a3b8',
          strokeWidth: 1.25,
        },
      })

      previousNodeId = step.id
      nodeIndex += 1
    }
  }

  return {
    mode: 'replace',
    layout: 'linear',
    flowMode: flowMode === 'tree' ? 'tree' : (fullFlow?.flowMode === 'tree' ? 'tree' : 'default'),
    nodes,
    edges,
    viewport: fullFlow?.viewport ?? { x: 0, y: 0, zoom: 1 },
  }
}

function pickPlayMotionTargetsFromMessage(
  flowContext: FlowContextSummary,
  message: string,
): FlowContextTaskContentSummary[] {
  const taskContents = Array.isArray(flowContext.taskContents) ? flowContext.taskContents : []
  const motionCandidates = taskContents.filter((item) => {
    if (!isContentTaskContent(item)) return false
    const task = normalizeNameKey(item.taskName)
    return task === 'playmotion' || task.includes('playmotion')
  })
  if (motionCandidates.length === 0) return []

  const normalizedMessage = normalizeMessageKey(message)
  const byMention = motionCandidates.filter((item) => {
    const label = normalizeMessageKey(item.label)
    const contentName = normalizeMessageKey(item.contentName)
    return (label && normalizedMessage.includes(label)) || (contentName && normalizedMessage.includes(contentName))
  })
  if (byMention.length > 0) return byMention.slice(0, 3)

  const inferred = inferLinearStepsFromMessage(message)
  const selected: FlowContextTaskContentSummary[] = []
  const used = new Set<string>()
  const keyOf = (item: FlowContextTaskContentSummary) => `${item.taskId ?? '-'}:${item.contentId ?? '-'}:${item.label ?? ''}`

  for (const step of inferred) {
    const found = pickTaskContentByStep(motionCandidates, {
      ...step,
      taskName: 'PlayMotion',
    })
    if (!found) continue
    const key = keyOf(found)
    if (used.has(key)) continue
    used.add(key)
    selected.push(found)
  }

  if (selected.length > 0) return selected

  return [motionCandidates[0]].filter(Boolean)
}

function buildPlayMotionParallelFlowDraftFromMessage(
  flowContext: FlowContextSummary,
  message: string,
  flowMode?: 'default' | 'tree',
): Record<string, unknown> | null {
  const motionTargets = pickPlayMotionTargetsFromMessage(flowContext, message)
  if (motionTargets.length === 0) return null

  const taskContents = Array.isArray(flowContext.taskContents) ? flowContext.taskContents : []
  const parallelControl = resolveControlTaskContentCandidate(taskContents, 'Parallel', 'parallel')
  const ttsCandidates = taskContents.filter((item) => {
    if (!isContentTaskContent(item)) return false
    const task = normalizeNameKey(item.taskName)
    return task === 'tts' || task.includes('tts')
  })

  const fullFlow = flowContext.fullFlow
  const fullFlowNodes = Array.isArray(fullFlow?.nodes) ? fullFlow.nodes : []
  const startNode = fullFlowNodes.find((node) => String(node.id ?? '') === 'start')
  const existingNodes = fullFlowNodes.filter((node) => String(node.id ?? '') !== 'start')
  const existingEdges = Array.isArray(fullFlow?.edges) ? fullFlow.edges : []
  const startX = Number((startNode?.position as Record<string, unknown> | undefined)?.x ?? 0)
  const startY = Number((startNode?.position as Record<string, unknown> | undefined)?.y ?? 0)
  const appendAnchor = resolveAppendAnchor(existingNodes, existingEdges, startX, startY)
  const baseX = appendAnchor.x + 220
  const baseY = appendAnchor.y
  const stageGapX = 220
  const seed = Date.now()

  const nodes: Array<Record<string, unknown>> = []
  const edges: Array<Record<string, unknown>> = existingEdges.map((edge) => ({ ...edge }))

  const ensuredStartNode = startNode
    ? { ...startNode }
    : {
      id: 'start',
      type: 'startNode',
      position: { x: startX, y: startY },
      data: { label: 'Start', taskName: 'Start', taskType: 'ROOT' },
    }
  nodes.push(ensuredStartNode)
  nodes.push(...existingNodes.map((node) => ({ ...node })))

  let prevSeqNodeId = appendAnchor.nodeId
  motionTargets.forEach((motionContent, index) => {
    const parallelId = `ai-motion-parallel-${seed}-${index}`
    const motionId = `ai-motion-${seed}-${index}`
    const ttsId = `ai-tts-${seed}-${index}`
    const x = baseX + index * stageGapX
    const ttsContent = findBySameContentName(ttsCandidates, motionContent.contentName ?? motionContent.label) ?? ttsCandidates[0] ?? null

    const childIds: string[] = [motionId]
    if (ttsContent?.contentId) childIds.push(ttsId)

    nodes.push({
      id: parallelId,
      type: 'taskNode',
      position: { x, y: baseY },
      data: {
        label: 'Parallel',
        taskId: parallelControl?.taskId,
        taskName: parallelControl?.taskName ?? 'Parallel',
        taskType: 'CONTROL',
        properties: {
          main_nodes: [motionId],
          failure_count: -1,
          success_count: 1,
        },
      },
    })

    nodes.push({
      id: motionId,
      type: 'taskNode',
      position: { x, y: baseY + 62 },
      data: {
        label: motionContent.label ?? motionContent.contentName ?? 'PlayMotion',
        taskId: motionContent.taskId,
        taskName: motionContent.taskName ?? 'PlayMotion',
        taskType: 'ACTION',
        contentId: motionContent.contentId,
        contentName: motionContent.contentName ?? motionContent.label,
        properties: {
          motion_id: motionContent.contentId,
        },
      },
    })

    if (ttsContent?.contentId) {
      nodes.push({
        id: ttsId,
        type: 'taskNode',
        position: { x, y: baseY + 127 },
        data: {
          label: ttsContent.label ?? ttsContent.contentName ?? 'Tts',
          taskId: ttsContent.taskId,
          taskName: ttsContent.taskName ?? 'Tts',
          taskType: 'ACTION',
          contentId: ttsContent.contentId,
          contentName: ttsContent.contentName ?? ttsContent.label,
          properties: {
            tts_id: ttsContent.contentId,
          },
        },
      })
    }

    edges.push({
      id: `e-${prevSeqNodeId}-${parallelId}`,
      source: prevSeqNodeId,
      target: parallelId,
      type: 'customEdge',
      markerEnd: {
        type: 'arrowclosed',
        width: 10,
        height: 10,
        color: '#94a3b8',
      },
      style: {
        stroke: '#94a3b8',
        strokeWidth: 1.25,
      },
    })

    for (const childId of childIds) {
      edges.push({
        id: `e-${parallelId}-${childId}`,
        source: parallelId,
        target: childId,
        type: 'customEdge',
        markerEnd: {
          type: 'arrowclosed',
          width: 10,
          height: 10,
          color: '#94a3b8',
        },
        style: {
          stroke: '#94a3b8',
          strokeWidth: 1.25,
        },
      })
    }

    prevSeqNodeId = parallelId
  })

  return {
    mode: 'replace',
    layout: 'linear',
    flowMode: flowMode === 'tree' ? 'tree' : (fullFlow?.flowMode === 'tree' ? 'tree' : 'default'),
    nodes,
    edges,
    viewport: fullFlow?.viewport ?? { x: 0, y: 0, zoom: 1 },
  }
}

function pickFirstByTaskName(
  taskContents: FlowContextTaskContentSummary[],
  taskName: string,
): FlowContextTaskContentSummary | null {
  const key = normalizeNameKey(taskName)
  if (!key) return null

  const candidate = taskContents.find((item) => {
    if (!isContentTaskContent(item)) return false
    const itemTask = normalizeNameKey(item.taskName)
    return itemTask === key || itemTask.includes(key) || key.includes(itemTask)
  })

  return candidate ?? null
}

function pickMoveStopsFromMessage(
  flowContext: FlowContextSummary,
  message: string,
): FlowContextTaskContentSummary[] {
  const taskContents = Array.isArray(flowContext.taskContents) ? flowContext.taskContents : []
  const moveCandidates = taskContents.filter((item) => {
    if (!isContentTaskContent(item)) return false
    const task = normalizeNameKey(item.taskName)
    return task === 'moveto' || task.includes('moveto')
  })
  if (moveCandidates.length === 0) return []

  const inferredSteps = inferLinearStepsFromMessage(message)
    .filter((step) => !isGenericNodePlaceholder(step.label))
    .map((step) => ({ ...step, taskName: 'MoveTo' }))

  const used = new Set<string>()
  const selected: FlowContextTaskContentSummary[] = []

  const keyOf = (item: FlowContextTaskContentSummary) => `${item.taskId ?? '-'}:${item.contentId ?? '-'}:${item.label ?? ''}`

  for (const step of inferredSteps) {
    const found = pickTaskContentByStep(moveCandidates, step)
    if (!found) continue
    const key = keyOf(found)
    if (used.has(key)) continue
    used.add(key)
    selected.push(found)
  }

  if (selected.length > 0) return selected

  for (const candidate of moveCandidates) {
    const key = keyOf(candidate)
    if (used.has(key)) continue
    used.add(key)
    selected.push(candidate)
    if (selected.length >= 3) break
  }

  return selected
}

function buildMoveParallelFlowDraftFromMessage(
  flowContext: FlowContextSummary,
  message: string,
  flowMode?: 'default' | 'tree',
): Record<string, unknown> | null {
  const stops = pickMoveStopsFromMessage(flowContext, message)
  if (stops.length === 0) return null

  const taskContents = Array.isArray(flowContext.taskContents) ? flowContext.taskContents : []
  const parallelControl = resolveControlTaskContentCandidate(taskContents, 'Parallel', 'parallel')
  const playFace = pickFirstByTaskName(taskContents, 'PlayFace')
  const playSound = pickFirstByTaskName(taskContents, 'PlaySound')

  const fullFlow = flowContext.fullFlow
  const fullFlowNodes = Array.isArray(fullFlow?.nodes) ? fullFlow.nodes : []
  const startNode = fullFlowNodes.find((node) => String(node.id ?? '') === 'start')
  const existingNodes = fullFlowNodes.filter((node) => String(node.id ?? '') !== 'start')
  const existingEdges = Array.isArray(fullFlow?.edges) ? fullFlow.edges : []

  const startX = Number((startNode?.position as Record<string, unknown> | undefined)?.x ?? 0)
  const startY = Number((startNode?.position as Record<string, unknown> | undefined)?.y ?? 0)
  const appendAnchor = resolveAppendAnchor(existingNodes, existingEdges, startX, startY)
  const baseX = appendAnchor.x + 220
  const baseY = appendAnchor.y
  const stageGapX = 220

  const seed = Date.now()
  const nodes: Array<Record<string, unknown>> = []
  const edges: Array<Record<string, unknown>> = existingEdges.map((edge) => ({ ...edge }))

  const ensuredStartNode = startNode
    ? { ...startNode }
    : {
      id: 'start',
      type: 'startNode',
      position: { x: startX, y: startY },
      data: { label: 'Start', taskName: 'Start', taskType: 'ROOT' },
    }
  nodes.push(ensuredStartNode)
  nodes.push(...existingNodes.map((node) => ({ ...node })))

  let prevSeqNodeId = appendAnchor.nodeId
  stops.forEach((moveContent, index) => {
    const parallelId = `ai-parallel-${seed}-${index}`
    const moveId = `ai-move-${seed}-${index}`
    const faceId = `ai-face-${seed}-${index}`
    const soundId = `ai-sound-${seed}-${index}`
    const x = baseX + index * stageGapX

    const childIds: string[] = [moveId]
    if (playFace?.contentId) childIds.push(faceId)
    if (playSound?.contentId) childIds.push(soundId)

    nodes.push({
      id: parallelId,
      type: 'taskNode',
      position: { x, y: baseY },
      data: {
        label: 'Parallel',
        taskId: parallelControl?.taskId,
        taskName: parallelControl?.taskName ?? 'Parallel',
        taskType: 'CONTROL',
        properties: {
          main_nodes: [moveId],
          failure_count: -1,
          success_count: 1,
        },
      },
    })

    nodes.push({
      id: moveId,
      type: 'taskNode',
      position: { x, y: baseY + 62 },
      data: {
        label: moveContent.label ?? moveContent.contentName ?? 'MoveTo',
        taskId: moveContent.taskId,
        taskName: moveContent.taskName ?? 'MoveTo',
        taskType: 'ACTION',
        contentId: moveContent.contentId,
        contentName: moveContent.contentName ?? moveContent.label,
        properties: {
          poi_id: moveContent.contentId,
        },
      },
    })

    if (playFace?.contentId) {
      nodes.push({
        id: faceId,
        type: 'taskNode',
        position: { x, y: baseY + 127 },
        data: {
          label: playFace.label ?? playFace.contentName ?? 'PlayFace',
          taskId: playFace.taskId,
          taskName: playFace.taskName ?? 'PlayFace',
          taskType: 'ACTION',
          contentId: playFace.contentId,
          contentName: playFace.contentName ?? playFace.label,
          properties: {
            face_id: playFace.contentId,
            repeat_count: '',
          },
        },
      })
    }

    if (playSound?.contentId) {
      nodes.push({
        id: soundId,
        type: 'taskNode',
        position: { x, y: baseY + 189 },
        data: {
          label: playSound.label ?? playSound.contentName ?? 'PlaySound',
          taskId: playSound.taskId,
          taskName: playSound.taskName ?? 'PlaySound',
          taskType: 'ACTION',
          contentId: playSound.contentId,
          contentName: playSound.contentName ?? playSound.label,
          properties: {
            sound_id: playSound.contentId,
            repeat_count: 1,
          },
        },
      })
    }

    edges.push({
      id: `ai-edge-seq-${seed}-${index}`,
      source: prevSeqNodeId,
      target: parallelId,
      sourceHandle: 'right',
      targetHandle: 'left',
      type: 'default',
      markerEnd: { type: 'arrowclosed', width: 10, height: 10, color: '#94a3b8' },
      style: { stroke: '#94a3b8', strokeWidth: 1.25 },
      data: {
        sourceNodeId: prevSeqNodeId,
        targetNodeId: parallelId,
        sourceHandleId: 'right',
        targetHandleId: 'left',
        edgeType: 'bezier',
      },
    })

    childIds.forEach((childId, childIndex) => {
      edges.push({
        id: `ai-edge-branch-${seed}-${index}-${childIndex}`,
        source: parallelId,
        target: childId,
        sourceHandle: 'left',
        targetHandle: 'left',
        type: 'default',
        markerEnd: { type: 'arrowclosed', width: 10, height: 10, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 1.25 },
        data: {
          sourceNodeId: parallelId,
          targetNodeId: childId,
          sourceHandleId: 'left',
          targetHandleId: 'left',
          edgeType: 'step',
        },
      })
    })

    prevSeqNodeId = parallelId
  })

  return {
    mode: 'replace',
    layout: 'manual',
    flowMode: flowMode === 'tree' ? 'tree' : (fullFlow?.flowMode === 'tree' ? 'tree' : 'default'),
    nodes,
    edges,
    viewport: fullFlow?.viewport ?? { x: 0, y: 0, zoom: 1 },
  }
}

function buildDocentFlowDraftFromMessage(
  flowContext: FlowContextSummary,
  message: string,
  flowMode?: 'default' | 'tree',
): Record<string, unknown> | null {
  const stops = pickMoveStopsFromMessage(flowContext, message)
  if (stops.length === 0) return null

  const taskContents = Array.isArray(flowContext.taskContents) ? flowContext.taskContents : []
  const parallelControl = resolveControlTaskContentCandidate(taskContents, 'Parallel', 'parallel')
  const playFace = pickFirstByTaskName(taskContents, 'PlayFace')
  const playSound = pickFirstByTaskName(taskContents, 'PlaySound')
  const playMotion = pickFirstByTaskName(taskContents, 'PlayMotion')
  const tts = pickFirstByTaskName(taskContents, 'Tts')

  if (!parallelControl || !playFace || !playSound || !playMotion || !tts) return null

  const fullFlow = flowContext.fullFlow
  const fullFlowNodes = Array.isArray(fullFlow?.nodes) ? fullFlow.nodes : []
  const startNode = fullFlowNodes.find((node) => String(node.id ?? '') === 'start')
  const existingNodes = fullFlowNodes.filter((node) => String(node.id ?? '') !== 'start')
  const existingEdges = Array.isArray(fullFlow?.edges) ? fullFlow.edges : []

  const startX = Number((startNode?.position as Record<string, unknown> | undefined)?.x ?? 0)
  const startY = Number((startNode?.position as Record<string, unknown> | undefined)?.y ?? 0)
  const appendAnchor = resolveAppendAnchor(existingNodes, existingEdges, startX, startY)
  const baseX = appendAnchor.x + 124
  const baseY = appendAnchor.y
  const stageGapX = 124
  const seed = Date.now()

  const nodes: Array<Record<string, unknown>> = []
  const edges: Array<Record<string, unknown>> = existingEdges.map((edge) => ({ ...edge }))

  const ensuredStartNode = startNode
    ? { ...startNode }
    : {
      id: 'start',
      type: 'startNode',
      position: { x: startX, y: startY },
      data: { label: 'Start', taskName: 'Start', taskType: 'ROOT' },
    }
  nodes.push(ensuredStartNode)
  nodes.push(...existingNodes.map((node) => ({ ...node })))

  let prevSeqNodeId = appendAnchor.nodeId
  let stageIndex = 0

  const pushEdge = (
    id: string,
    source: string,
    target: string,
    edgeType: 'bezier' | 'step',
    sourceHandle: 'right' | 'left',
  ) => {
    edges.push({
      id,
      source,
      target,
      sourceHandle,
      targetHandle: 'left',
      type: 'default',
      markerEnd: { type: 'arrowclosed', width: 10, height: 10, color: '#94a3b8' },
      style: { stroke: '#94a3b8', strokeWidth: 1.25 },
      data: {
        sourceNodeId: source,
        targetNodeId: target,
        sourceHandleId: sourceHandle,
        targetHandleId: 'left',
        edgeType,
      },
    })
  }

  stops.forEach((moveContent, index) => {
    const moveParallelId = `ai-docent-move-parallel-${seed}-${stageIndex}`
    const moveId = `ai-docent-move-${seed}-${stageIndex}`
    const soundId = `ai-docent-sound-${seed}-${stageIndex}`
    const faceId = `ai-docent-face-${seed}-${stageIndex}`
    const moveX = baseX + stageIndex * stageGapX

    nodes.push({
      id: moveParallelId,
      type: 'taskNode',
      position: { x: moveX, y: baseY },
      data: {
        label: 'Parallel',
        taskId: parallelControl.taskId,
        taskName: parallelControl.taskName ?? 'Parallel',
        taskType: 'CONTROL',
        properties: {
          main_nodes: [moveId],
          failure_count: -1,
          success_count: 1,
        },
      },
    })

    nodes.push({
      id: moveId,
      type: 'taskNode',
      position: { x: moveX, y: baseY + 68 },
      data: {
        label: moveContent.label ?? moveContent.contentName ?? 'MoveTo',
        taskId: moveContent.taskId,
        taskName: moveContent.taskName ?? 'MoveTo',
        taskType: 'ACTION',
        contentId: moveContent.contentId,
        contentName: moveContent.contentName ?? moveContent.label,
        properties: {
          poi_id: moveContent.contentId,
        },
      },
    })

    nodes.push({
      id: soundId,
      type: 'taskNode',
      position: { x: moveX, y: baseY + 140.75 },
      data: {
        label: playSound.label ?? playSound.contentName ?? 'PlaySound',
        taskId: playSound.taskId,
        taskName: playSound.taskName ?? 'PlaySound',
        taskType: 'ACTION',
        contentId: playSound.contentId,
        contentName: playSound.contentName ?? playSound.label,
        properties: {
          sound_id: playSound.contentId,
          repeat_count: 1,
        },
      },
    })

    nodes.push({
      id: faceId,
      type: 'taskNode',
      position: { x: moveX, y: baseY + 216 },
      data: {
        label: playFace.label ?? playFace.contentName ?? 'PlayFace',
        taskId: playFace.taskId,
        taskName: playFace.taskName ?? 'PlayFace',
        taskType: 'ACTION',
        contentId: playFace.contentId,
        contentName: playFace.contentName ?? playFace.label,
        properties: {
          face_id: playFace.contentId,
          repeat_count: '',
        },
      },
    })

    pushEdge(`ai-docent-seq-${seed}-${stageIndex}`, prevSeqNodeId, moveParallelId, 'bezier', 'right')
    pushEdge(`ai-docent-move-branch-${seed}-${stageIndex}-0`, moveParallelId, moveId, 'step', 'left')
    pushEdge(`ai-docent-move-branch-${seed}-${stageIndex}-1`, moveParallelId, soundId, 'step', 'left')
    pushEdge(`ai-docent-move-branch-${seed}-${stageIndex}-2`, moveParallelId, faceId, 'step', 'left')

    prevSeqNodeId = moveParallelId
    stageIndex += 1

    if (index >= stops.length - 1) return

    const docentParallelId = `ai-docent-parallel-${seed}-${stageIndex}`
    const ttsId = `ai-docent-tts-${seed}-${stageIndex}`
    const motionId = `ai-docent-motion-${seed}-${stageIndex}`
    const docentFaceId = `ai-docent-face-${seed}-${stageIndex}`
    const docentX = baseX + stageIndex * stageGapX
    const docentMainIds = [ttsId, motionId]

    nodes.push({
      id: docentParallelId,
      type: 'taskNode',
      position: { x: docentX, y: baseY },
      data: {
        label: 'Parallel',
        taskId: parallelControl.taskId,
        taskName: parallelControl.taskName ?? 'Parallel',
        taskType: 'CONTROL',
        properties: {
          main_nodes: docentMainIds,
          failure_count: -1,
          success_count: docentMainIds.length,
        },
      },
    })

    nodes.push({
      id: ttsId,
      type: 'taskNode',
      position: { x: docentX, y: baseY + 68 },
      data: {
        label: tts.label ?? tts.contentName ?? 'Tts',
        taskId: tts.taskId,
        taskName: tts.taskName ?? 'Tts',
        taskType: 'ACTION',
        contentId: tts.contentId,
        contentName: tts.contentName ?? tts.label,
        properties: {
          tts_id: tts.contentId,
        },
      },
    })

    nodes.push({
      id: motionId,
      type: 'taskNode',
      position: { x: docentX, y: baseY + 140.75 },
      data: {
        label: playMotion.label ?? playMotion.contentName ?? 'PlayMotion',
        taskId: playMotion.taskId,
        taskName: playMotion.taskName ?? 'PlayMotion',
        taskType: 'ACTION',
        contentId: playMotion.contentId,
        contentName: playMotion.contentName ?? playMotion.label,
        properties: {
          motion_id: playMotion.contentId,
          repeat_count: 1,
        },
      },
    })

    nodes.push({
      id: docentFaceId,
      type: 'taskNode',
      position: { x: docentX, y: baseY + 216 },
      data: {
        label: playFace.label ?? playFace.contentName ?? 'PlayFace',
        taskId: playFace.taskId,
        taskName: playFace.taskName ?? 'PlayFace',
        taskType: 'ACTION',
        contentId: playFace.contentId,
        contentName: playFace.contentName ?? playFace.label,
        properties: {
          face_id: playFace.contentId,
          repeat_count: '',
        },
      },
    })

    pushEdge(`ai-docent-seq-${seed}-${stageIndex}`, prevSeqNodeId, docentParallelId, 'bezier', 'right')
    pushEdge(`ai-docent-branch-${seed}-${stageIndex}-0`, docentParallelId, ttsId, 'step', 'left')
    pushEdge(`ai-docent-branch-${seed}-${stageIndex}-1`, docentParallelId, motionId, 'step', 'left')
    pushEdge(`ai-docent-branch-${seed}-${stageIndex}-2`, docentParallelId, docentFaceId, 'step', 'left')

    prevSeqNodeId = docentParallelId
    stageIndex += 1
  })

  return {
    mode: 'replace',
    layout: 'manual',
    flowMode: flowMode === 'tree' ? 'tree' : (fullFlow?.flowMode === 'tree' ? 'tree' : 'default'),
    nodes,
    edges,
    viewport: fullFlow?.viewport ?? { x: 0, y: 0, zoom: 1 },
  }
}

function resolveMoveFlowContext(contextRow: Record<string, unknown> | null): FlowContextSummary | null {
  if (!contextRow || typeof contextRow !== 'object') return null

  const selected =
    (contextRow.taskflow && typeof contextRow.taskflow === 'object' && !Array.isArray(contextRow.taskflow)
      ? contextRow.taskflow
      : null) ??
    (contextRow.flowContext && typeof contextRow.flowContext === 'object' && !Array.isArray(contextRow.flowContext)
      ? contextRow.flowContext
      : null) ??
    contextRow

  return toFlowContextSummary(selected)
}

export {
  buildDocentFlowDraftFromMessage,
  buildMoveParallelFlowDraftFromMessage,
  buildPickupPutDownFlowDraftFromMessage,
  buildPlayMotionParallelFlowDraftFromMessage,
  resolveMoveFlowContext,
}
