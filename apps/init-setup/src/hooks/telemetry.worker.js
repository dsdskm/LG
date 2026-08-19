import { parseCDR } from './cdrParser'

/**
 * 텔레메트리 워커.
 *
 * 붙는 대상은 foxglove-bridge 가 아니라 init-setup-be 의 zenoh 릴레이다
 * (init-setup-be/src/telemetry/relay.js — zenoh-bridge-ros2dds REST SSE → WS).
 * 릴레이가 foxglove 프로토콜의 최소 부분집합(serverInfo/advertise/unadvertise + 바이너리
 * [0x01][subId][timestamp][CDR])을 그대로 말하므로 이 워커와 cdrParser 는 변경 없이 재사용한다.
 *
 * 서브프로토콜은 협상하지 않는다 — 릴레이는 단일 프로토콜만 제공하고, 'foxglove.websocket.v1' 을
 * 요구하면 릴레이(ws 라이브러리)가 그 값을 되돌려 주지 않아 핸드셰이크가 실패한다.
 */
let ws = null
const subMap = {} // subId -> { topic, schemaName, encoding, channelId }

self.onmessage = (event) => {
  const { op, data } = event.data

  switch (op) {
    case 'connect': {
      const { url } = data
      if (ws) {
        try {
          ws.close()
        } catch (err) {}
      }

      ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        self.postMessage({ op: 'status', status: 'connected' })
      }

      ws.onclose = () => {
        self.postMessage({ op: 'status', status: 'disconnected' })
      }

      ws.onerror = (e) => {
        self.postMessage({ op: 'status', status: 'error' })
      }

      ws.onmessage = (msgEvent) => {
        if (msgEvent.data instanceof ArrayBuffer) {
          const view = new DataView(msgEvent.data)
          const opcode = view.getUint8(0)
          if (opcode !== 0x01) return

          const subId = view.getUint32(1, true)
          const payload = msgEvent.data.slice(13)

          const info = subMap[subId]
          if (!info) return

          let parsed = null
          if (info.encoding === 'json') {
            try {
              const jsonStr = new TextDecoder('utf-8').decode(payload)
              parsed = JSON.parse(jsonStr)
            } catch (e) {}
          } else {
            parsed = parseCDR(payload, info.schemaName)
          }

          if (parsed) {
            // Transferable objects list to avoid serialization copy overhead
            const transferables = []
            if (parsed.points instanceof Float32Array) {
              transferables.push(parsed.points.buffer)
            }
            if (parsed.ranges instanceof Float32Array) {
              transferables.push(parsed.ranges.buffer)
            }
            if (parsed.intensities instanceof Float32Array) {
              transferables.push(parsed.intensities.buffer)
            }
            if (parsed.data instanceof Int8Array) {
              transferables.push(parsed.data.buffer)
            }

            self.postMessage({ op: 'message', topic: info.topic, parsed }, transferables)
          }
          return
        }

        try {
          const msg = JSON.parse(msgEvent.data)
          if (msg.op === 'serverInfo') {
            self.postMessage({ op: 'serverInfo', name: msg.name, supportedEncodings: msg.supportedEncodings })
          } else if (msg.op === 'advertise') {
            // advertise 는 증분 메시지다 — 새로 생긴 채널만 담겨 온다.
            // 메인 스레드에서 기존 목록에 병합한다.
            self.postMessage({ op: 'advertise', channels: msg.channels })
          } else if (msg.op === 'unadvertise') {
            // 사라진 채널의 구독은 서버에서 이미 무효다. 남은 구독 매핑을 정리해
            // 노드가 재시작되며 새 channelId 로 다시 advertise 될 때 재구독되게 한다.
            const goneIds = new Set(msg.channelIds)
            Object.entries(subMap).forEach(([subId, sub]) => {
              if (goneIds.has(sub.channelId)) delete subMap[subId]
            })
            self.postMessage({ op: 'unadvertise', channelIds: msg.channelIds })
          }
        } catch (e) {}
      }
      break
    }

    case 'disconnect': {
      if (ws) {
        try {
          ws.close()
        } catch (err) {}
        ws = null
      }
      break
    }

    case 'subscribe': {
      const { subscriptions } = data // Array of { id, channelId, topic, schemaName, encoding }
      if (!ws || ws.readyState !== WebSocket.OPEN) return

      const subsToSend = subscriptions.map((sub) => {
        subMap[sub.id] = {
          topic: sub.topic,
          schemaName: sub.schemaName,
          encoding: sub.encoding,
          channelId: sub.channelId
        }
        return { id: sub.id, channelId: sub.channelId, encoding: sub.encoding }
      })

      ws.send(
        JSON.stringify({
          op: 'subscribe',
          subscriptions: subsToSend
        })
      )
      break
    }

    case 'unsubscribe': {
      const { subscriptionIds } = data
      if (!ws || ws.readyState !== WebSocket.OPEN) return

      subscriptionIds.forEach((id) => {
        delete subMap[id]
      })

      ws.send(
        JSON.stringify({
          op: 'unsubscribe',
          subscriptionIds
        })
      )
      break
    }

    default:
      break
  }
}
