import { useRef, useState, useEffect } from 'react'
import useToggle from './useToggle'

const useInput = (initialState = '') => {
  const inputRef = useRef(null)
  const [value, setValue] = useState(initialState)
  const { state, on, off } = useToggle(false)

  useEffect(() => {
    setValue(initialState)
  }, [initialState])

  const handleChange = ({ target }) => {
    const newValue =
      target.maxLength > -1 && target.maxLength < target.value.length
        ? target.value.slice(0, target.maxLength)
        : target.value
    setValue(newValue)
  }
  const handleReset = (e) => {
    e.stopPropagation()
    setValue('')
  }

  return {
    inputRef,
    value,
    change: handleChange,
    reset: handleReset,
    isFocused: state,
    focus: on,
    blur: off
  }
}

export default useInput
