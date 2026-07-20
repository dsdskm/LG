import { useRef } from 'react'
import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { useFrame } from '@react-three/fiber'

interface MotionCollisionProps {
  urdfModel: THREE.Object3D | null
}

// 임의의 노드에서 위로 올라가며 소유 링크(URDFLink)를 찾는다.
function findOwnerLink(obj: THREE.Object3D | null): THREE.Object3D | null {
  let p: any = obj
  while (p && !p.isURDFLink) p = p.parent
  return p ?? null
}

// 링크에 물리적으로 직접 연결된(joint 하나로 이어진) 부모 링크를 찾는다.
// urdf-loader 구조상 link.parent 는 다른 링크가 아니라 URDFJoint 이므로 한 단계 더 올라가야 한다.
function getParentLink(link: any): THREE.Object3D | null {
  const joint = link?.parent
  if (!joint) return null
  return findOwnerLink(joint.parent ?? null)
}

interface CollisionMeshEntry {
  mesh: THREE.Mesh
  link: any
}

// 손/손가락 링크가 어느 손에 속하는지 판별한다. (palm 및 각 손가락 세그먼트)
// 같은 손의 손가락끼리는 구조상 항상 맞닿으므로 자가충돌 검사에서 제외하기 위함.
function handOfFinger(name: string): 'left' | 'right' | null {
  const m = /^(left|right)_(palm|thumb|index|middle|ring|pinky)/.exec(name)
  return m ? (m[1] as 'left' | 'right') : null
}

export function MotionCollision({ urdfModel }: MotionCollisionProps) {
  useFrame(() => {
    if (!urdfModel) return

    urdfModel.updateMatrixWorld(true)

    // 1) 충돌용 메시 수집 + BVH 지연 생성
    //    URDFCollider(그룹)의 자식 mesh 에 실제 geometry 가 존재하며, 메시는 비동기 로딩되므로
    //    매 프레임 존재 여부를 확인해 최초 1회만 boundsTree 를 만든다.
    const activeCollisionMeshes: CollisionMeshEntry[] = []

    urdfModel.traverse((child: THREE.Object3D) => {
      const anyChild = child as any
      if (!anyChild.isURDFCollider) return

      // 충돌 형상은 화면에 그리지 않는다.
      child.visible = false

      const ownerLink = findOwnerLink(child)
      if (!ownerLink) return

      child.traverse((c: THREE.Object3D) => {
        const mesh = c as THREE.Mesh
        if (!mesh.isMesh || !mesh.geometry) return

        const geom = mesh.geometry as any
        if (!geom.boundsTree) {
          // 무거운 연산이므로 최초 1회만 생성하여 geometry 에 고정
          geom.boundsTree = new MeshBVH(mesh.geometry)
        }
        activeCollisionMeshes.push({ mesh, link: ownerLink })
      })
    })

    // 2) 링크 쌍 충돌 검사
    const currentCollisions = new Set<string>()

    for (let i = 0; i < activeCollisionMeshes.length; i++) {
      for (let j = i + 1; j < activeCollisionMeshes.length; j++) {
        const { mesh: meshA, link: linkA } = activeCollisionMeshes[i]
        const { mesh: meshB, link: linkB } = activeCollisionMeshes[j]

        // 같은 링크의 메시끼리는 충돌 무시
        if (linkA === linkB) continue

        // joint 로 직접 연결된 인접 링크는 자연스럽게 맞닿으므로 무시
        if (getParentLink(linkA) === linkB || getParentLink(linkB) === linkA) continue

        // 같은 손의 손가락/손바닥 링크끼리는 구조상 항상 맞닿으므로 검사 제외
        const handA = handOfFinger(linkA.name)
        const handB = handOfFinger(linkB.name)
        if (handA && handA === handB) continue

        const boundsTreeA = (meshA.geometry as any).boundsTree
        if (!boundsTreeA) continue

        // meshB 의 geometry 를 A 의 로컬 좌표계로 변환하는 행렬: inv(A_world) * B_world
        const bToA = new THREE.Matrix4().copy(meshA.matrixWorld).invert().multiply(meshB.matrixWorld)
        const hit = boundsTreeA.intersectsGeometry(meshB.geometry, bToA)
        if (hit) {
          currentCollisions.add(linkA.name)
          currentCollisions.add(linkB.name)
        }
      }
    }

    // 3) 시각 메시 색상 갱신 (URDFVisual 자식 mesh)
    //    material 인스턴스가 여러 링크에 공유될 수 있으므로, 한 번의 순회에서 복원과 crimson 을
    //    섞으면 서로 덮어쓴다. 따라서 각 mesh 마다 자신의 재질을 clone 해 링크 단위로 분리하고,
    //    이후에는 그 개별 재질에만 색을 칠한다.
    let visualMeshCount = 0
    urdfModel.traverse((child: THREE.Object3D) => {
      const anyChild = child as any
      if (!anyChild.isURDFVisual) return

      const ownerLink = findOwnerLink(child)
      if (!ownerLink) return
      const collided = currentCollisions.has((ownerLink as any).name)

      child.traverse((visualChild: THREE.Object3D) => {
        const mesh = visualChild as any
        if (!mesh.isMesh) return
        visualMeshCount++

        // 공유 재질을 링크별 인스턴스로 분리 (최초 1회)
        if (!mesh._materialCloned) {
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((m: THREE.Material) => m.clone())
            : mesh.material.clone()
          mesh._materialCloned = true
        }

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materials.forEach((mat: any) => {
          if (!mat || !mat.color) return

          // 최초 진입 시 기존 렌더링용 원본 색상 백업
          if (!mat._origColor) {
            mat._origColor = mat.color.clone()
          }

          // 자가 충돌 목록에 포함되어 있다면 Crimson 붉은색, 안전하면 원래 색 복원
          if (collided) {
            mat.color.set('crimson')
          } else {
            mat.color.copy(mat._origColor)
          }
        })
      })
    })
  })

  return null
}
