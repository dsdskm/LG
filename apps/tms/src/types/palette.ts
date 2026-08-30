import type { ContentApiPayload, TaskApiPayload } from "./api/taskPayload";

export type PaletteItem =
  | {
      kind: 'contentNode'
      task: TaskApiPayload
      content: ContentApiPayload
      label: string
    }
  | {
      kind: 'controlTaskNode'
      task: TaskApiPayload
      label: string
    }