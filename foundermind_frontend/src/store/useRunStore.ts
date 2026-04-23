import { create } from "zustand"
import { agentService } from "@/app/services/agentService"
import { AgentAnalysisResponse } from "@/types/analysis"

interface RunState {
  activeIdeaId: string | null
  activeRunId: string | null
  result: AgentAnalysisResponse | null
  executionLog: AgentAnalysisResponse["execution_log"]
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
  activeRunId: null,
  result: null,
  executionLog: [],
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
      activeRunId: null,
      result: options?.force || state.activeIdeaId !== ideaId ? null : state.result,
      executionLog: [],
      status: "running",
      error: null,
    })

    try {
      const startResponse = await agentService.startAnalysis({
        idea_id: ideaId,
        force: options?.force ?? false,
      })
      const { agent_run_id } = startResponse

      if (startResponse.status === "completed" && startResponse.result) {
        const data = startResponse.result

        set({
          activeIdeaId: ideaId,
          activeRunId: agent_run_id,
          result: data,
          executionLog: data.execution_log ?? [],
          status: "completed",
          error: null,
          rerunCount: data.critique?.needs_rerun ? data.critique.rerun_tools.length : 0,
          isConverged: !data.critique?.needs_rerun,
        })
        return
      }

      set({ activeRunId: agent_run_id })

      for (let attempt = 0; attempt < 180; attempt += 1) {
        const poll = await agentService.getAnalysisStatus(agent_run_id)

        set((current) => ({
          activeIdeaId: ideaId,
          activeRunId: agent_run_id,
          executionLog: poll.execution_log ?? current.executionLog,
          status: poll.status === "failed" ? "failed" : poll.status === "completed" ? "completed" : "running",
          error:
            poll.status === "failed"
              ? poll.critique?.error ?? "Analysis failed. Please try again."
              : null,
        }))

        if (poll.status === "completed" && poll.result) {
          const data = poll.result

          set({
            activeIdeaId: ideaId,
            activeRunId: agent_run_id,
            result: data,
            executionLog: data.execution_log ?? [],
            status: "completed",
            error: null,
            rerunCount: data.critique?.needs_rerun ? data.critique.rerun_tools.length : 0,
            isConverged: !data.critique?.needs_rerun,
          })
          return
        }

        if (poll.status === "failed") {
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 1500))
      }

      throw new Error("Analysis timed out. Please try again.")
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Analysis failed. Please try again."

      set({
        activeIdeaId: ideaId,
        activeRunId: null,
        result: null,
        executionLog: [],
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
      activeRunId: data.agent_run_id ?? null,
      result: data,
      executionLog: data.execution_log ?? [],
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
      activeRunId: null,
      result: null,
      executionLog: [],
      status: "idle",
      error: null,
      rerunCount: 0,
      isConverged: false,
    }),
}))
