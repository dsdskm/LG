import { persist, createJSONStorage } from 'zustand/middleware'
import { create } from 'zustand'

function getCurrentRoute(gnb, path) {
  const normalize = (p) => p.split('/').filter(Boolean)
  const pathSegments = normalize(path)

  if (!Array.isArray(gnb)) return null

  for (const item of gnb) {
    const itemSegments = item.path ? normalize(item.path) : []

    const isMatch =
      item.path &&
      (() => {
        const requiredSegments = itemSegments.filter((s) => !s.endsWith('?'))
        if (pathSegments.length < requiredSegments.length || pathSegments.length > itemSegments.length) {
          return false
        }
        return itemSegments.every((segment, i) => {
          if (i >= pathSegments.length) return segment.endsWith('?')
          const cleanSegment = segment.replace(/\?$/, '')
          return cleanSegment.startsWith(':') || cleanSegment === pathSegments[i]
        })
      })()

    if (isMatch) return item

    if (item.depth) {
      const nestedResult = getCurrentRoute(item.depth, path)
      if (nestedResult) return nestedResult
    }
  }
  return null
}

export const useRouteStore = create(
  persist(
    (set, get) => ({
      currentRoute: null,
      backPath: null,
      setRoute: (gnb, path) => {
        const { currentRoute: prevRoute, backPath: prevBackPath } = get()
        const route = getCurrentRoute(gnb, path)
        const backPath = route?.hasBack ? path.replace(/\/[^/]*$/, '') : null

        if (prevRoute === route && prevBackPath === backPath) return

        set({
          currentRoute: route,
          backPath
        })
      }
    }),
    {
      name: 'STORE_ROUTE',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        backPath: state.backPath
      })
    }
  )
)
