import { useEffect } from 'react'

const useContentsScrollListener = (callBack) => {
  useEffect(() => {
    const contents = document.getElementById('mainContent')
    const handleScroll = () => {
      if (callBack) callBack()
    }

    if (contents) {
      contents.addEventListener('scroll', handleScroll)
      return () => contents.removeEventListener('scroll', handleScroll)
    }
  }, [callBack])
}

export default useContentsScrollListener
