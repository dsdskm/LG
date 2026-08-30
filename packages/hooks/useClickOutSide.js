import { useEffect } from 'react'

const useClickOutSide = (ref, callBack) => {
  useEffect(() => {
    const handleClickOutside = ({ target }) => {
      if (ref.current && !ref.current.contains(target)) callBack()
    }

    ;['click', 'mousedown', 'touchstart'].forEach((event) => {
      if (typeof window !== 'undefined') {
        window.addEventListener(event, handleClickOutside)
      }
    })

    return () => {
      ;['click', 'mousedown', 'touchstart'].forEach((event) => {
        if (typeof window !== 'undefined') {
          window.removeEventListener(event, handleClickOutside)
        }
      })
    }
  }, [ref, callBack])
}

export default useClickOutSide
