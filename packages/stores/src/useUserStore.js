import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set) => ({
      isLoggedIn: false,
      session: {
        userId: 1,
        email: 'test-user@lge.com'
      },
      setSession: (session) => set({ session }),
      setQueryParams: (params) => set({ queryParams: params }),
      updateTokens: ({ accessToken, refreshToken }) =>
        set((state) => ({
          session: {
            ...state.session,
            accessToken,
            refreshToken,
            expiresAt: Date.now() + 360000
          }
        })),
      setLoggedIn: (data) => set({ isLoggedIn: data }),
      login: ({ email, accessToken, refreshToken, userId, userRole, userLevel }) => {
        set({
          isLoggedIn: true,
          session: {
            email,
            accessToken,
            refreshToken,
            userId,
            userRole,
            userLevel,
            expiresAt: new Date().getTime() + 360000
          }
        })
      },
      logout: () =>
        set(() => ({
          isLoggedIn: false,
          session: null,
          queryParams: null
        }))
    }),
    {
      name: 'user-session',
      getStorage: () => sessionStorage
    }
  )
)

