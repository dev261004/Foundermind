import { create } from "zustand"
import { AnalyticsSummary } from "@/types/analytics"

interface AnalyticsState {
  summary: AnalyticsSummary | null
  isLoading: boolean
  error: string | null

  setSummary: (data: AnalyticsSummary) => void
  setLoading: (value: boolean) => void
  setError: (message: string | null) => void
  reset: () => void
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  summary: null,
  isLoading: false,
  error: null,

  setSummary: (data) => set({ summary: data }),
  setLoading: (value) => set({ isLoading: value }),
  setError: (message) => set({ error: message }),
  reset: () => set({ summary: null, error: null }),
}))
