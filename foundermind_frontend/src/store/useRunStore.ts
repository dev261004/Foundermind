import { create } from "zustand"
import { agentService } from "@/app/services/agentService"
import { AgentAnalysisResponse } from "@/types/analysis"

type RunStatus = "idle" | "running" | "completed" | "partial" | "failed" | "quota_exhausted"

const RESULT_READY_STATUSES = new Set<RunStatus>(["completed", "partial", "quota_exhausted"])

interface RunState {
  activeIdeaId: string | null
  activeRunId: string | null
  result: AgentAnalysisResponse | null
  executionLog: AgentAnalysisResponse["execution_log"]
  status: RunStatus
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
      (state.status === "running" || RESULT_READY_STATUSES.has(state.status))
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

      if (RESULT_READY_STATUSES.has(startResponse.status as RunStatus) && startResponse.result) {
        const data = startResponse.result

        set({
          activeIdeaId: ideaId,
          activeRunId: agent_run_id,
          result: data,
          executionLog: data.execution_log ?? [],
          status: startResponse.status as RunStatus,
          error: startResponse.critique?.message ?? null,
          rerunCount: data.critique?.needs_rerun ? data.critique.rerun_tools.length : 0,
          isConverged: !data.critique?.needs_rerun,
        })
        return
      }

      if (startResponse.status === "failed") {
        set({
          activeIdeaId: ideaId,
          activeRunId: agent_run_id,
          result: null,
          executionLog: [],
          status: "failed",
          error:
            startResponse.error ??
            startResponse.critique?.error ??
            "Analysis failed. Please try again.",
          rerunCount: 0,
          isConverged: false,
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
          status:
            poll.status === "failed"
              ? "failed"
              : poll.status === "completed" || poll.status === "partial" || poll.status === "quota_exhausted"
                ? (poll.status as RunStatus)
                : "running",
          error:
            poll.status === "failed"
              ? poll.critique?.error ?? "Analysis failed. Please try again."
              : poll.status === "quota_exhausted"
                ? poll.critique?.message ?? "Analysis paused — quota reached. Retry after rate limit resets."
              : null,
        }))

        if (RESULT_READY_STATUSES.has(poll.status as RunStatus) && poll.result) {
          const data = poll.result

          set({
            activeIdeaId: ideaId,
            activeRunId: agent_run_id,
            result: data,
            executionLog: data.execution_log ?? [],
            status: poll.status as RunStatus,
            error: poll.critique?.message ?? null,
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
