import { create } from "zustand"
import { DriftMetrics } from "@/types/drift"

interface DriftState {
  driftData: DriftMetrics | null
  alerts: string[]
  isLoading: boolean
  error: string | null

  setDriftData: (data: DriftMetrics) => void
  addAlert: (alert: string) => void
  clearAlerts: () => void
  setLoading: (value: boolean) => void
  setError: (message: string | null) => void
  reset: () => void
}

export const useDriftStore = create<DriftState>((set) => ({
  driftData: null,
  alerts: [],
  isLoading: false,
  error: null,

  setDriftData: (data) => set({ driftData: data }),
  addAlert: (alert) =>
    set((state) => ({ alerts: [...state.alerts, alert] })),
  clearAlerts: () => set({ alerts: [] }),
  setLoading: (value) => set({ isLoading: value }),
  setError: (message) => set({ error: message }),
  reset: () => set({ driftData: null, alerts: [], error: null }),
}))
