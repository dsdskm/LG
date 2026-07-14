import React, { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react'

const PlaybackContext = createContext(null)

export function PlaybackProvider({ children }) {
  const [paused, setPaused] = useState(false)

  // setInterval/외부 콜백에서 최신 paused를 읽고 싶을 때 유용
  const pausedRef = useRef(paused)
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  const togglePaused = useCallback(() => setPaused((p) => !p), [])

  const value = useMemo(
    () => ({ paused, setPaused, togglePaused, pausedRef }),
    [paused, togglePaused]
  )

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext)
  return ctx
}