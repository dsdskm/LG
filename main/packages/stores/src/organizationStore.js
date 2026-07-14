import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useUserStore } from './useUserStore'

const defaultState = {
  selectedOrgs: ['none', 'none'],
  actualOrgs: [],
  allOrgs: [],
  company: {},
  defaultOrg: {},
  forcedNoneCount: 0,
  backupSelectedOrgs: null
}

const customStorage = {
  getItem: (name) => {
    const userId = useUserStore.getState().session?.email || 'default'
    const storedStr = localStorage.getItem(name)
    let storedState = null
    if (storedStr) {
      try {
        const storedObj = JSON.parse(storedStr)
        storedState = storedObj[userId]
      } catch {}
    }
    if (!storedState) {
      return JSON.stringify({ state: { selectedOrgs: defaultState.selectedOrgs }, version: 0 })
    }
    return JSON.stringify(storedState)
  },
  setItem: (name, value) => {
    const userId = useUserStore.getState().session?.email || 'default'
    const storedStr = localStorage.getItem(name)
    let storedObj = {}
    if (storedStr) {
      try {
        storedObj = JSON.parse(storedStr)
      } catch {}
    }
    storedObj[userId] = JSON.parse(value)
    localStorage.setItem(name, JSON.stringify(storedObj))
  },
  removeItem: (name) => {
    const userId = useUserStore.getState().session?.email || 'default'
    const storedStr = localStorage.getItem(name)
    if (storedStr) {
      try {
        const storedObj = JSON.parse(storedStr)
        delete storedObj[userId]
        localStorage.setItem(name, JSON.stringify(storedObj))
      } catch {}
    }
  }
}

export const useOrganizationStore = create(
  persist(
    (set) => ({
      ...defaultState,
      setSelectedOrgs: (orgs) => set({ selectedOrgs: orgs }),
      setActualOrgs: (orgs) => set({ actualOrgs: orgs }),
      setAllOrgs: (orgs) => set({ allOrgs: orgs }),
      setCompany: (company) => set({ company }),
      setDefaultOrg: (org) => set({ defaultOrg: org }),
      setForcedNone: (force) =>
        set((state) => {
          const newCount = force ? state.forcedNoneCount + 1 : Math.max(0, state.forcedNoneCount - 1)
          if (force && newCount === 1) {
            return {
              forcedNoneCount: newCount,
              backupSelectedOrgs: state.selectedOrgs,
              selectedOrgs: ['none', 'none']
            }
          } else if (!force && newCount === 0 && state.backupSelectedOrgs) {
            const restoredOrgs = state.backupSelectedOrgs
            return {
              forcedNoneCount: newCount,
              selectedOrgs: restoredOrgs,
              backupSelectedOrgs: null
            }
          }
          return { forcedNoneCount: newCount }
        })
    }),
    {
      name: 'STORE_ORGANIZATION',
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        selectedOrgs: state.forcedNoneCount > 0 ? state.backupSelectedOrgs || state.selectedOrgs : state.selectedOrgs,
        actualOrgs: state.actualOrgs,
        allOrgs: state.allOrgs,
        company: state.company,
        defaultOrg: state.defaultOrg
      })
    }
  )
)

let currentEmail = useUserStore.getState().session?.email
useUserStore.subscribe((state) => {
  const newEmail = state.session?.email
  if (currentEmail !== newEmail) {
    currentEmail = newEmail
    useOrganizationStore.persist.rehydrate()
  }
})

