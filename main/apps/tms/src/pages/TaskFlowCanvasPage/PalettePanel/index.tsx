import { useEffect, useMemo, useState } from 'react'

import {
  PanelRoot,
  HeaderRow,
  Subtitle,
  LoadingText,
  Sections,
  Section,
  SectionHeader,
  SectionTitle,
  SectionBodyPadded,
  ControlGrid,
  SectionBody,
  DividerList,
  TaskToggleButton,
  TaskName,
  ContentBlock,
  ContentGrid,
  Chevron,
  NodeCard,
  CardLabel
} from './styles'
import { PaletteItem } from '@/types/palette'
import { useFlowEditorStore } from '@/store/taskflow.canvas.store'
import { ContentApiPayload, TaskApiPayload } from '@/types/api/taskPayload'
import { DND_FALLBACK_TEXT, DND_MIME, TASK_PANEL, TASK_TYPE_CONTROL } from '@/common/constants'
import { TaskType } from '@/types/task'

function makePaletteLabel(kind: PaletteItem['kind'], task: TaskApiPayload, content?: ContentApiPayload) {
  if (kind === 'controlTaskNode') return task.name
  return content?.name ?? task.name
}

export default function PalettePanel({ groupId, siteId }: { groupId: string | null; siteId: string | null }) {
  const loading = useFlowEditorStore((s) => s.loadingTasks)
  const tasks = useFlowEditorStore((s) => s.tasks)
  const loadTasks = useFlowEditorStore((s) => s.loadTasks)

  const selectedPalette = useFlowEditorStore((s) => s.selectedPalette)
  const selectPalette = useFlowEditorStore((s) => s.selectPalette)
  const addNodeFromPalette = useFlowEditorStore((s) => s.addNodeFromPalette)
  const addControlNodeFromTask = useFlowEditorStore((s) => s.addControlNodeFromTask)
  const nodes = useFlowEditorStore((s) => s.nodes)

  const getNextCanvasPosition = () => {
    const index = nodes.length
    const col = index % 6
    const row = Math.floor(index / 6)

    return {
      x: 220 + col * 36,
      y: 120 + row * 28
    }
  }

  useEffect(() => {
    loadTasks(groupId, siteId)
  }, [loadTasks, groupId, siteId])

  const controlTasks = useMemo(() => tasks.filter((t) => t.taskType === TASK_TYPE_CONTROL), [tasks])

  const otherTasks = useMemo(() => tasks.filter((t) => t.taskType !== TASK_TYPE_CONTROL), [tasks])

  // contents 가 비어 있는 ACTION task 는 펼침(content 단위) 대신
  // CONTROL task 처럼 task 자체를 직접 노드화해서 보여준다.
  const directActionTasks = useMemo(
    () => otherTasks.filter((t) => t.taskType === TaskType.ACTION && (t.contents?.length ?? 0) === 0),
    [otherTasks]
  )

  const expandableTasks = useMemo(
    () => otherTasks.filter((t) => t.taskType !== TaskType.ROOT && (t.contents?.length ?? 0) > 0),
    [otherTasks]
  )

  const [openMap, setOpenMap] = useState<Record<number, boolean>>({})
  const [defaultOpen, setDefaultOpen] = useState(false)

  return (
    <PanelRoot>
      <HeaderRow>
        <div>
          <Subtitle>{TASK_PANEL.SUBTITLE}</Subtitle>
        </div>
        {loading ? <LoadingText>{TASK_PANEL.LOADING}</LoadingText> : null}
      </HeaderRow>

      <Sections>
        <Section>
          <SectionHeader>
            <SectionTitle>{TASK_PANEL.SECTION_CONTROL}</SectionTitle>
          </SectionHeader>

          <SectionBodyPadded>
            <ControlGrid>
              {controlTasks.map((task) => (
                <ControlTaskNodeCard
                  key={task.id}
                  task={task}
                  selected={selectedPalette?.taskId === task.id && !selectedPalette?.contentId}
                  onSelect={selectPalette}
                  onDoubleAdd={() => addControlNodeFromTask(task, getNextCanvasPosition())}
                />
              ))}
            </ControlGrid>
          </SectionBodyPadded>
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>{TASK_PANEL.SECTION_ACTION}</SectionTitle>
          </SectionHeader>

          <SectionBody>
            <DividerList>
              {directActionTasks.length > 0 ? (
                <div>
                  <TaskToggleButton type="button" onClick={() => setDefaultOpen((prev) => !prev)} title="Default">
                    <TaskName>Default</TaskName>
                    <ChevronRight open={defaultOpen} />
                  </TaskToggleButton>

                  {defaultOpen ? (
                    <ContentBlock>
                      <ContentGrid>
                        {directActionTasks.map((task) => (
                          <ControlTaskNodeCard
                            key={task.id}
                            task={task}
                            selected={selectedPalette?.taskId === task.id && !selectedPalette?.contentId}
                            onSelect={selectPalette}
                            onDoubleAdd={() => addControlNodeFromTask(task, getNextCanvasPosition())}
                          />
                        ))}
                      </ContentGrid>
                    </ContentBlock>
                  ) : null}
                </div>
              ) : null}

              {expandableTasks.map((task) => {
                const contents = task.contents ?? []
                const open = openMap[task.id] ?? false

                return (
                  <div key={task.id}>
                    <TaskToggleButton
                      type="button"
                      onClick={() => setOpenMap((prev) => ({ ...prev, [task.id]: !open }))}
                      title={task.name}
                    >
                      <TaskName>{task.name}</TaskName>
                      <ChevronRight open={open} />
                    </TaskToggleButton>

                    {open ? (
                      <ContentBlock>
                        <ContentGrid>
                          {contents.map((content) => (
                            <ContentNodeCard
                              key={content.id}
                              task={task}
                              content={content}
                              selected={
                                selectedPalette?.taskId === task.id && selectedPalette?.contentId === content.id
                              }
                              onSelect={selectPalette}
                              onDoubleAdd={() =>
                                addNodeFromPalette(
                                  {
                                    kind: 'contentNode',
                                    task,
                                    content,
                                    label: makePaletteLabel('contentNode', task, content)
                                  },
                                  getNextCanvasPosition()
                                )
                              }
                            />
                          ))}
                        </ContentGrid>
                      </ContentBlock>
                    ) : null}
                  </div>
                )
              })}
            </DividerList>
          </SectionBody>
        </Section>
      </Sections>
    </PanelRoot>
  )
}

function ChevronRight({ open }: { open: boolean }) {
  return (
    <Chevron $open={open} aria-hidden>
      ›
    </Chevron>
  )
}

function ControlTaskNodeCard({
  task,
  selected,
  onSelect,
  onDoubleAdd
}: {
  task: TaskApiPayload
  selected: boolean
  onSelect: (item: PaletteItem | null) => void
  onDoubleAdd: () => void
}) {
  const payload: PaletteItem = {
    kind: 'controlTaskNode',
    task,
    label: makePaletteLabel('controlTaskNode', task)
  }

  return (
    <NodeCard
      draggable
      $selected={selected}
      onDragStart={(e) => {
        const json = JSON.stringify(payload)
        e.dataTransfer.setData(DND_MIME, json)
        e.dataTransfer.setData(DND_FALLBACK_TEXT, payload.label)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => onSelect(payload)}
      onDoubleClick={onDoubleAdd}
      title={task.name}
    >
      <CardLabel>{task.name}</CardLabel>
    </NodeCard>
  )
}

function ContentNodeCard({
  task,
  content,
  selected,
  onSelect,
  onDoubleAdd
}: {
  task: TaskApiPayload
  content: ContentApiPayload
  selected: boolean
  onSelect: (item: PaletteItem | null) => void
  onDoubleAdd: () => void
}) {
  const payload: PaletteItem = {
    kind: 'contentNode',
    task,
    content,
    label: makePaletteLabel('contentNode', task, content)
  }

  return (
    <NodeCard
      draggable
      $selected={selected}
      onDragStart={(e) => {
        const json = JSON.stringify(payload)
        e.dataTransfer.setData(DND_MIME, json)
        e.dataTransfer.setData(DND_FALLBACK_TEXT, payload.label)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => onSelect(payload)}
      onDoubleClick={onDoubleAdd}
      title={content.name}
    >
      <CardLabel>{content.name}</CardLabel>
    </NodeCard>
  )
}
