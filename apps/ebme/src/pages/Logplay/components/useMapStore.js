import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export const SUB_STATUS = {
  IDLE: 'IDLE',
  REQUESTING: 'REQUESTING',
  SUBSCRIBED: 'SUBSCRIBED',
  ERROR: 'ERROR'
}

const comparePose = (prev, next) => {
  if (!prev) return false
  const { pos: p1, rot: r1 } = prev
  const { pos: p2, rot: r2 } = next

  return (
    p1.x === p2.x && p1.y === p2.y && p1.z === p2.z && r1.x === r2.x && r1.y === r2.y && r1.z === r2.z && r1.w === r2.w
  )
}

export const useMapStore = create(
  subscribeWithSelector((set, get) => ({
    tfTree: {}, // 부모 frame에 연결 되어 있는 children 정보 저장, 향후 해당 정보를 기반으로 부모에서 자식으로 이동하는 TF Node 관계 구성
    renderBuffer: {
      transforms: {}, // { frameId: { pos, rot } }
      displayItems: {}, // { frameId: [{ type, data }] }
      mapData: {}, // map raw msg
      rosOut: [] //logmsg
    },
    subscribeInfo: {}, // { msgName: { status, msgName, msgDataType, count}}
    availableMsgs: [], // 현재 구독이 가능한 msg list[{msgName, msgType}]

    addAvailableMsgs: (msgs) => {
      console.log('[useMapStore]addAvailableMsg', msgs)
      set({ availableMsgs: msgs })
    },

    // 각 component에서 요청 된 관심 msg list
    // 메시지별 요청 count를 유지 하여 최종 0이 되면 object에서 삭제 한다
    subscribeMessages: (msgInfo) => {
      const { msgName } = msgInfo
      const newSubscribeInfo = { ...get().subscribeInfo }

      if (msgName in newSubscribeInfo) {
        const prev = newSubscribeInfo[msgName]
        newSubscribeInfo[msgName] = { ...prev, count: prev.count + 1 }
      } else {
        //conut값이 0=>1로 증가 할때만 subscribe 진행 할수 있도록 상태값 변경
        newSubscribeInfo[msgName] = { ...msgInfo, status: SUB_STATUS.REQUESTING, count: 1 }
      }

      console.log('[useMapStore]subscribeInfo requeset= ', msgInfo, 'result =', newSubscribeInfo)
      set({ subscribeInfo: newSubscribeInfo })
    },

    // 관심 msg 삭제
    unsubscribeMessages: (msgInfo) => {
      const { msgName } = msgInfo
      const newSubscribeInfo = { ...get().subscribeInfo }
      console.log('[useMapStore]unsubscribeMessages', msgInfo)
      if (msgName in newSubscribeInfo) {
        const prev = newSubscribeInfo[msgName]
        newSubscribeInfo[msgName] = {
          ...prev,
          status: prev.count <= 1 ? SUB_STATUS.REQUESTING : prev.status, //해당 메시지에 count가 0이 되면 unsubsribe및 msg삭제 진행
          count: prev.count - 1
        }
        set({ subscribeInfo: newSubscribeInfo })
      }
    },
    updateStatus: (msgName, newStatus) =>
      set((state) => ({
        subscribeInfo: {
          ...state.subscribeInfo,
          [msgName]: { ...state.subscribeInfo[msgName], status: newStatus }
        }
      })),
    removeSubscribe: (msgName) =>
      set((state) => {
        const { [msgName]: _, ...remainingInfo } = state.subscribeInfo
        return {
          subscribeInfo: remainingInfo // 삭제된 후의 새로운 객체로 교체
        }
      }),

    processMessages: (messageBatch) => {
      const newTfTree = { ...get().tfTree }
      const newTransforms = { ...get().renderBuffer.transforms }
      const newDisplayItems = { ...get().renderBuffer.displayItems }
      const newRosOut = []
      let newMapData = get().renderBuffer.mapData

      let tempItems = {}

      //console.log('[useMapStore]batchmsg = ', messageBatch)

      messageBatch.forEach((msg) => {
        if (msg.msgName.startsWith('/tf')) {
          msg.data.transforms.forEach((transInfo) => {
            const {
              header: { frame_id: parent },
              child_frame_id: child,
              transform: { translation: pos, rotation: rot }
            } = transInfo

            if (!newTfTree[child]) {
              newTfTree[child] = { children: [] }
            }

            if (!newTfTree[parent]) {
              newTfTree[parent] = { children: [child] }
            } else {
              if (!newTfTree[parent].children.includes(child)) {
                newTfTree[parent].children = [...newTfTree[parent].children, child]
              }
            }
            const prev = newTransforms[child]
            if (!comparePose(prev, { pos, rot })) {
              newTransforms[child] = { pos, rot } // 최신값 하나민 유지
            }
          })
        } else if (msg.msgName.includes('occupancygrid')) {
          newMapData = msg.data
        } else if (msg.msgName.includes('/rosout')) {
          newRosOut.push(msg) // 해당 시점에 들어온 rosout msg누적
          //console.log('[useMapStore]rosout for disply = ', msg)
        } else if (msg.frameId) {
          //console.log('receive msge for disply = ', msg.type)
          // 센서 정보의 경우 최신정보만 관리 할수 있도록 관리
          tempItems[msg.msgName] = { frameId: msg.frameId, data: msg.data }
        }
      })

      //console.log('tempSensor', tempSensor)

      //각 frame별로 display 정보 정리

      for (let key in tempItems) {
        const item = tempItems[key]
        if (!newDisplayItems[item.frameId]) {
          newDisplayItems[item.frameId] = {}
        }
        newDisplayItems[item.frameId][key] = { ...item, msgName: key }
      }

      //console.log('updated displayItems', newDisplayItems)

      // 4. 한 번에 상태 반영 (이때 React 리렌더링 발생)
      set({
        tfTree: newTfTree,
        renderBuffer: {
          transforms: newTransforms,
          displayItems: newDisplayItems,
          rosOut: newRosOut,
          mapData: newMapData
        }
      })
    }
  }))
)

