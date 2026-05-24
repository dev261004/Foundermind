// src/store/useAuthStore.ts

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { authService } from "@/app/services/authService"

interface AuthState {
  email: string | null
  role: "user" | "admin" | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      role: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const data = await authService.login({ email, password })
          set({
            email: data.email,
            role: data.role ?? "user",
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isLoading: false,
            error: null,
          })
          return true
        } catch (err: unknown) {
          const message =
            (err as { message?: string })?.message ?? "Login failed. Please try again."
          set({ isLoading: false, error: message })
          return false
        }
      },

      register: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const data = await authService.register({ email, password })
          set({
            email: data.email,
            role: data.role ?? "user",
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isLoading: false,
            error: null,
          })
          return true
        } catch (err: unknown) {
          const message =
            (err as { message?: string })?.message ?? "Registration failed. Please try again."
          set({ isLoading: false, error: message })
          return false
        }
      },

      logout: () =>
        set({
          email: null,
          role: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
          error: null,
        }),

      clearError: () => set({ error: null }),
    }),
    {
      name: "foundermind-auth",
      // Only persist tokens and email — not transient loading/error state
      partialize: (state) => ({
        email: state.email,
        role: state.role,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
