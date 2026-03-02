import { create } from "zustand"
import { AnalyticsMetrics } from "@/types/analytics"

interface AnalyticsState {
  metrics: AnalyticsMetrics | null
  isLoading: boolean

  setMetrics: (data: AnalyticsMetrics) => void
  setLoading: (value: boolean) => void
  reset: () => void
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  metrics: null,
  isLoading: false,

  setMetrics: (data) => set({ metrics: data }),
  setLoading: (value) => set({ isLoading: value }),
  reset: () => set({ metrics: null }),
}))