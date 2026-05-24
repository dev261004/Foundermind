import { create } from "zustand"
import {
  ComparisonMode,
  ComparisonOptionsResponse,
  ComparisonResult,
} from "@/types/comparison"

interface ComparisonState {
  mode: ComparisonMode
  options: ComparisonOptionsResponse | null
  result: ComparisonResult | null
  selectedRunIds: string[]
  selectedIdeaIds: string[]
  isLoadingOptions: boolean
  isComparing: boolean
  error: string | null

  setMode: (mode: ComparisonMode) => void
  setOptions: (options: ComparisonOptionsResponse) => void
  setResult: (result: ComparisonResult | null) => void
  toggleRun: (runId: string) => void
  toggleIdea: (ideaId: string) => void
  clearSelection: () => void
  setLoadingOptions: (value: boolean) => void
  setComparing: (value: boolean) => void
  setError: (message: string | null) => void
}

const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value]

export const useComparisonStore = create<ComparisonState>((set) => ({
  mode: "analyses",
  options: null,
  result: null,
  selectedRunIds: [],
  selectedIdeaIds: [],
  isLoadingOptions: false,
  isComparing: false,
  error: null,

  setMode: (mode) => set({ mode, result: null, error: null }),
  setOptions: (options) => set({ options }),
  setResult: (result) => set({ result }),
  toggleRun: (runId) =>
    set((state) => ({ selectedRunIds: toggleValue(state.selectedRunIds, runId) })),
  toggleIdea: (ideaId) =>
    set((state) => ({ selectedIdeaIds: toggleValue(state.selectedIdeaIds, ideaId) })),
  clearSelection: () => set({ selectedRunIds: [], selectedIdeaIds: [], result: null }),
  setLoadingOptions: (value) => set({ isLoadingOptions: value }),
  setComparing: (value) => set({ isComparing: value }),
  setError: (message) => set({ error: message }),
}))
