import * as ROSLIB from 'roslib'

// 싱글톤으로 유지하고 메시지를 수신 한다
// msg subscribe요청을 수신 하고 전달된 handler에 수신 내용을 전달해줌
// bufferManager를 유지해서 수신된 msg를 내부 적으로 저장 한다

export default class RosbridgeTransport {
  constructor(connUrl, bufferManager) {
    this.subs = new Map()

    this.bufferManager = bufferManager

    this.ros = new ROSLIB.Ros({
      url: connUrl,
      transportLibrary: 'websocket'
    })

    this.ros.on('connection', () => {
      console.log('[RosbridgeTransport]onConnect')
    })

    this.ros.on('error', (error) => {
      console.error('[RosbridgeTransport]Error connecting to rosbridge:', error)
    })

    this.ros.on('close', () => {
      console.log('[RosbridgeTransport]Connection closed')
    })
  }

  commonHandler = (topicName, message) => {
    //console.log(`Received from ${topicName}:`)

    this.bufferManager.add(topicName, message)
    const { handlers } = this.subs.get(topicName)
    handlers?.forEach((handler) => handler(message))
  }

  subscribeMsg(name, type, handler) {
    console.log(`[RosbridgeTransport]subscribe msg  ${name}`)
    var listener = new ROSLIB.Topic({
      ros: this.ros,
      name: name,
      messageType: type
    })

    listener.subscribe((msg) => this.commonHandler(name, msg))
    if (!this.subs.has(name)) {
      this.subs.set(name, {
        listener: listener,
        handlers: new Set()
      })
    }
    this.subs.get(name).handlers.add(handler)
  }

  unSubscribeMsg(name, handler = null) {
    const subs = this.subs.get(name)
    if (!subs) return

    const { listener, handlers } = this.subs.get(name)
    console.log('[RosbridgeTransport]unsubscribe ', name)

    handlers.delete(handler)

    if (!handler || handlers.size <= 0) {
      listener.unsubscribe()
      this.subs.delete(name)
    }
  }

  getActiveTopics() {
    return new Promise((resolve, reject) => {
      this.ros.getTopics(
        (topics) => {
          resolve(topics)
        },
        (error) => {
          console.error('[RosbridgeTransport]get topics fail', error)
          reject(error)
        }
      )
    })
  }

  close() {
    try {
      for (var key of this.subs.keys()) {
        this.unSubscribeMsg(key)
      }
      this.subs.clear()
      this.ros?.close()
    } catch (e) {
      console.warn('[RosbridgeTransport]ros close error:', e)
    }
  }
}

