import { create } from "zustand"
import { IdeaResponse } from "@/types/idea"

interface RunState {
  results: IdeaResponse["results"] | null
  critique: IdeaResponse["critique"] | null
  executionLog: IdeaResponse["execution_log"] | []
  confidenceScore: number | null
  ideaType: string | null

  rerunCount: number
  isConverged: boolean

  setFullResult: (data: IdeaResponse) => void
  incrementRerun: () => void
  markConverged: () => void
  reset: () => void
}

export const useRunStore = create<RunState>((set) => ({
  results: null,
  critique: null,
  executionLog: [],
  confidenceScore: null,
  ideaType: null,

  rerunCount: 0,
  isConverged: false,

  setFullResult: (data) =>
    set((state) => ({
      results: data.results,
      critique: data.critique,
      executionLog: data.execution_log,
      confidenceScore: data.confidence_score,
      ideaType: data.idea_type,
      isConverged: !data.critique?.needs_rerun,
      rerunCount: data.critique?.needs_rerun
        ? state.rerunCount + 1
        : state.rerunCount,
    })),

  incrementRerun: () =>
    set((state) => ({ rerunCount: state.rerunCount + 1 })),

  markConverged: () =>
    set({ isConverged: true }),

  reset: () =>
    set({
      results: null,
      critique: null,
      executionLog: [],
      confidenceScore: null,
      ideaType: null,
      rerunCount: 0,
      isConverged: false,
    }),
}))