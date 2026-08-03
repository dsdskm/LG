import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react'

import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  MarkerType,
  ConnectionMode,
  type ReactFlowInstance,
  type OnInit,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  useUpdateNodeInternals
} from '@xyflow/react'

import { useTranslation } from 'react-i18next'
import { Play, Pause, Square, SkipForward } from 'lucide-react'
import { ensureStartNode } from '@/utils/node.util'
import TaskNode from '../DrawPanel/Node/TaskNode'
import StartNode from '../DrawPanel/Node/StartNode'
import TaskEdge from '../DrawPanel/Edge/TaskEdge'
import NodeInfoSection from '../PropertyPanel/components/VisualDataSection/sections/NodeInfoSection'
import type { InfoTab } from '../PropertyPanel/types'
import { useFlowEditorStore } from '@/store/taskflow.canvas.store'
import { ToggleSwitch } from '@repo/ui'

import {
  CanvasRoot,
  CanvasMain,
  Toolbar,
  SegmentedWrap,
  SegmentedButton,
  InspectShell,
  InspectBar,
  InspectGroup,
  InspectLabel,
  TickRateControl,
  TickRateButton,
  TickRateInput,
  Divider,
  ControlsGroup,
  CtrlButton,
  PropertyPanelWrap,
  PropertyPanelHeader,
  EmptyPanelWrap,
  EmptyPanelText,
  CanvasFlowWrap,
  PanelRoot,
  FlowFill,
  CanvasWrapper,
  FlowTitleBar,
  FlowTitle,
  FlowTitleLabel,
  FlowTitleName,
  LegendWrap,
  LegendItem,
  LegendDot,
  LegendLabel
} from './styles'
import { NodeStatus } from '@/types/api/device'
import { Div } from '@/assets'

type FlowMode = 'default' | 'tree'
import NodeInspectDialog, { DEFAULT_NODE_CONFIG, type NodeSimConfig } from './NodeInspectDialog'
import AstView from './AstView'
import ConfirmModal from '@/pages/components/modal/ConfirmModal'
import { buildBehaviorTreeFromFlowDefinition } from '@/bt/build'
import { validateSemantics } from '@/bt/validation'
import type { BtAstNode } from '@/bt/types'
import { SimulationExecutor } from '@/bt/execution/simulationExecutor'
import { EMPTY_SNAPSHOT, type ExecSnapshot, type ExecStatus, type FlowExecutor } from '@/bt/execution/executor'
import VisualDataSection from '../PropertyPanel/components/VisualDataSection'
import PoiPreview from '../PropertyPanel/components/VisualDataSection/previews/PoiPreview'
import MotionPreview from '../PropertyPanel/components/VisualDataSection/previews/MotionPreview'
import FacePreview from '../PropertyPanel/components/VisualDataSection/previews/FacePreview'
import SoundPreview from '../PropertyPanel/components/VisualDataSection/previews/SoundPreview'
import { PlayStatus } from '../PropertyPanel/components/VisualDataSection/previews/types.preview'
import { useContentTaskStore } from '../store/useContentTaskStore'
import { useResponsiveStore } from '@repo/stores'
import { MobilePropertySheet } from '../components/MobilePropertySheet'
import { CONTENT_TYPE } from '@/common/contentTypes'
import ObjectPreview from '../PropertyPanel/components/VisualDataSection/previews/ObjectPreview'
// 로컬 개발 환경 여부. .env.local 의 VITE_ENV=local 로 판별(빌드 환경엔 없음).
const IS_LOCAL_ENV = import.meta.env.VITE_ENV === 'local'

type FlowDefinition = {
  nodes?: any[]
  edges?: any[]
  flowMode?: FlowMode
  viewport?: {
    x: number
    y: number
    zoom: number
  }
}

type Props = {
  flowDefinition?: FlowDefinition | null
  activeNodeList?: NodeStatus[]
  displayOption?: 'RUNNING_STATUS'
  flowName?: string
}

type CanvasMode = 'view' | 'inspect'

const STATUS_LEGEND = [
  { label: '실행중', border: '#60a5fa', bg: '#eff6ff' },
  { label: '성공', border: '#34d399', bg: '#ecfdf5' },
  { label: '실패', border: '#fb7185', bg: '#fff1f2' },
  { label: '대기', border: '#d1d5db', bg: '#ffffff' }
]

// 미니맵을 캔버스 크기에 비례시키는 비율(가로/세로 각각 캔버스의 22%)과 크기 제한
const MINIMAP_RATIO = 0.22
const MINIMAP_MIN = 120
const MINIMAP_MAX = 320

const nodeTypes: NodeTypes = {
  taskNode: TaskNode,
  startNode: StartNode
}

const edgeTypes: EdgeTypes = {
  taskEdge: TaskEdge
}

function normalizeFlowMode(value: any): FlowMode {
  return value === 'tree' ? 'tree' : 'default'
}

function EmptyPropertyPanel() {
  const { t } = useTranslation('tms')

  return (
    <EmptyPanelWrap>
      <EmptyPanelText>{t('canvas.viewer.emptyHint')}</EmptyPanelText>
    </EmptyPanelWrap>
  )
}

function PropertyPanel({
  selectedNode,
  tab,
  onChangeTab
}: {
  selectedNode: any | null
  tab: InfoTab
  onChangeTab: Dispatch<SetStateAction<InfoTab>>
}) {
  const { t } = useTranslation('tms')

  return (
    <PropertyPanelWrap>
      <PropertyPanelHeader>{t('canvas.viewer.properties')}</PropertyPanelHeader>

      {!selectedNode ? (
        <EmptyPropertyPanel />
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '0 4px' }}>
          <NodeInfoSection
            viewMode="node"
            selectedData={selectedNode.data ?? {}}
            infoTab={tab}
            setInfoTab={onChangeTab}
            readOnly
          />
        </div>
      )}
    </PropertyPanelWrap>
  )
}

function ContentsPanel({ selectedNode }: { selectedNode: any | null }) {
  const [contentNodeMap, setContentNodeMap] = useState<Map<string, any>>(new Map())
  const addContentTask = useContentTaskStore((state) => state.addContentTask)
  console.log('selectedNode info ', selectedNode)

  useEffect(() => {
    if (!selectedNode?.data?.contentTypeName) return
    const typeName = selectedNode?.data?.contentTypeName
    if (!typeName) return

    setContentNodeMap((prev) => {
      if (prev.get(typeName) === selectedNode) return prev
      const next = new Map(prev)
      next.set(typeName, selectedNode)
      return next
    })
    addContentTask({
      nodeId: selectedNode.id,
      playStatus: 'READY'
    })
  }, [selectedNode])

  const poiContent = contentNodeMap.get(CONTENT_TYPE.POI)
  const motionContent = contentNodeMap.get(CONTENT_TYPE.MOTION)
  const faceContent = contentNodeMap.get(CONTENT_TYPE.FACE_VIDEO) ?? contentNodeMap.get(CONTENT_TYPE.FACE_IMAGE)
  const soundContent = contentNodeMap.get(CONTENT_TYPE.BGM)
  const ttsContent = contentNodeMap.get(CONTENT_TYPE.TTS)
  const objectContent = contentNodeMap.get(CONTENT_TYPE.OBJECT)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto', gap: 10, padding: '8px 4px 0px 0px' }}>
        {faceContent && <FacePreview node={{ data: faceContent?.data ?? {} }} nodeId={faceContent?.id} />}
        {motionContent && <MotionPreview node={{ data: motionContent?.data ?? {} }} nodeId={motionContent?.id} />}
        {poiContent && <PoiPreview node={{ data: poiContent?.data ?? {} }} nodeId={poiContent?.id} />}
        {soundContent && <SoundPreview node={{ data: soundContent?.data ?? {} }} nodeId={soundContent?.id} />}
        {ttsContent && <SoundPreview node={{ data: ttsContent?.data ?? {} }} nodeId={ttsContent?.id} />}
        {objectContent && <ObjectPreview node={{ data: objectContent?.data ?? {} }} nodeId={objectContent?.id} />}
      </div>
    </>
  )
}

function InnerReadonlyCanvas({ flowDefinition, activeNodeList, displayOption, flowName }: Props) {
  const { t } = useTranslation('tms')

  const getPlayStatusById = useContentTaskStore((state) => state.getPlayStatusById)

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const rfRef = useRef<ReactFlowInstance<any, any> | null>(null)
  const refContentsStatus = useRef(new Map<string, PlayStatus>())
  const updateNodeInternals = useUpdateNodeInternals()

  const [mode, setMode] = useState<CanvasMode>('view')
  const [propertyTab, setPropertyTab] = useState<InfoTab>('task')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [runMode, setRunMode] = useState<'auto' | 'manual'>('auto')
  const [tickRate, setTickRate] = useState<number>(1)
  // 로컬 전용: BT(AST) 텍스트 뷰 표시 토글
  const [showAst, setShowAst] = useState(false)

  // ReactFlow 컨테이너 크기(미니맵을 이 크기에 비례시키기 위해 관찰)
  const [flowSize, setFlowSize] = useState({ width: 0, height: 0 })

  // Executor(시뮬/디바이스)로부터 받은 현재 실행 스냅샷. FE 는 이것만 보고 렌더링한다.
  const [snapshot, setSnapshot] = useState<ExecSnapshot>(EMPTY_SNAPSHOT)
  const [isPlaying, setIsPlaying] = useState(false)
  const [started, setStarted] = useState(false)

  // Start 시점에 "컴파일"(buildBehaviorTree)한 결과. 렌더 시점엔 빌드하지 않는다.
  const [compiledModel, setCompiledModel] = useState<BtAstNode | null>(null)
  // 컴파일(정적 검증) 실패 원인 — 팝업으로 표시
  const [compileError, setCompileError] = useState<string | null>(null)

  // 노드별 점검 설정(강제 결과/return 값/breakpoint)과 현재 열린 설정 팝업 노드
  const [nodeConfigs, setNodeConfigs] = useState<Record<string, NodeSimConfig>>({})
  const [configNodeId, setConfigNodeId] = useState<string | null>(null)

  // executor/auto-loop 가 최신 설정·속도를 재생성 없이 읽도록 ref 로 미러링
  const nodeConfigsRef = useRef(nodeConfigs)
  useEffect(() => {
    nodeConfigsRef.current = nodeConfigs
  }, [nodeConfigs])
  const tickRateRef = useRef(tickRate)
  useEffect(() => {
    tickRateRef.current = tickRate
  }, [tickRate])
  // showAst 도 resolveResult(=executor) 재생성 없이 실시간으로 읽기 위해 ref 로 미러링
  const showAstRef = useRef(showAst)
  useEffect(() => {
    showAstRef.current = showAst
  }, [showAst])

  // ReactFlow wrapper 크기를 관찰해 미니맵 크기를 비례 조정한다.
  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => setFlowSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 미니맵을 캔버스 크기에 비례시킨다(최소/최대 clamp 적용).
  const minimapStyle = useMemo<React.CSSProperties>(() => {
    if (!flowSize.width || !flowSize.height) return {}
    const clamp = (v: number) => Math.round(Math.min(MINIMAP_MAX, Math.max(MINIMAP_MIN, v)))
    return {
      width: clamp(flowSize.width * MINIMAP_RATIO),
      height: clamp(flowSize.height * MINIMAP_RATIO)
    }
  }, [flowSize])

  const safeFlow = useMemo(() => {
    const ensured = ensureStartNode(flowDefinition ?? { nodes: [], edges: [] }) as FlowDefinition

    return {
      ...ensured,
      flowMode: normalizeFlowMode(flowDefinition?.flowMode ?? ensured.flowMode)
    }
  }, [flowDefinition])

  const readonlyFlowMode = useMemo<FlowMode>(() => {
    return normalizeFlowMode(safeFlow.flowMode)
  }, [safeFlow.flowMode])

  const rawNodes = useMemo(() => {
    return safeFlow.nodes ?? []
  }, [safeFlow.nodes])

  // 콘텐츠(contentId 보유) 노드 id 집합 — resolveResult 에서 참조(executor 재생성 없이 ref 로)
  const contentNodeIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const ids = new Set<string>()
    for (const n of rawNodes) {
      if (typeof (n as any)?.data?.contentId === 'number') ids.add(String(n.id))
    }
    contentNodeIdsRef.current = ids
  }, [rawNodes])

  const rawEdges = useMemo(() => {
    return safeFlow.edges ?? []
  }, [safeFlow.edges])

  // START(ROOT) 노드 id
  const startNodeId = useMemo(() => {
    const list = safeFlow.nodes ?? []
    const root = list.find((n: any) => String(n?.data?.taskType).toUpperCase() === 'ROOT')
    return root?.id ?? list.find((n: any) => n.id === 'start')?.id ?? list[0]?.id ?? null
  }, [safeFlow])

  // 노드별 강제 설정(forced)을 실행 결과로 변환(현재 설정을 ref 로 실시간 읽음 → 실행기 재생성 방지).
  //  - NORMAL/SUCCESS → SUCCESS, FAILURE → FAILURE, RUNNING → RUNNING
  const resolveResult = useCallback((nodeId: string): ExecStatus => {
    const forced = nodeConfigsRef.current[nodeId]?.forced ?? DEFAULT_NODE_CONFIG.forced
    if (forced === 'FAILURE') return 'FAILURE'
    if (forced === 'RUNNING') return 'RUNNING'
    if (forced === 'NORMAL') {
      if (showAstRef.current) return 'SUCCESS'
      // 콘텐츠 없는 일반 노드 → 즉시 SUCCESS, 콘텐츠 노드 → 콘텐츠 상태(기본 RUNNING) 따름
      if (!contentNodeIdsRef.current.has(nodeId)) return 'SUCCESS'
      return checkViaContentsStatus(nodeId, 'RUNNING')
    }

    return 'SUCCESS'
  }, [])

  const checkViaContentsStatus = (nodeId: string, defaultValue: ExecStatus) => {
    const contentStatus = getPlayStatusById(nodeId)
    console.log('play status', contentStatus)
    let result = defaultValue
    switch (contentStatus) {
      case 'PLAYING':
        result = 'RUNNING'
        break
      case 'READY':
        result = 'RUNNING'
        break
      case 'COMPLETED':
        result = 'SUCCESS'
        break
      case 'FAILURE':
        result = 'FAILURE'
        break
    }
    return result
  }

  // 실행기: 지금은 시뮬레이터. 실제 로봇 연결 시 DeviceExecutor 로 교체만 하면 FE 는 그대로 동작.
  // flow / START 노드가 바뀌면 새 실행기를 만든다.
  const executor = useMemo<FlowExecutor>(() => {
    return new SimulationExecutor(safeFlow, startNodeId, resolveResult)
  }, [safeFlow, startNodeId, resolveResult])

  // "컴파일": flow → BehaviorTree(BtAst) 빌드. 이 안에서 Static Validation(cycle/edge 오류 등)을 수행한다.
  // 렌더 시점이 아니라 Start 시점에만 호출한다.
  const compile = useCallback((): { model: BtAstNode | null; error: string | null } => {
    try {
      // 1) Static Validation: build 과정에서 cycle/edge 오류 등 검출
      const { model } = buildBehaviorTreeFromFlowDefinition(safeFlow)

      // 2) Semantic Validation: 만들어진 AST 기반 검증(dead branch 등)
      const issues = validateSemantics({ flow: safeFlow, model, startNodeId })
      const errors = issues.filter((i) => i.severity === 'error')
      if (errors.length > 0) {
        return { model: null, error: errors.map((e) => e.message).join('\n') }
      }

      return { model, error: null }
    } catch (e: any) {
      return { model: null, error: String(e?.message ?? e) }
    }
  }, [safeFlow, startNodeId])

  // 렌더링은 실행기 스냅샷만 본다(소스가 시뮬/로봇 무관).
  const currentNodeId = snapshot.currentNodeId
  const simStatusById = snapshot.statusById

  const nodes = useMemo(() => {
    return rawNodes.map((node: any) => {
      const activeInfo = activeNodeList?.find((i) => i.nodeId === node.id)

      // 점검(inspect) 모드에서는 디버거 진행 상태를 우선 적용한다.
      const simStatus = mode === 'inspect' ? simStatusById[node.id] : undefined
      const breakpoint = mode === 'inspect' && !!nodeConfigs[node.id]?.breakpoint
      // 강제 결과(NORMAL 제외) 마커: 우상단 네모 표시용
      const forced = mode === 'inspect' ? nodeConfigs[node.id]?.forced : undefined
      const forcedResult = forced && forced !== 'NORMAL' ? forced : undefined
      // 점검 시 현재 RUNNING 노드의 tick 반복 횟수(우하단 뱃지)
      const tickCount = mode === 'inspect' ? (snapshot.runningCountById[node.id] ?? 0) : 0
      return {
        ...node,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          flowMode: readonlyFlowMode,
          taskStatus: simStatus ?? activeInfo?.status ?? 'IDLE',
          runningCount: activeInfo?.runningCount ?? 0,
          breakpoint,
          forcedResult,
          tickCount
        },
        selectable: true,
        connectable: false
      }
    })
  }, [
    rawNodes,
    selectedNodeId,
    activeNodeList,
    readonlyFlowMode,
    mode,
    simStatusById,
    snapshot.runningCountById,
    nodeConfigs
  ])

  const edges = useMemo(() => {
    return rawEdges.map((edge: any) => ({
      ...edge,
      type: 'taskEdge',
      selectable: false,
      data: {
        ...(edge.data ?? {}),
        flowMode: readonlyFlowMode
      }
    }))
  }, [rawEdges, readonlyFlowMode])

  const flowRenderKey = useMemo(() => {
    const nodeKey = rawNodes.map((node: any) => node.id).join(',')
    const edgeKey = rawEdges.map((edge: any) => `${edge.id}:${edge.sourceHandle}:${edge.targetHandle}`).join(',')

    return `${readonlyFlowMode}-${nodeKey}-${edgeKey}`
  }, [readonlyFlowMode, rawNodes, rawEdges])

  /**
   * DrawPanel의 TaskNode / TaskEdge를 readonly에서도 그대로 재사용하므로
   * 해당 컴포넌트들이 참조하는 useFlowEditorStore 값도 DB flowDefinition 기준으로 맞춰준다.
   *
   * 단, viewer는 편집 화면이 아니므로 flowKey를 null로 두어
   * localStorage history에 viewer 상태가 저장되지 않게 한다.
   */
  useLayoutEffect(() => {
    const prevState = useFlowEditorStore.getState()

    useFlowEditorStore.setState({
      flowKey: null,
      nodes,
      edges,
      flowMode: readonlyFlowMode,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPalette: null,
      helperLineVertical: undefined,
      helperLineHorizontal: undefined
    })

    return () => {
      useFlowEditorStore.setState({
        flowKey: prevState.flowKey,
        nodes: prevState.nodes,
        edges: prevState.edges,
        viewport: prevState.viewport,
        flowMode: prevState.flowMode,
        positionsByMode: prevState.positionsByMode,
        selectedNodeId: prevState.selectedNodeId,
        selectedEdgeId: prevState.selectedEdgeId,
        selectedPalette: prevState.selectedPalette,
        helperLineVertical: prevState.helperLineVertical,
        helperLineHorizontal: prevState.helperLineHorizontal
      })
    }
  }, [nodes, edges, readonlyFlowMode])

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      nodes.forEach((node: any) => updateNodeInternals(node.id))

      requestAnimationFrame(() => {
        rfRef.current?.fitView({ padding: 0.2, duration: 0 })
      })
    })
  }, [nodes, edges, readonlyFlowMode, updateNodeInternals])

  const renderedEdges = useMemo(() => {
    return edges.map((edge: any) => ({
      ...edge,
      type: 'taskEdge',
      style: {
        ...(edge.style ?? {}),
        stroke: '#94a3b8',
        strokeWidth: 1.25,
        strokeLinecap: 'round'
      },
      markerEnd: {
        ...(edge.markerEnd ?? {}),
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        color: '#94a3b8'
      }
    }))
  }, [edges])

  const selectedNode = useMemo(() => {
    return nodes.find((node: any) => node.id === selectedNodeId) ?? null
  }, [nodes, selectedNodeId])

  const onInit: OnInit<any, any> = useCallback(
    (instance) => {
      rfRef.current = instance

      requestAnimationFrame(() => {
        nodes.forEach((node: any) => updateNodeInternals(node.id))

        requestAnimationFrame(() => {
          instance.fitView({ padding: 0.2, duration: 0 })
        })
      })
    },
    [nodes, updateNodeInternals]
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id)
      setPropertyTab('task')
      setPanelOpen(true)
      // 점검 모드에서는 START(ROOT) 를 제외한 노드 클릭 시 점검 설정 팝업을 연다.
      if (mode === 'inspect' && node.type !== 'startNode') {
        setConfigNodeId(node.id)
      }
    },
    [mode]
  )

  const handlePaneClick = useCallback(() => {
    if (mode === 'view') {
      setSelectedNodeId(null)
    }
  }, [mode])
  const adjustTickRate = useCallback((delta: number) => {
    setTickRate((prev) => {
      const next = Math.round((prev + delta) * 10) / 10
      return next < 0 ? 0 : next
    })
  }, [])

  const handleTickRateInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (Number.isNaN(value)) {
      setTickRate(0)
      return
    }
    setTickRate(value < 0 ? 0 : Math.round(value * 10) / 10)
  }, [])

  // 실행 중(시작했고 아직 종료되지 않은) 상태인지
  const isActive = started && !snapshot.finished

  // 실행기를 초기화하고 디버거 상태 리셋
  const resetRun = useCallback(() => {
    executor.reset()
    setSnapshot(EMPTY_SNAPSHOT)
    setStarted(false)
    setIsPlaying(false)
    setCompiledModel(null)
  }, [executor])

  // 실행기에 한 tick 요청하고 결과 스냅샷을 반영(시뮬=즉시, 로봇=결과 대기)
  const applyStep = useCallback(async () => {
    const snap = await executor.step()
    setSnapshot(snap)
    return snap
  }, [executor])

  // 수동 한 tick 전진 (Next)
  const handleNext = useCallback(() => {
    setStarted(true)
    void applyStep()
  }, [applyStep])

  // 자동 모드 시작: 먼저 컴파일(정적 검증) → 실패 시 팝업, 성공 시 처음부터 재생
  const handleStartAuto = useCallback(() => {
    const { model, error } = compile()
    if (error) {
      setCompileError(error)
      return
    }
    setCompiledModel(model)
    executor.reset()
    setSnapshot(EMPTY_SNAPSHOT)
    setStarted(true)
    setIsPlaying(true)
    setPanelOpen(true)
  }, [compile, executor])

  // 수동 모드 시작: 먼저 컴파일 → 실패 시 팝업, 성공 시 첫 tick 진행(이후 Next)
  const handleStartManual = useCallback(() => {
    const { model, error } = compile()
    if (error) {
      setCompileError(error)
      return
    }
    setCompiledModel(model)
    executor.reset()
    setStarted(true)
    setPanelOpen(true)
    void applyStep()
  }, [compile, executor, applyStep])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  // Resume: 재생만 켠다. auto-loop 이 먼저 한 tick 진행하므로 breakpoint 노드를 벗어난다(재멈춤 방지).
  const handleResume = useCallback(() => {
    setIsPlaying(true)
  }, [])

  // 정지: 재생을 멈추고 실행기/상태 초기화
  const handleStop = useCallback(() => {
    resetRun()
  }, [resetRun])

  // Auto/Manual 전환 시 진행 중이던 실행은 정지(초기화)한다.
  const handleChangeRunMode = useCallback(
    (next: 'auto' | 'manual') => {
      setRunMode(next)
      resetRun()
    },
    [resetRun]
  )

  // 자동 재생 루프: tickRate 마다 step() → 렌더. 종료/브레이크포인트에서 자동 정지.
  // setInterval 대신 재귀 대기 루프라, 실제 로봇처럼 step 이 오래 걸려도 결과를 기다린 뒤 다음으로 넘어간다.
  useEffect(() => {
    if (!isPlaying) return
    let cancelled = false

    const loop = async () => {
      while (!cancelled) {
        const snap = await executor.step()
        if (cancelled) return
        setSnapshot(snap)

        if (snap.finished) {
          setIsPlaying(false)
          return
        }
        if (snap.currentNodeId && nodeConfigsRef.current[snap.currentNodeId]?.breakpoint) {
          setIsPlaying(false)
          return
        }
        await new Promise((r) => setTimeout(r, Math.max(0.1, tickRateRef.current) * 1000))
      }
    }
    void loop()

    return () => {
      cancelled = true
    }
  }, [isPlaying, executor])

  // 진행 중인 노드를 자동 선택해 우측 속성 패널에 현재 실행 노드를 표시
  useEffect(() => {
    if (mode === 'inspect' && currentNodeId) {
      setSelectedNodeId(currentNodeId)
      setPropertyTab('task')
    }
  }, [mode, currentNodeId])

  // 점검 모드를 벗어나거나 flow(=실행기) 가 바뀌면 실행 상태 초기화
  useEffect(() => {
    resetRun()
  }, [mode, executor, resetRun])

  // flow 가 바뀌면 노드별 점검 설정과 열린 팝업도 초기화
  useEffect(() => {
    setNodeConfigs({})
    setConfigNodeId(null)
  }, [safeFlow])

  const configNode = useMemo(() => {
    if (!configNodeId) return null
    return rawNodes.find((n: any) => String(n.id) === configNodeId) ?? null
  }, [configNodeId, rawNodes])

  const { responsiveMode } = useResponsiveStore()
  const isMobile = responsiveMode !== 'PC' ? true : false
  const [isPanelOpen, setPanelOpen] = useState(false)

  const mobileSheetContent = useMemo(() => {
    if (mode === 'view') {
      return <PropertyPanel selectedNode={selectedNode} tab={propertyTab} onChangeTab={setPropertyTab} />
    }
    if (IS_LOCAL_ENV && showAst) {
      return <AstView model={compiledModel} statusById={simStatusById} startNodeId={startNodeId} error={compileError} />
    }
    return <ContentsPanel selectedNode={selectedNode} />
  }, [selectedNode])

  // useEffect(() => {
  //   setPanelOpen(selectedNode)
  // }, [selectedNode])

  return (
    <InspectShell>
      <CanvasRoot $isPanelOpen={!!selectedNode && !isMobile}>
        <CanvasMain>
          {displayOption === 'RUNNING_STATUS' && (
            <FlowTitleBar style={{ flexWrap: 'wrap', rowGap: '8px' }}>
              <FlowTitle>
                <FlowTitleLabel>선택한 Task Flow</FlowTitleLabel>
                {flowName && (
                  <>
                    <Div />
                    <FlowTitleName>{flowName}</FlowTitleName>
                  </>
                )}
              </FlowTitle>

              <LegendWrap>
                {STATUS_LEGEND.map(({ label, border, bg }) => (
                  <LegendItem key={label}>
                    <LegendDot $border={border} $bg={bg} />
                    <LegendLabel>{label}</LegendLabel>
                  </LegendItem>
                ))}
              </LegendWrap>
            </FlowTitleBar>
          )}

          {displayOption !== 'RUNNING_STATUS' && (
            <Toolbar>
              <SegmentedWrap>
                <SegmentedButton
                  type="button"
                  $active={mode === 'view'}
                  $first
                  onClick={() => {
                    setMode('view')
                    setSelectedNodeId(null)
                    setPanelOpen(false)
                  }}
                >
                  {t('canvas.viewer.viewMode')}
                </SegmentedButton>
                <SegmentedButton
                  type="button"
                  $active={mode === 'inspect'}
                  $last
                  onClick={() => {
                    setMode('inspect')
                    setSelectedNodeId(null)
                    setPanelOpen(false)
                  }}
                >
                  {t('canvas.viewer.inspectMode')}
                </SegmentedButton>
              </SegmentedWrap>
            </Toolbar>
          )}

          <CanvasFlowWrap>
            <CanvasWrapper ref={wrapperRef} tabIndex={0}>
              <FlowFill>
                <ReactFlow
                  key={flowRenderKey}
                  style={{ width: '100%', height: '100%' }}
                  nodes={nodes}
                  edges={renderedEdges}
                  onInit={onInit}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  connectionMode={ConnectionMode.Loose}
                  defaultEdgeOptions={{
                    type: 'taskEdge',
                    markerEnd: {
                      type: MarkerType.ArrowClosed,
                      width: 10,
                      height: 10,
                      color: '#94a3b8'
                    }
                  }}
                  fitView
                  proOptions={{ hideAttribution: true }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  zoomOnDoubleClick={false}
                  panOnDrag
                  deleteKeyCode={null}
                  onNodeClick={handleNodeClick}
                  onPaneClick={handlePaneClick}
                >
                  <MiniMap style={minimapStyle} />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </FlowFill>
            </CanvasWrapper>
          </CanvasFlowWrap>
        </CanvasMain>

        {mode === 'view' ? (
          <PropertyPanel selectedNode={selectedNode} tab={propertyTab} onChangeTab={setPropertyTab} />
        ) : IS_LOCAL_ENV && showAst ? (
          // inspect 모드 + 로컬 환경 + AST 토글 ON: AST(BT) 뷰
          <AstView model={compiledModel} statusById={simStatusById} startNodeId={startNodeId} error={compileError} />
        ) : (
          // inspect 모드 기본: 콘텐츠 프리뷰 패널
          <ContentsPanel selectedNode={selectedNode} />
        )}
      </CanvasRoot>

      {mode === 'inspect' && (
        <InspectBar>
          <SegmentedWrap style={{ margin: 0 }}>
            <SegmentedButton
              type="button"
              $active={runMode === 'auto'}
              $first
              onClick={() => handleChangeRunMode('auto')}
            >
              {t('canvas.viewer.inspect.auto')}
            </SegmentedButton>
            <SegmentedButton
              type="button"
              $active={runMode === 'manual'}
              $last
              onClick={() => handleChangeRunMode('manual')}
            >
              {t('canvas.viewer.inspect.manual')}
            </SegmentedButton>
          </SegmentedWrap>

          <Divider />

          {runMode === 'auto' ? (
            <ControlsGroup>
              {!isActive ? (
                <CtrlButton type="button" $variant="green" onClick={handleStartAuto}>
                  <Play size={16} fill="currentColor" />
                  Start
                </CtrlButton>
              ) : (
                <>
                  {isPlaying ? (
                    <CtrlButton type="button" $variant="orange" onClick={handlePause}>
                      <Pause size={16} fill="currentColor" />
                      Pause
                    </CtrlButton>
                  ) : (
                    <CtrlButton type="button" $variant="green" onClick={handleResume}>
                      <Play size={16} fill="currentColor" />
                      Resume
                    </CtrlButton>
                  )}
                  <CtrlButton type="button" $variant="red" onClick={handleStop}>
                    <Square size={16} fill="currentColor" />
                    Stop
                  </CtrlButton>
                </>
              )}

              <InspectGroup>
                <InspectLabel>{t('canvas.viewer.inspect.tickRate')}</InspectLabel>
                <TickRateControl>
                  <TickRateButton type="button" onClick={() => adjustTickRate(-0.1)} disabled={tickRate <= 0}>
                    −
                  </TickRateButton>
                  <TickRateInput type="number" step={0.1} min={0} value={tickRate} onChange={handleTickRateInput} />
                  <TickRateButton type="button" onClick={() => adjustTickRate(0.1)}>
                    +
                  </TickRateButton>
                </TickRateControl>
              </InspectGroup>

              {IS_LOCAL_ENV && (
                <ToggleSwitch
                  checked={showAst}
                  onChange={() => setShowAst((v) => !v)}
                  label="AST"
                  width="70px"
                  disabled={false}
                />
              )}
            </ControlsGroup>
          ) : (
            <ControlsGroup>
              {!isActive ? (
                <CtrlButton type="button" $variant="green" onClick={handleStartManual}>
                  <Play size={16} fill="currentColor" />
                  Start
                </CtrlButton>
              ) : (
                <>
                  <CtrlButton type="button" $variant="blue" onClick={handleNext}>
                    <SkipForward size={16} fill="currentColor" />
                    Next
                  </CtrlButton>
                  <CtrlButton type="button" $variant="red" onClick={handleStop}>
                    <Square size={16} fill="currentColor" />
                    Stop
                  </CtrlButton>
                </>
              )}

              {IS_LOCAL_ENV && (
                <ToggleSwitch
                  checked={showAst}
                  onChange={() => setShowAst((v) => !v)}
                  label="AST"
                  width="70px"
                  disabled={false}
                />
              )}
            </ControlsGroup>
          )}
        </InspectBar>
      )}
      {/* 모바일에서만 바텀시트로 같은 패널을 렌더링 */}
      {isMobile && (
        <MobilePropertySheet
          isOpen={isPanelOpen}
          onClose={() => {
            setPanelOpen(false)
          }}
        >
          {mobileSheetContent}
        </MobilePropertySheet>
      )}

      <NodeInspectDialog
        open={configNodeId !== null}
        nodeLabel={String(configNode?.data?.label ?? configNode?.data?.taskName ?? configNodeId ?? '')}
        config={configNodeId ? (nodeConfigs[configNodeId] ?? DEFAULT_NODE_CONFIG) : DEFAULT_NODE_CONFIG}
        forceDisabled={
          isActive &&
          !!configNodeId &&
          (simStatusById[configNodeId] === 'SUCCESS' || simStatusById[configNodeId] === 'FAILURE')
        }
        onChange={(next) => {
          if (!configNodeId) return
          setNodeConfigs((prev) => ({ ...prev, [configNodeId]: next }))
        }}
        onClose={() => setConfigNodeId(null)}
      />

      {/* 컴파일(정적 검증) 실패 시 원인 안내 팝업 */}
      <ConfirmModal
        open={compileError !== null}
        title={t('canvas.viewer.inspect.buildError')}
        description={compileError ?? ''}
        showCancelButton={false}
        confirmVariant="danger"
        onCancel={() => setCompileError(null)}
        onConfirm={() => setCompileError(null)}
      />
    </InspectShell>
  )
}

export default function TaskFlowReadonlyCanvas({ flowDefinition, activeNodeList, displayOption, flowName }: Props) {
  return (
    <PanelRoot>
      <ReactFlowProvider>
        <InnerReadonlyCanvas
          flowDefinition={flowDefinition}
          activeNodeList={activeNodeList}
          displayOption={displayOption}
          flowName={flowName}
        />
      </ReactFlowProvider>
    </PanelRoot>
  )
}
