import type { ToolContext, ToolDefinition } from '../tool.type'
import { getPropertyTmsStore, type TaskSemantics } from '../../features/taskflow/service/property-tms-store.service'
import { CHAT_PROMPT_TYPE } from '../../features/chat/prompt-types'
import { renderPromptTemplate } from '../prompt-template.util'
import {
  findContentRef,
  findSuggestions,
  readCurrentGraph,
  readTaskContents,
  toMatchKey,
  TASKFLOW_CANVAS_SCREEN_KEY,
  type TaskContentRef,
} from './taskflow-palette'

/** LLM 이 내려주는 노드. 트리는 preorder + depth 로 표현해 id/좌표 환각을 원천 차단한다. */
type ComposeNodeArg = {
  depth: number
  taskName: string
  contentName?: string
}

export type TaskflowTreeNode = {
  taskName: string
  taskType: string
  contentName?: string
  contentId?: number
  children: TaskflowTreeNode[]
}

type ComposeFailure = {
  clarification: string
  suggestions: string[]
}

/** 사용자 요청과 실제 구성이 달라진 지점. 응답에 그대로 드러낸다. */
type ComposeNotes = {
  missing: string[]
  unresolved: string[]
  substituted: Array<{ requested: string; resolved: string }>
  /** 대상을 못 찾아 같은 Task 의 다른 콘텐츠로 임시 채운 경우. */
  placeholders: Array<{ requested: string; placedWith: string }>
}

const TOOL_NAME = 'compose_linear_taskflow'

function findTaskNamesByIntent(tasks: TaskSemantics[], intent: string): string[] {
  return tasks.filter((task) => String(task.composeHint.intent || '') === intent).map((task) => task.taskName)
}

// 제어 노드 이름을 하드코딩하지 않는다. 카탈로그에 없는 이름을 안내하면 LLM 이 그대로 쓰고 거부된다.
function buildDescription(catalogText: string, tasks: TaskSemantics[]): string {
  const concurrent = findTaskNamesByIntent(tasks, 'concurrent')
  const alternative = findTaskNamesByIntent(tasks, 'alternative')

  const lines = [
    '자연어 요청을 TaskFlow 로 구성한다. 노드를 preorder 순서로 나열하고 depth 로 부모-자식 관계를 표현한다.',
    '이 도구는 캔버스를 전부 새로 그린다. 기존 노드를 일부만 추가/교체/삭제하려면 edit_taskflow 를 쓴다.',
    'depth 0 노드는 여러 개 나열할 수 있고, 나열한 순서가 곧 실행 순서다. 순차 실행을 위해 별도의 Task 로 묶지 않는다.',
    '자식은 부모보다 depth 가 정확히 1 커야 한다.',
    '사용자가 지목한 대상(POI/TTS/모션/표정 이름)은 contentName 에 그대로 적는다.',
    '사용자가 말한 대로만 적고 "장소", "지점", "노드" 같은 말을 임의로 붙이거나 빼지 않는다. 이름이 한 글자라도 다르면 서버가 못 찾는다.',
    '어떤 Task 인지 모르고 대상 이름만 알면 taskName 을 빈 문자열로 두고 contentName 만 채운다. 서버가 Task 를 찾아준다.',
    'taskName 을 쓸 때는 반드시 아래 목록의 이름을 그대로 사용한다.',
  ]

  if (concurrent.length > 0) {
    lines.push(`"~하면서", "동시에" 처럼 같이 실행하는 동작은 ${concurrent.join(' 또는 ')} 의 자식으로 묶는다.`)
  }
  if (alternative.length > 0) {
    lines.push(`"성공하면 A 실패하면 B" 처럼 대안이 있는 경우는 ${alternative.join(' 또는 ')} 의 자식으로 묶는다.`)
  }

  return [...lines, '', '[사용 가능한 Task]', catalogText].join('\n')
}

/** 채팅에 그대로 노출되는 문장. 노드 이름은 ** 로 감싸 프론트가 강조하게 한다. */
function buildAssistantText(roots: TaskflowTreeNode[], notes: ComposeNotes): string {
  const labels: string[] = []
  const collect = (node: TaskflowTreeNode) => {
    labels.push(node.contentName ? `${node.contentName}(${node.taskName})` : node.taskName)
    node.children.forEach(collect)
  }
  roots.forEach(collect)

  const lines = [`${labels.map((label) => `**${label}**`).join(', ')} 로 태스크플로우를 구성했습니다.`]

  if (notes.substituted.length > 0) {
    const pairs = notes.substituted.map((row) => `**${row.requested}** → **${row.resolved}**`).join(', ')
    lines.push(`가장 가까운 항목으로 대체했습니다: ${pairs}`)
  }
  if (notes.placeholders.length > 0) {
    const pairs = notes.placeholders.map((row) => `**${row.requested}** → **${row.placedWith}**`).join(', ')
    lines.push(`⚠️ 대상을 찾지 못해 임시로 채웠습니다. 노드에서 직접 바꿔 주세요: ${pairs}`)
  }
  if (notes.missing.length > 0) {
    const names = notes.missing.map((name) => `**${name}**`).join(', ')
    lines.push(`일부 노드는 찾을 수 없어 구성하지 않았습니다: ${names}`)
  }
  if (notes.unresolved.length > 0) {
    const names = notes.unresolved.map((name) => `**${name}**`).join(', ')
    lines.push(`대상을 확인하지 못해 빈 노드로 두었습니다: ${names}`)
  }

  return lines.join('\n')
}

function toComposeNodes(value: unknown): ComposeNodeArg[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      depth: Number(item.depth),
      taskName: String(item.taskName || '').trim(),
      contentName: item.contentName === undefined ? undefined : String(item.contentName).trim(),
    }))
    .filter((item) => Number.isInteger(item.depth) && item.depth >= 0)
    .filter((item) => item.taskName.length > 0 || Boolean(item.contentName))
}

/** depth 순서 위반이면 실패 사유를, 정상이면 depth 0 노드들을 실행 순서대로 반환한다. */
function buildForest(
  nodes: ComposeNodeArg[],
  store: NonNullable<ReturnType<typeof getPropertyTmsStore>>,
  contents: TaskContentRef[],
  notes: ComposeNotes,
): TaskflowTreeNode[] | ComposeFailure {
  if (nodes[0].depth !== 0) {
    return { clarification: '첫 노드는 최상위여야 합니다. 요청을 조금 더 구체적으로 말씀해 주세요.', suggestions: [] }
  }

  const stack: TaskflowTreeNode[] = []
  const roots: TaskflowTreeNode[] = []
  // 생략한 노드의 depth. 그보다 깊은 후속 노드는 자식이므로 함께 버린다.
  let skipDepth: number | null = null

  for (const [index, node] of nodes.entries()) {
    if (index > 0 && node.depth > nodes[index - 1].depth + 1) {
      return { clarification: '노드 계층이 건너뛰었습니다. 요청을 다시 말씀해 주세요.', suggestions: [] }
    }

    if (skipDepth !== null) {
      if (node.depth > skipDepth) continue
      skipDepth = null
    }

    const taskKnown = node.taskName.length > 0 && Boolean(store.get(node.taskName))

    // taskName 을 명시했는데 카탈로그에 없으면 다른 Task 로 넘어가지 않는다.
    if (node.taskName.length > 0 && !taskKnown) {
      notes.missing.push(node.taskName)
      skipDepth = node.depth
      continue
    }

    // 콘텐츠 이름이 있으면 실제 팔레트에서 찾아 Task 를 역추적하고 contentId 까지 확정한다.
    const contentRef = node.contentName ? findContentRef(node.contentName, node.taskName, contents) : undefined
    const effectiveTaskName = taskKnown ? node.taskName : contentRef?.taskName
    const semantics = effectiveTaskName ? store.get(effectiveTaskName) : undefined

    if (!semantics) {
      notes.missing.push(String(node.contentName))
      skipDepth = node.depth
      continue
    }

    const treeNode: TaskflowTreeNode = {
      taskName: semantics.taskName,
      taskType: semantics.taskType,
      children: [],
    }
    if (contentRef && node.contentName) {
      treeNode.contentName = contentRef.contentName
      treeNode.contentId = contentRef.contentId

      if (toMatchKey(contentRef.contentName) !== toMatchKey(node.contentName)) {
        notes.substituted.push({ requested: node.contentName, resolved: contentRef.contentName })
      }
    } else if (node.contentName) {
      // 대상을 못 찾아도 구조는 만든다. 같은 Task 의 다른 콘텐츠로 임시 채우고 응답에 경고를 남긴다.
      const placeholder = contents.find((row) => toMatchKey(row.taskName) === toMatchKey(semantics.taskName))
      if (!placeholder) {
        notes.missing.push(node.contentName)
        skipDepth = node.depth
        continue
      }

      treeNode.contentName = placeholder.contentName
      treeNode.contentId = placeholder.contentId
      notes.placeholders.push({ requested: node.contentName, placedWith: placeholder.contentName })
    }

    if (node.depth === 0) {
      roots.push(treeNode)
      stack.length = 0
      stack.push(treeNode)
      continue
    }

    const parent = stack[node.depth - 1]
    if (!parent) {
      return { clarification: '노드 계층을 해석하지 못했습니다. 요청을 다시 말씀해 주세요.', suggestions: [] }
    }

    parent.children.push(treeNode)
    stack.length = node.depth
    stack.push(treeNode)
  }

  if (roots.length === 0) {
    return {
      clarification: '요청하신 동작을 사용할 수 있는 Task 에서 찾지 못했습니다.',
      suggestions: notes.missing.flatMap((name) => findSuggestions(name, store.list())).slice(0, 3),
    }
  }

  return roots
}

/** CONTROL 인데 자식이 없는 노드 이름을 모은다. 자식 개수 상한 같은 세부 규칙은 tms 앱이 검증한다. */
function collectEmptyControls(node: TaskflowTreeNode, found: string[]): string[] {
  if (node.taskType === 'CONTROL' && node.children.length === 0) {
    found.push(node.taskName)
  }

  for (const child of node.children) {
    collectEmptyControls(child, found)
  }

  return found
}

type ComposeInsertOp = {
  after: string
  step: { label: string; taskName: string; taskType?: string; contentName?: string; contentId?: number }
  appendOnly: true
  sourceHandle: 'left' | 'right'
  targetHandle: 'left'
  afterCreatedIndex?: number
  placement?: 'right-of-all'
}

/** 캔버스에 이미 노드가 있을 때, roots 트리를 edit_taskflow 와 같은 insertAfter 목록으로 펼친다.
 * 전체를 새로 그리는 replace 가 아니라, 현재 흐름 우측 끝에 이어붙인다.
 */
function flattenTreeToInsertOps(roots: TaskflowTreeNode[]): ComposeInsertOp[] {
  const ops: ComposeInsertOp[] = []

  const toStep = (node: TaskflowTreeNode) => ({
    label: node.contentName || node.taskName,
    taskName: node.taskName,
    taskType: node.taskType,
    contentName: node.contentName,
    contentId: node.contentId,
  })

  const walkChildren = (node: TaskflowTreeNode, parentIndex: number) => {
    for (const child of node.children ?? []) {
      ops.push({
        after: '',
        afterCreatedIndex: parentIndex,
        step: toStep(child),
        appendOnly: true,
        sourceHandle: 'left',
        targetHandle: 'left',
      })
      walkChildren(child, ops.length - 1)
    }
  }

  let previousRootIndex: number | undefined
  for (const root of roots) {
    ops.push({
      after: '',
      step: toStep(root),
      appendOnly: true,
      sourceHandle: 'right',
      targetHandle: 'left',
      ...(previousRootIndex !== undefined ? { afterCreatedIndex: previousRootIndex } : { placement: 'right-of-all' }),
    })
    const rootIndex = ops.length - 1
    walkChildren(root, rootIndex)
    previousRootIndex = rootIndex
  }

  return ops
}

export function createComposeTaskflowTool(): ToolDefinition | null {
  const store = getPropertyTmsStore()
  if (!store) return null

  const catalogText = store.buildCatalogText()
  if (!catalogText) return null

  // 설명은 prompt 테이블에서 온다. 행이 없으면 tool 을 등록하지 않아 설정 누락이 드러나게 한다.
  const description = buildDescription(catalogText, store.list())
  if (!description) return null

  return {
    declaration: {
      name: TOOL_NAME,
      description,
      parameters: {
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            description: 'preorder 로 나열한 노드 목록',
            items: {
              type: 'object',
              properties: {
                depth: { type: 'integer', description: '최상위는 0, 자식은 부모 depth + 1' },
                taskName: { type: 'string', description: '카탈로그에 있는 Task 이름. 모를 때는 빈 문자열' },
                contentName: { type: 'string', description: '사용자가 지목한 콘텐츠 이름(POI/TTS/모션/표정 등)' },
              },
              required: ['depth'],
            },
          },
        },
        required: ['nodes'],
      },
    },

    execute: async (args: Record<string, any>, ctx: ToolContext) => {
      const nodes = toComposeNodes(args.nodes)

      // orchestrator 의 결정적 경로가 빈 인자로 먼저 호출한다. 빈 결과를 줘야 LLM 툴콜 경로로 넘어간다.
      if (nodes.length === 0) {
        return {}
      }

      // 비활성 Task 의 콘텐츠가 먼저 잡혀 역추적이 실패하지 않도록 카탈로그에 있는 Task 로 한정한다.
      const contents = readTaskContents(ctx).filter((row) => Boolean(store.get(row.taskName)))
      const notes: ComposeNotes = { missing: [], unresolved: [], substituted: [], placeholders: [] }
      const result = buildForest(nodes, store, contents, notes)
      if ('clarification' in result) {
        ctx.log?.log(`[${TOOL_NAME}] rejected reason=${result.clarification}`)
        return result
      }

      const emptyControls = result.flatMap((root) => collectEmptyControls(root, []))
      if (emptyControls.length > 0) {
        return {
          clarification: `${emptyControls.join(', ')} 아래에 실행할 동작이 없습니다.`,
          suggestions: [],
        }
      }

      ctx.log?.log(
        `[${TOOL_NAME}] composed roots=${result.map((root) => root.taskName).join('>')} nodes=${nodes.length} contents=${contents.length}`,
      )
      if (notes.missing.length > 0) {
        ctx.log?.log(`[${TOOL_NAME}] skipped names=${notes.missing.join(', ')}`)
      }
      if (notes.unresolved.length > 0) {
        ctx.log?.log(`[${TOOL_NAME}] content-unresolved names=${notes.unresolved.join(', ')}`)
      }

      const payload: Record<string, unknown> = {
        // 캔버스에 이미 노드가 있으면 지우고 새로 그리지 않고, 현재 흐름 우측 끝에 이어붙인다.
        canvasDraft: readCurrentGraph(ctx).nodes.length > 0
          ? { mode: 'edit', insertAfter: flattenTreeToInsertOps(result) }
          : { mode: 'replace', roots: result },
        assistantText: buildAssistantText(result, notes),
      }
      if (notes.missing.length > 0) {
        payload.skippedNodes = notes.missing
      }
      if (notes.substituted.length > 0) {
        payload.substitutedContents = notes.substituted
      }
      if (notes.unresolved.length > 0) {
        payload.unresolvedContents = notes.unresolved
      }

      return payload
    },
  }
}
