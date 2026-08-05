import type { ToolDefinition } from '../tool.type'
import {
  type ComposeToolDeps,
  type LinearTaskflowStep,
  buildDraftFromRagTemplate,
  buildDocentFlowDraftFromMessage,
  buildLinearFlowDraftFromSteps,
  buildMoveParallelFlowDraftFromMessage,
  buildPickupPutDownFlowDraftFromMessage,
  buildPlayMotionParallelFlowDraftFromMessage,
  buildReplacedDraftFromFullFlow,
  detectRequestedFlowMode,
  detectSaveCommand,
  inferLinearDraftPlanFromMessage,
  isContentTaskContent,
  isDeleteAllNodesMessage,
  isDocentFlowComposeMessage,
  isAlignRequestMessage,
  isAmbiguousModeChangeMessage,
  isAmbiguousSaveMessage,
  isGenericNodePlaceholder,
  isMoveFlowComposeMessage,
  isNodeLevelEditMessage,
  isPickUpFlowComposeMessage,
  isPlayMotionFlowComposeMessage,
  loadRagTaskflowTemplates,
  pickRagTaskflowTemplate,
  pickTaskContentByStep,
  normalizeNameKey,
  resolveFlowContextSummary,
  resolveMoveFlowContext,
  toLinearTaskflowStep,
} from './helpers'

function toFlowDefinitionFromDraft(draft: Record<string, unknown> | null | undefined) {
  if (!draft || typeof draft !== 'object') return undefined

  const nodes = Array.isArray(draft.nodes) ? draft.nodes : undefined
  const edges = Array.isArray(draft.edges) ? draft.edges : undefined
  if (!nodes || !edges) return undefined

  return {
    nodes,
    edges,
    viewport:
      draft.viewport && typeof draft.viewport === 'object' && !Array.isArray(draft.viewport)
        ? draft.viewport
        : { x: 0, y: 0, zoom: 1 },
    flowMode: draft.flowMode === 'tree' ? 'tree' : 'default',
  }
}

function resolveComposeUserMessage(
  contextRow: Record<string, unknown>,
  steps: LinearTaskflowStep[],
): string {
  const candidates = [
    contextRow?.__userMessage,
    contextRow?.userMessage,
    contextRow?.message,
    contextRow?.query,
    contextRow?.input,
    contextRow?.prompt,
  ]

  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim()
    if (text) return text
  }

  const docentLike = steps.some((step) => /도슨트|docent/i.test(
    `${String(step.label ?? '')} ${String(step.contentName ?? '')} ${String(step.taskName ?? '')}`,
  ))
  if (docentLike) return '도슨트 태스크플로우 구성해줘'

  return ''
}

function parseActionConnectMessage(message: string): { source: string; target: string } | null {
  const cleaned = String(message ?? '')
    .trim()
    .replace(/["'`]/g, '')
    .replace(/태스크\s*플로우|태스크플로우|taskflow|캔버스|canvas/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return null

  const match = cleaned.match(
    /^(.+?)\s*와\s*(.+?)\s*(?:노드\s*)?(?:연결|이어)(?:해줘|해\s*줘|해주세요|해|줘)?\s*$/i,
  )
  if (!match) return null

  const source = String(match[1] ?? '').trim()
  const target = String(match[2] ?? '').trim()
  if (!source || !target) return null

  return { source, target }
}

export function createComposeLinearTaskflowTool(deps: ComposeToolDeps): ToolDefinition {
  return {
    declaration: {
      name: 'compose_linear_taskflow',
      description:
        '사용자 요청을 저장 전 캔버스에 바로 적용할 수 있는 직선 태스크플로우 초안(JSON)으로 구성한다.',
      parameters: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            description: 'Start 다음 순서대로 배치할 단계 목록. CONTROL 노드 없이 직선으로만 구성한다.',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: '노드 라벨(필수)' },
                taskName: { type: 'string', description: '예: MoveTo' },
                contentName: { type: 'string', description: '콘텐츠/POI 이름' },
                taskType: { type: 'string' },
                taskId: { type: 'number' },
                contentId: { type: 'number' },
                properties: { type: 'object' },
              },
              required: ['label'],
            },
          },
          flowMode: {
            type: 'string',
            enum: ['default', 'tree'],
            description: '캔버스 방향. 직선 진행은 default 권장.',
          },
        },
        required: ['steps'],
      },
    },
    async execute(args, ctx) {
      const provided = Array.isArray(args?.steps) ? args.steps : []
      const normalized = provided
        .map((item) => toLinearTaskflowStep(item))
        .filter((item): item is LinearTaskflowStep => Boolean(item))

      const contextRow = (ctx.context as Record<string, unknown>)
      const userMessage = resolveComposeUserMessage(contextRow, normalized)
      const { flowContext, source } = resolveFlowContextSummary(contextRow)

      if (isAmbiguousModeChangeMessage(userMessage)) {
        return {
          clarification: '가로 모드와 세로 모드 중 어떤 방향으로 바꿀까요?',
          needUserInput: true,
        }
      }

      if (isDeleteAllNodesMessage(userMessage)) {
        const fullFlowNodes = Array.isArray(flowContext?.fullFlow?.nodes)
          ? (flowContext?.fullFlow?.nodes as Array<Record<string, unknown>>)
          : []
        const existingStartNode = fullFlowNodes.find((node) => {
          if (!node || typeof node !== 'object') return false
          const type = String((node as Record<string, unknown>).type ?? '').trim().toUpperCase()
          if (type === 'START') return true

          const data =
            (node as Record<string, unknown>).data &&
              typeof (node as Record<string, unknown>).data === 'object' &&
              !Array.isArray((node as Record<string, unknown>).data)
              ? ((node as Record<string, unknown>).data as Record<string, unknown>)
              : {}
          const role = String(data.role ?? '').trim().toLowerCase()
          const label = String(data.label ?? '').trim().toLowerCase()
          return role === 'start' || label === 'start'
        })

        const startOnlyNode = existingStartNode
          ? {
            ...existingStartNode,
          }
          : {
            id: 'start-1',
            type: 'START',
            position: { x: 0, y: 0 },
            data: {
              label: 'Start',
              role: 'start',
            },
          }
        const startOnlyFlowDefinition = {
          nodes: [startOnlyNode],
          edges: [],
          viewport: flowContext?.fullFlow?.viewport ?? { x: 0, y: 0, zoom: 1 },
          flowMode: args?.flowMode === 'tree' ? 'tree' : (flowContext?.fullFlow?.flowMode === 'tree' ? 'tree' : 'default'),
        }

        return {
          canvasDraft: {
            mode: 'replace',
            layout: 'linear',
            flowMode: startOnlyFlowDefinition.flowMode,
            nodes: startOnlyFlowDefinition.nodes,
            edges: startOnlyFlowDefinition.edges,
            viewport: startOnlyFlowDefinition.viewport,
          },
          flowDefinition: startOnlyFlowDefinition,
          assistantText: '요청에 따라 모든 노드를 초기화했습니다.',
        }
      }

      const connectRequest = parseActionConnectMessage(userMessage)
      if (connectRequest) {
        return {
          canvasDraft: {
            mode: 'edit',
            connectByName: [
              {
                source: connectRequest.source,
                target: connectRequest.target,
              },
            ],
          },
          assistantText: `${connectRequest.source}에서 ${connectRequest.target}로 연결을 시도합니다.`,
        }
      }

      if (isNodeLevelEditMessage(userMessage)) {
        return {
          clarification: '개별 노드 추가/수정/삭제는 지원하지 않습니다. "A로 갔다가 B로 갔다가 C로 가는 태스크플로우를 구성해줘"처럼 전체 흐름 구성으로 요청해 주세요.',
          needUserInput: true,
        }
      }

      if (isAmbiguousSaveMessage(userMessage)) {
        return {
          clarification: '임시 저장과 정식 저장 중 어떤 방식으로 저장할까요?',
          needUserInput: true,
        }
      }

      const ragTemplates = loadRagTaskflowTemplates()
      const matchedTemplate = pickRagTaskflowTemplate(userMessage, ragTemplates)
      if (matchedTemplate) {
        const draft = buildDraftFromRagTemplate(flowContext, matchedTemplate)
        if (!draft) {
          return {
            clarification: '현재 TaskPanel에서 템플릿 구성에 필요한 노드를 찾지 못했습니다. 콘텐츠 노드를 2개 이상 로드한 뒤 다시 요청해 주세요.',
            needUserInput: true,
          }
        }

        return {
          canvasDraft: draft,
          behaviorTreeXml: matchedTemplate.behaviorTreeXml,
          assistantText: matchedTemplate.assistantText || '요청하신 템플릿을 캔버스에 반영했습니다.',
        }
      }

      const requestedSave = detectSaveCommand(userMessage)
      if (requestedSave) {
        return {
          canvasCommand: {
            type: requestedSave,
          },
          assistantText: requestedSave === 'temp-save'
            ? '태스크 플로우 임시 저장을 실행합니다.'
            : '태스크 플로우 저장을 실행합니다.',
        }
      }

      const requestedMode = detectRequestedFlowMode(userMessage)
      if (requestedMode) {
        const modeDraft = buildReplacedDraftFromFullFlow(
          deps.logger,
          flowContext ?? {},
          [],
          [],
          requestedMode,
        )

        if (modeDraft) {
          return {
            canvasDraft: modeDraft,
            assistantText: requestedMode === 'tree'
              ? '세로 모드로 전환했습니다.'
              : '가로 모드로 전환했습니다.',
          }
        }
      }

      if (isAlignRequestMessage(userMessage)) {
        const alignedDraft = buildReplacedDraftFromFullFlow(
          deps.logger,
          flowContext ?? {},
          [],
          [],
          args?.flowMode === 'tree' ? 'tree' : 'default',
        )

        if (alignedDraft) {
          return {
            canvasDraft: alignedDraft,
            assistantText: '현재 노드 배치를 정렬했습니다.',
          }
        }
      }

      const reqId = String(contextRow?.__reqId ?? contextRow?.reqId ?? '').trim() || '-'
      deps.logger.log(
        `================= [2단계:컨텍스트확인] [reqId=${reqId}] status=ready reason=compose_linear_taskflow 실행을 위한 컨텍스트 점검`,
      )
      deps.logger.log(
        `================= [2-1단계:컨텍스트상태] [reqId=${reqId}] status=validated reason=source=${source}, fullFlow=${Boolean(flowContext?.fullFlow)}, flowDefinition=${Boolean(flowContext?.flowDefinition)}`,
      )

      if (isPickUpFlowComposeMessage(userMessage)) {
        deps.logger.log(
          `================= [3단계:의도분기] [reqId=${reqId}] status=matched reason=픽업 요청으로 판단되어 PickUp->DoesObjectExist->PutDown 조립 경로 선택`,
        )
        const pickupFlowContext = flowContext ?? resolveMoveFlowContext(contextRow)
        const pickupDraft = buildPickupPutDownFlowDraftFromMessage(
          deps.logger,
          pickupFlowContext ?? flowContext ?? {},
          userMessage,
          args?.flowMode === 'tree' ? 'tree' : 'default',
        )
        if (pickupDraft) {
          deps.logger.log(
            `================= [4단계:드래프트구성] [reqId=${reqId}] status=success reason=PickUp->DoesObjectExist->PutDown을 동일 contentName 페어로 구성 완료`,
          )
          const pickupFlowDefinition = toFlowDefinitionFromDraft(pickupDraft)
          return {
            canvasDraft: pickupDraft,
            ...(pickupFlowDefinition ? { flowDefinition: pickupFlowDefinition } : {}),
            assistantText: '픽업 태스크플로우를 PickUp→DoesObjectExist→PutDown 페어(동일 contentName)로 구성했습니다.',
          }
        }

        deps.logger.log(
          `================= [4단계:드래프트구성] [reqId=${reqId}] status=blocked reason=PickUp/DoesObjectExist/PutDown 동일 contentName 매칭 실패`,
        )

        return {
          clarification: 'PickUp, DoesObjectExist, PutDown을 동일 contentName으로 구성하려면 세 task의 콘텐츠 이름이 동일하게 등록되어 있어야 합니다.',
          needUserInput: true,
        }
      }

      if (isPlayMotionFlowComposeMessage(userMessage)) {
        deps.logger.log(
          `================= [3단계:의도분기] [reqId=${reqId}] status=matched reason=모션 요청으로 판단되어 PlayMotion+Tts Parallel 조립 경로 선택`,
        )
        const motionFlowContext = flowContext ?? resolveMoveFlowContext(contextRow)
        const motionParallelDraft = buildPlayMotionParallelFlowDraftFromMessage(
          motionFlowContext ?? flowContext ?? {},
          userMessage,
          args?.flowMode === 'tree' ? 'tree' : 'default',
        )
        if (motionParallelDraft) {
          deps.logger.log(
            `================= [4단계:드래프트구성] [reqId=${reqId}] status=success reason=PlayMotion(main)+Tts 동시 실행 Parallel 구성 완료`,
          )
          return {
            canvasDraft: motionParallelDraft,
            assistantText: '모션 태스크플로우를 Parallel(PlayMotion main + Tts 동시)로 구성했습니다.',
          }
        }

        deps.logger.log(
          `================= [4단계:드래프트구성] [reqId=${reqId}] status=blocked reason=PlayMotion/Tts/Parallel 콘텐츠를 컨텍스트에서 찾지 못함`,
        )

        return {
          clarification: 'PlayMotion과 Tts를 병렬로 구성할 수 없습니다. TaskPanel에 PlayMotion/Tts/Parallel이 있는지 확인해 주세요.',
          needUserInput: true,
        }
      }

      if (isDocentFlowComposeMessage(userMessage)) {
        deps.logger.log(
          `================= [3단계:의도분기] [reqId=${reqId}] status=matched reason=도슨트 요청으로 판단되어 이동/안내 교차 Parallel 조립 경로 선택`,
        )
        const docentFlowContext = flowContext ?? resolveMoveFlowContext(contextRow)
        const docentDraft = buildDocentFlowDraftFromMessage(
          docentFlowContext ?? flowContext ?? {},
          userMessage,
          args?.flowMode === 'tree' ? 'tree' : 'default',
        )
        if (docentDraft) {
          deps.logger.log(
            `================= [4단계:드래프트구성] [reqId=${reqId}] status=success reason=도슨트 태스크플로우를 이동 Parallel과 안내 Parallel 교차 시퀀스로 구성 완료`,
          )
          return {
            canvasDraft: docentDraft,
            assistantText: '도슨트 태스크플로우를 이동 Parallel과 안내 Parallel이 교차되는 시퀀스로 구성했습니다.',
          }
        }

        deps.logger.log(
          `================= [4단계:드래프트구성] [reqId=${reqId}] status=blocked reason=도슨트 시퀀스에 필요한 MoveTo/PlayMotion/Tts/PlayFace/PlaySound/Parallel을 찾지 못함`,
        )

        return {
          clarification: '도슨트 태스크플로우를 구성할 수 없습니다. TaskPanel에 MoveTo, PlayMotion, Tts, PlayFace, PlaySound, Parallel이 있는지 확인해 주세요.',
          needUserInput: true,
        }
      }

      if (isMoveFlowComposeMessage(userMessage)) {
        const inferredMoveSteps = inferLinearDraftPlanFromMessage(userMessage).steps ?? []
        const explicitMoveSteps = inferredMoveSteps.filter((step) => !isGenericNodePlaceholder(step.label))
        if (explicitMoveSteps.length === 0) {
          deps.logger.log(
            `================= [3단계:의도분기] [reqId=${reqId}] status=blocked reason=이동 목적지 정보가 없어 구성 전 재안내 필요`,
          )
          return {
            clarification: '이동 목적지를 알려주세요.\n예: 위치1에서 위치2로 가는 이동 태스크 플로우 만들어줘',
            needUserInput: true,
          }
        }

        deps.logger.log(
          `================= [3단계:의도분기] [reqId=${reqId}] status=matched reason=이동 경로 기반 요청으로 판단되어 Parallel 시퀀스 조립 경로 선택`,
        )
        const moveFlowContext = flowContext ?? resolveMoveFlowContext(contextRow)
        const moveTaskContents = Array.isArray(moveFlowContext?.taskContents)
          ? moveFlowContext.taskContents
          : []
        const moveCandidates = moveTaskContents.filter((item) => {
          if (!isContentTaskContent(item)) return false
          const task = normalizeNameKey(item.taskName)
          return task === 'moveto' || task.includes('moveto')
        })
        const explicitMoveStepsForMatch = explicitMoveSteps.map((step) => ({ ...step, taskName: 'MoveTo' }))
        const matchedMoveStepCount = explicitMoveStepsForMatch
          .filter((step) => Boolean(pickTaskContentByStep(moveCandidates, step)))
          .length
        const replacedWithFallbackExample =
          explicitMoveStepsForMatch.length > 0 &&
          moveCandidates.length > 0 &&
          matchedMoveStepCount < explicitMoveStepsForMatch.length

        if (replacedWithFallbackExample) {
          const availableMoveNodeNames = Array.from(new Set(
            moveCandidates
              .map((item) => String(item.contentName ?? item.label ?? '').trim())
              .filter(Boolean),
          ))
          const availablePreview = availableMoveNodeNames.slice(0, 8).join(', ')
          return {
            clarification: availablePreview
              ? `요청하신 이동 노드 이름을 TaskPanel에서 찾지 못했습니다. 사용 가능한 MoveTo 노드 이름으로 다시 알려주세요. 예: ${availablePreview}`
              : '요청하신 이동 노드 이름을 TaskPanel에서 찾지 못했습니다. 사용 가능한 MoveTo 노드 이름으로 다시 알려주세요.',
            needUserInput: true,
          }
        }

        const moveParallelDraft = buildMoveParallelFlowDraftFromMessage(
          moveFlowContext ?? flowContext ?? {},
          userMessage,
          args?.flowMode === 'tree' ? 'tree' : 'default',
        )
        if (moveParallelDraft) {
          deps.logger.log(
            `================= [4단계:드래프트구성] [reqId=${reqId}] status=success reason=이동 요청을 Parallel 체인으로 변환 완료`,
          )
          return {
            canvasDraft: moveParallelDraft,
            assistantText: '이동 태스크플로우를 Parallel 시퀀스 형태로 구성했습니다.',
          }
        }

        deps.logger.log(
          `================= [4단계:드래프트구성] [reqId=${reqId}] status=blocked reason=Parallel 시퀀스를 만들 MoveTo/보조 콘텐츠를 컨텍스트에서 찾지 못함`,
        )

        return {
          clarification: '이동 태스크플로우를 Parallel 시퀀스로 구성할 수 없습니다. TaskPanel의 MoveTo/Parallel/보조 콘텐츠가 있는지 확인해 주세요.',
          needUserInput: true,
        }
      }

      const inferred = inferLinearDraftPlanFromMessage(
        userMessage,
      )
      const steps = (normalized.length > 0 ? normalized : (inferred.steps ?? [])).slice(0, 12)

      const candidateSteps: LinearTaskflowStep[] = [
        ...steps,
      ]

      const ambiguousStep = candidateSteps.find((step) => isGenericNodePlaceholder(step.label))
      if (ambiguousStep) {
        if (/도슨트|docent/i.test(userMessage)) {
          const docentFlowContext = flowContext ?? resolveMoveFlowContext(contextRow)
          const docentDraft = buildDocentFlowDraftFromMessage(
            docentFlowContext ?? flowContext ?? {},
            userMessage,
            args?.flowMode === 'tree' ? 'tree' : 'default',
          )

          if (docentDraft) {
            return {
              canvasDraft: docentDraft,
              assistantText: '도슨트 태스크플로우를 이동 Parallel과 안내 Parallel이 교차되는 시퀀스로 구성했습니다.',
            }
          }

          return {
            clarification: '도슨트 태스크플로우를 구성할 수 없습니다. TaskPanel에 MoveTo, PlayMotion, Tts, PlayFace, PlaySound, Parallel이 있는지 확인해 주세요.',
            needUserInput: true,
          }
        }

        deps.logger.log(
          `================= [3단계:의도분기] [reqId=${reqId}] status=blocked reason=요청 대상 노드명이 일반 표현이라 명확화 필요`,
        )
        return {
          clarification: '어떤 노드를 추가하시겠어요? 노드의 이름이나 종류를 알려주시면 추가해 드릴 수 있습니다.',
          needUserInput: true,
        }
      }

      const replaceFlowDraft = flowContext
        ? buildLinearFlowDraftFromSteps(
          deps.logger,
          flowContext,
          steps,
          args?.flowMode === 'tree' ? 'tree' : 'default',
        )
        : null

      if (steps.length > 0 && !replaceFlowDraft) {
        if (/도슨트|docent/i.test(userMessage)) {
          const docentFlowContext = flowContext ?? resolveMoveFlowContext(contextRow)
          const docentDraft = buildDocentFlowDraftFromMessage(
            docentFlowContext ?? flowContext ?? {},
            userMessage,
            args?.flowMode === 'tree' ? 'tree' : 'default',
          )

          if (docentDraft) {
            return {
              canvasDraft: docentDraft,
              assistantText: '도슨트 태스크플로우를 이동 Parallel과 안내 Parallel이 교차되는 시퀀스로 구성했습니다.',
            }
          }

          return {
            clarification: '도슨트 태스크플로우를 구성할 수 없습니다. TaskPanel에 MoveTo, PlayMotion, Tts, PlayFace, PlaySound, Parallel이 있는지 확인해 주세요.',
            needUserInput: true,
          }
        }

        return {
          clarification: '요청하신 단계를 TaskPanel의 taskContents에서 찾지 못했습니다. taskContents에 있는 task/content 이름으로 다시 요청해 주세요.',
          needUserInput: true,
        }
      }

      const passthroughFullFlowDraft = flowContext?.fullFlow
        ? {
          mode: 'replace',
          layout: 'linear',
          flowMode: args?.flowMode === 'tree' ? 'tree' : (flowContext.fullFlow.flowMode === 'tree' ? 'tree' : 'default'),
          nodes: Array.isArray(flowContext.fullFlow.nodes) ? flowContext.fullFlow.nodes : [],
          edges: Array.isArray(flowContext.fullFlow.edges) ? flowContext.fullFlow.edges : [],
          viewport: flowContext.fullFlow.viewport ?? { x: 0, y: 0, zoom: 1 },
        }
        : null
      const preferredDraft = replaceFlowDraft ?? passthroughFullFlowDraft

      const fallbackDraft = {
        mode: 'replace',
        layout: 'linear',
        flowMode: args?.flowMode === 'tree' ? 'tree' : 'default',
        steps,
      }

      const finalDraft = preferredDraft ?? fallbackDraft
      return {
        canvasDraft: finalDraft,
        assistantText: '요청하신 태스크플로우를 캔버스에 구성했습니다.',
      }
    },
  }
}
