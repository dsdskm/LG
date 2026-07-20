import { useRef, useEffect } from 'react'
import { useMapStore } from './useMapStore'
import { DisplayDispatcher } from './DisplayDispatcher'

export function TFNode({ frameId }) {
  const children = useMapStore((state) => state.tfTree[frameId]?.children)
  const groupRef = useRef()

  //console.log('[TFNode] tf draw frameId ', frameId, 'tf tree = ', useMapStore.getState().tfTree)

  useEffect(() => {
    const unSubscribe = useMapStore.subscribe(
      (state) => state.renderBuffer.transforms[frameId],
      (transform) => {
        if (transform && groupRef.current) {
          //console.log('update pose frame id = ', frameId, ' pose = ', transform)
          const { pos, rot } = transform
          groupRef.current.position.set(pos.x, pos.y, pos.z)
          groupRef.current.quaternion.set(rot.x, rot.y, rot.z, rot.w)
        }
      },
      { fireImmediately: true }
    )
    return () => unSubscribe()
  }, [])

  return (
    <group ref={groupRef} name={frameId}>
      <DisplayDispatcher frameId={frameId} />
      {children?.map((childId) => (
        <TFNode key={childId} frameId={childId} />
      ))}
    </group>
  )
}

