// Kakao Maps SDK loader.
//
// The SDK <script> in index.html is loaded with `autoload=false`, so it no longer
// injects its sub-script via document.write (which Chrome flags as a
// parser-blocking cross-site script). With autoload disabled, the maps module is
// only ready after `kakao.maps.load(cb)` runs — use loadKakaoMaps() to await it.

let readyPromise = null

export function loadKakaoMaps(timeoutMs = 10000) {
  if (readyPromise) return readyPromise

  readyPromise = new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      const k = window.kakao
      if (k && k.maps && typeof k.maps.load === 'function') {
        k.maps.load(() => resolve(k))
        return
      }
      if (Date.now() - start > timeoutMs) {
        readyPromise = null // allow a later retry
        reject(new Error('Kakao Maps SDK load timeout'))
        return
      }
      setTimeout(tick, 50)
    }
    tick()
  })

  return readyPromise
}
