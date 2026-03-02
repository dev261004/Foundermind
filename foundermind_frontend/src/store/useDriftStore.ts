import { create } from "zustand"
import { DriftMetrics } from "@/types/drift"

interface DriftState {
  driftData: DriftMetrics | null
  alerts: string[]

  setDriftData: (data: DriftMetrics) => void
  addAlert: (alert: string) => void
  clearAlerts: () => void
}

export const useDriftStore = create<DriftState>((set) => ({
  driftData: null,
  alerts: [],

  setDriftData: (data) => set({ driftData: data }),
  addAlert: (alert) =>
    set((state) => ({ alerts: [...state.alerts, alert] })),
  clearAlerts: () => set({ alerts: [] }),
}))