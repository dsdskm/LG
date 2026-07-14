// urdf/stlParseWorker.js
// STL 파싱을 메인 스레드 밖(워커)에서 수행 → UI 멈춤 없이, 풀로 병렬 처리.
// 메인에서 ArrayBuffer를 transfer로 받아 STLLoader.parse 후, geometry 속성 배열을 transfer로 반환.
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

const loader = new STLLoader()

self.onmessage = (e) => {
  const { id, buffer } = e.data || {}
  try {
    const geo = loader.parse(buffer) // ArrayBuffer(바이너리) / string(ASCII) 모두 처리
    const position = geo.attributes?.position?.array || null
    const normal = geo.attributes?.normal?.array || null
    const index = geo.index?.array || null

    const transfer = []
    if (position) transfer.push(position.buffer)
    if (normal) transfer.push(normal.buffer)
    if (index) transfer.push(index.buffer)

    self.postMessage({ id, ok: true, position, normal, index }, transfer)
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.message || err) })
  }
}
