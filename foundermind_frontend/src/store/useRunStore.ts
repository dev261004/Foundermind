import { create } from "zustand"
import { agentService } from "@/app/services/agentService"
import { AgentAnalysisResponse } from "@/types/analysis"

interface RunState {
  activeIdeaId: string | null
  result: AgentAnalysisResponse | null
  status: "idle" | "running" | "completed" | "failed"
  error: string | null
  rerunCount: number
  isConverged: boolean

  startAnalysis: (ideaId: string, options?: { force?: boolean }) => Promise<void>
  setFullResult: (ideaId: string | AgentAnalysisResponse, data?: AgentAnalysisResponse) => void
  incrementRerun: () => void
  markConverged: () => void
  reset: () => void
}

export const useRunStore = create<RunState>((set) => ({
  activeIdeaId: null,
  result: null,
  status: "idle",
  error: null,
  rerunCount: 0,
  isConverged: false,

  startAnalysis: async (ideaId, options) => {
    const state = useRunStore.getState()

    if (
      !options?.force &&
      state.activeIdeaId === ideaId &&
      (state.status === "running" || state.status === "completed")
    ) {
      return
    }

    set({
      activeIdeaId: ideaId,
      result: options?.force || state.activeIdeaId !== ideaId ? null : state.result,
      status: "running",
      error: null,
    })

    try {
      const data = await agentService.runAnalysis({ idea_id: ideaId })

      set({
        activeIdeaId: ideaId,
        result: data,
        status: "completed",
        error: null,
        rerunCount: data.critique?.needs_rerun ? data.critique.rerun_tools.length : 0,
        isConverged: !data.critique?.needs_rerun,
      })
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Analysis failed. Please try again."

      set({
        activeIdeaId: ideaId,
        result: null,
        status: "failed",
        error: message,
        isConverged: false,
      })
    }
  },

  setFullResult: (ideaIdOrData, maybeData) => {
    const data = (typeof ideaIdOrData === "string" ? maybeData : ideaIdOrData) as AgentAnalysisResponse | undefined
    const activeIdeaId = typeof ideaIdOrData === "string" ? ideaIdOrData : null

    if (!data) {
      return
    }

    set({
      activeIdeaId,
      result: data,
      status: "completed",
      error: null,
      rerunCount: data.critique?.needs_rerun ? data.critique.rerun_tools.length : 0,
      isConverged: !data.critique?.needs_rerun,
    })
  },

  incrementRerun: () =>
    set((state) => ({ rerunCount: state.rerunCount + 1 })),

  markConverged: () =>
    set({ isConverged: true }),

  reset: () =>
    set({
      activeIdeaId: null,
      result: null,
      status: "idle",
      error: null,
      rerunCount: 0,
      isConverged: false,
    }),
}))
