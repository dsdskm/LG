// 수신된 msg를 저장한다
// msg type별로 데이터를 저장하고
// index buffer를 별도로 관리해서 msg별 인입 순서를 유지 한다

// dataMap은 msgType을 키로 map을 value로 유지하는 map 이다
// value는 msgId를 key로 하고 msg 내용을 value로 한다

// indexMap은 msgId를 key로 하고 msg 검색을위한 요약 정보를 value로 가지고 있다

export class MsgBufferManager {
  constructor(nameSpace) {
    this.nameSpace = nameSpace
    this.msgId = -1
    this.dataMap = new Map()
    this.dataDeletedBuffer = new Map()
    this.indexMap = new Map()
  }

  get latestMsgId() {
    return this.msgId
  }

  add(msgName, msg) {
    if (!this._checkNameSpace(msgName, msg)) {
      //console.log(`[Namespace mismatched] namespace = ${this.nameSpace} frame =`, msg.transforms[0].header.frame_id)
      return
    }

    if (!this.dataMap.get(msgName)) {
      this.dataMap.set(msgName, new Map())
    }

    this.msgId++
    const msgData = {
      timeStamp: this._stampToNs(msg.header?.stamp),
      msgName: msgName,
      frameId: msg.header?.frame_id,
      data: msg,
      msgId: this.msgId
    }

    const indexData = {
      timeStamp: msgData.timeStamp,
      type: msgData.msgName,
      msgId: this.msgId
    }

    this.indexMap.set(this.msgId, indexData)
    this.dataMap.get(msgName).set(this.msgId, msgData)

    // 이전데이터 삭제 로직
    // 1. 버퍼사이즈 보다 많은 데이터가 입력될경우 가장 오래된 데이터를 삭제 한다
    // 2. indexMap기준으로 삭제 여부판단하며 indexMap에서 삭제 되면 dataMap에서도 삭제
    // 2. 각 메시지별 한개씩의 삭제 대기 버퍼 유지 필요 할듯 ... (map 같은 경우 발행 주기가 달라 특정 시점으로 이동후 재생시 발행된 메시지가 없을수도 있음 )
    // 3. 특수 msg의 경우 삭제 방식 다르게 가야함 (ex. tf_static(미삭제)

    if (this.indexMap.size > 30000) {
      const key = this.indexMap.keys().next().value
      const item = this.indexMap.get(key)
      this.indexMap.delete(key)

      console.log('meet max length')

      if (item.key === '/tf_static') {
        // tf_static의 경우 삭제 하지 않음
        return
      }

      const dataKey = this.dataMap.get(item.type).keys().next().value
      const data = this.dataMap.get(item.type).get(dataKey)
      this.dataDeletedBuffer.set(item.type, data) //임시 저장 버퍼

      this.dataMap.get(item.type).delete(dataKey)
    }
  }

  // 요청되는 타입에 대해 startMsgId 부터 targetTime까지의 msg를 전달함
  // targetTime이 없을 경우 현재 시간까지의 msg전달
  // 요청되는 타입이 1개일경우 타입별 버퍼에서 읽어옴
  // 요청되는 타입이 2개 이상일 경우 index buffer를 이용해서 순서대로 데이터를 읽어옴

  // 타입별로 표시 하는 경우가 더 많다고 가정, 이부분에 대한 처리 추가 필요
  // 배열로 처리 했을 경우 실시간으로 데이터가 추가 되고 shift연산등을 통해 인덱스가 변경 되는 경우가 있어 set방식 우선 검토함

  getMsg(topics, startMsgId, targetTime = Date.now() * 1e6) {
    if (this.indexMap.size <= 0 || !topics) {
      return []
    }

    // 단일 토픽 최적화 처리
    if (Array.isArray(topics) && topics.length === 1) {
      return this._getSingleTypeMsg(topics[0], startMsgId, targetTime)
    }

    var dataId = startMsgId + 1

    if (this.indexMap.keys().next().value > dataId) {
      dataId = this.indexMap.keys().next().value
    }

    const msgList = []
    while (this.indexMap.has(dataId)) {
      const nextData = this.indexMap.get(dataId)

      if (nextData.timeStamp > targetTime) break

      if (topics.includes(nextData.type)) {
        const topicData = this.dataMap.get(nextData.type)
        if (topicData && topicData.has(dataId)) {
          msgList.push(topicData.get(dataId))
        }
      }

      if (dataId >= this.msgId) break
      dataId++
    }
    return msgList
  }

  getLatestMsg(topic, targetTime = Date.now() * 1e6) {
    return this._getSingleTypeMsg(topic, -1, targetTime)
  }

  clearData() {
    this.msgId = -1
    this.dataMap.clear()
    this.dataDeletedBuffer.clear()
    this.indexMap.clear()
  }

  _getSingleTypeMsg(topic, startMsgId, targetTime) {
    const topicMap = this.dataMap.get(topic)

    // 일반적인 msg의 경우 topicMap이 비어 있으면 없는대로 전달
    // latest msg의 경우 topicMap이 비어 있으면 deleted buffer에서 읽어 옴
    if (startMsgId === -1) {
      // targetTime 기준 "가장 가까운" 메시지 1개
      const closest = this._findClosestMsgByTime(topic, topicMap, targetTime)
      return closest ? [closest] : []
    }
    if (!topicMap || topicMap.size === 0) return []

    // startMsgId보다 큰 msgId부터 targetTime 이하까지
    return this._collectFromMsgIdUntilTime(topicMap, startMsgId, targetTime)
  }

  _findClosestMsgByTime(topic, topicMap, targetTime) {
    var bestBefore = null // time ≤ targetTime 중 가장 가까운

    for (const [, msg] of topicMap) {
      if (msg.timeStamp >= targetTime) break
      bestBefore = msg
    }

    if (!bestBefore) {
      bestBefore = this.dataDeletedBuffer.get(topic)
    }
    return bestBefore
  }

  _checkNameSpace(name, msg) {
    let normalizeName = this._normalizeFrameId(this.nameSpace)

    if (name === '/tf' || name === '/tf_static') {
      const frameId = msg.transforms?.[0]?.child_frame_id
      if (!frameId?.startsWith(normalizeName)) return false
      if (normalizeName.length === 0 && frameId.includes('/')) return false
    }

    if (name === '/rosout') {
      const loggerName = msg.name
      if (!loggerName.startsWith(normalizeName)) return false
      if (normalizeName.length === 0 && loggerName.includes('/')) return false
    }
    return true
  }

  _collectFromMsgIdUntilTime(topicMap, startMsgId, targetTime) {
    const list = []
    for (const [id, msg] of topicMap) {
      if (id <= startMsgId) continue
      if (msg.timeStamp > targetTime) break
      list.push(msg)
    }
    return list
  }

  _stampToNs(stamp) {
    if (!stamp) return Date.now() * 1e6
    const sec = Number(stamp.sec ?? stamp.secs ?? 0)
    const nsec = Number(stamp.nanosec ?? stamp.nsecs ?? 0)
    return sec * 1e9 + nsec
  }

  _normalizeFrameId(s) {
    if (!s) return ''
    return s.startsWith('/') ? s.slice(1) : s
  }
}

