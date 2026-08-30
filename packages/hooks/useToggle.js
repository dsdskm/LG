import { useState } from 'react'

export default function useToggle(initialState = false) {
  const [state, setState] = useState(initialState)
  const toggle = () => setState(!state)
  const on = () => setState(true)
  const off = () => setState(false)

  return { state, toggle, on, off }
}
