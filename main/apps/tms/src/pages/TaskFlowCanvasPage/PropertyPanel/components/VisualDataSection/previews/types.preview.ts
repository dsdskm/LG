import { SelectedData } from "../types"

export type PreviewNodeLike =
    | {
        id?: string
        data?: SelectedData
    }
    | null


export type PreviewProps = {
    node?: PreviewNodeLike
    selectedData?: SelectedData | null
}