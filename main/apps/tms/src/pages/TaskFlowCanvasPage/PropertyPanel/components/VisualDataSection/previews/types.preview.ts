import { SelectedData } from '../types'
import { Object3D, Mesh, Material, Color, Matrix4 } from 'three'
import { MeshBVH } from 'three-mesh-bvh'

export type PreviewNodeLike = {
  id?: string
  data?: SelectedData
} | null

export type PlayStatus = 'NONE' | 'READY' | 'PLAYING' | 'FINISHED'
export type PreviewProps = {
  node?: PreviewNodeLike
  selectedData?: SelectedData | null
  nodeId?: string
}

export interface BVHMesh extends Mesh {
  geometry: Mesh['geometry'] & {
    boundsTree?: MeshBVH
  }
}

export interface URDFLinkWithCollision extends Object3D {
  isURDFLink: boolean
  visual: Object3D
  collision: BVHMesh // 충돌용 뼈대 메쉬가 항상 존재함을 보장
}
