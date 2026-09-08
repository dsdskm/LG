// Google Maps JS API loader (Places library) for global address search.
//
// Mirrors kakaoLoader.js: a singleton promise that resolves once `google.maps.places`
// is ready, so callers can safely call loadGoogleMaps() from multiple places.

let readyPromise = null

export function loadGoogleMaps(timeoutMs = 10000) {
  if (readyPromise) return readyPromise

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  readyPromise = new Promise((resolve, reject) => {
    if (!apiKey) {
      readyPromise = null
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'))
      return
    }

    if (window.google?.maps?.places) {
      resolve(window.google)
      return
    }

    const waitForReady = (start) => {
      const tick = () => {
        if (window.google?.maps?.places) {
          resolve(window.google)
          return
        }
        if (Date.now() - start > timeoutMs) {
          readyPromise = null
          reject(new Error('Google Maps SDK load timeout'))
          return
        }
        setTimeout(tick, 50)
      }
      tick()
    }

    const existing = document.getElementById('google-maps-sdk')
    if (existing) {
      waitForReady(Date.now())
      return
    }

    const script = document.createElement('script')
    script.id = 'google-maps-sdk'
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`
    script.onerror = () => {
      readyPromise = null
      reject(new Error('Google Maps SDK failed to load'))
    }
    script.onload = () => waitForReady(Date.now())
    document.head.appendChild(script)
  })

  return readyPromise
}
