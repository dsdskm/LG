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

// 태스크 패널의 모든 목록(컨트롤/액션/컨텐츠)은 name 오름차순으로 보여준다.
function sortByNameAsc<T extends { name?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
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

  const controlTasks = useMemo(() => sortByNameAsc(tasks.filter((t) => t.taskType === TASK_TYPE_CONTROL)), [tasks])

  const otherTasks = useMemo(() => tasks.filter((t) => t.taskType !== TASK_TYPE_CONTROL), [tasks])

  const hasContentReference = (t: TaskApiPayload) =>
    Object.values(t.propertySchema?.properties ?? {}).some((p) => p?.type === 'content_reference')

  // propertySchema.properties 중 type === 'content_reference' 가 없으면 Default,
  // 하나라도 있으면 펼침(content 단위)으로 보여준다.
  const directActionTasks = useMemo(
    () => sortByNameAsc(otherTasks.filter((t) => t.taskType === TaskType.ACTION && !hasContentReference(t))),
    [otherTasks]
  )

  const expandableTasks = useMemo(
    () =>
      sortByNameAsc(
        otherTasks.filter(
          (t) => t.taskType !== TaskType.ROOT && hasContentReference(t) && t.name !== 'PickUp' && t.name !== 'PutDown'
        )
      ),
    [otherTasks]
  )

  const [openMap, setOpenMap] = useState<Record<number, boolean>>({})
  const [defaultOpen, setDefaultOpen] = useState(false)

  useEffect(() => {
    console.log('[TASK_PANEL][VISIBLE_LIST]', {
      loading,
      totalTasks: tasks.length,
      controlTaskCount: controlTasks.length,
      actionTaskCount: otherTasks.length,
      directActionTaskCount: directActionTasks.length,
      expandableTaskCount: expandableTasks.length,
      visibleTasks: tasks.map((task) => ({
        id: task.id,
        name: task.name,
        taskType: task.taskType,
        contentsCount: Array.isArray(task.contents) ? task.contents.length : 0
      }))
    })
  }, [loading, tasks, controlTasks.length, otherTasks.length, directActionTasks.length, expandableTasks.length])

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
                const contents = sortByNameAsc(task.contents ?? [])
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
