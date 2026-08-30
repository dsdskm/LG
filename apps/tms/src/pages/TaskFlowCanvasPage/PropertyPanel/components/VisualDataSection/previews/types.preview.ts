import { SelectedData } from '../types'
import { Object3D, Mesh, Material, Color, Matrix4 } from 'three'
import { MeshBVH } from 'three-mesh-bvh'

export type PreviewNodeLike = {
  id?: string
  data?: SelectedData
} | null

export type PreviewProps = {
  node?: PreviewNodeLike
  selectedData?: SelectedData | null
  nodeId?: string
  /**
   * 진행바를 단독 표시한다(트랙 폭 100%).
   * 점검 모드는 여러 콘텐츠 길이를 maxDuration 기준으로 비교해 보여주지만,
   * 속성 패널은 항목이 하나뿐이라 비교 기준이 없다.
   */
  standaloneProgress?: boolean
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
