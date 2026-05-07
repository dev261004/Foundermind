import { create } from "zustand"
import {
  agentService,
  StopAnalysisAction,
  StopAnalysisResponse,
} from "@/app/services/agentService"
import { AgentAnalysisResponse, SectionStates } from "@/types/analysis"

type RunStatus =
  | "idle"
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "quota_exhausted"
  | "awaiting_clarification"
  | "cancelled"

const RESULT_READY_STATUSES = new Set<RunStatus>(["completed", "partial", "quota_exhausted"])
const POLL_INTERVAL_MS = 1500
const SECTION_RETRY_POLL_INTERVAL_MS = 2000
const SECTION_RETRY_MAX_POLL_ATTEMPTS = 90
const ANALYSIS_POLL_WINDOW_MS = 20 * 60 * 1000
const MAX_ANALYSIS_POLL_ATTEMPTS = Math.ceil(ANALYSIS_POLL_WINDOW_MS / POLL_INTERVAL_MS)
const ANALYSIS_TIMEOUT_MESSAGE = "Analysis timed out after 20 minutes. Please try again."

function areExecutionLogsEqual(
  current: AgentAnalysisResponse["execution_log"],
  next: AgentAnalysisResponse["execution_log"]
) {
  if (current === next) {
    return true
  }

  if (current.length !== next.length) {
    return false
  }

  return JSON.stringify(current) === JSON.stringify(next)
}

function getStableExecutionLog(
  current: AgentAnalysisResponse["execution_log"],
  next: AgentAnalysisResponse["execution_log"] | null | undefined
) {
  if (!next) {
    return current
  }

  if (next.length === 0 && current.length > 0) {
    return current
  }

  if (areExecutionLogsEqual(current, next)) {
    return current
  }

  return next
}

function buildCancellationEntry(action: StopAnalysisAction) {
  const messageByAction: Record<StopAnalysisAction, string> = {
    edit: "Analysis stopped so you can edit the idea and rerun it.",
    new_idea: "Analysis stopped so you can submit a different idea.",
    terminate: "Analysis stopped and is being permanently deleted.",
  }

  return {
    type: "user_cancelled",
    action,
    status: "cancelled",
    message: messageByAction[action],
    timestamp: new Date().toISOString(),
  }
}

interface RunState {
  activeIdeaId: string | null
  activeRunId: string | null
  result: AgentAnalysisResponse | null
  executionLog: AgentAnalysisResponse["execution_log"]
  sectionStates: SectionStates
  status: RunStatus
  error: string | null
  rerunCount: number
  isConverged: boolean
  clarificationQuestions: string[]

  startAnalysis: (ideaId: string, options?: { force?: boolean }) => Promise<void>
  submitClarification: (runId: string, answers: Record<string, string>) => Promise<void>
  stopAnalysis: (action: StopAnalysisAction) => Promise<StopAnalysisResponse | null>
  retrySection: (runId: string, sectionKey: string) => Promise<void>
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
  sectionStates: {},
  status: "idle",
  error: null,
  rerunCount: 0,
  isConverged: false,
  clarificationQuestions: [],

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
      executionLog:
        options?.force && state.activeIdeaId === ideaId
          ? state.executionLog
          : [],
      sectionStates: {},
      status: "running",
      error: null,
      clarificationQuestions: [],
    })

    try {
      const startResponse = await agentService.startAnalysis({
        idea_id: ideaId,
        force: options?.force ?? false,
      })
      const { agent_run_id } = startResponse

      // Handle awaiting_clarification from cached response
      if (startResponse.status === "awaiting_clarification") {
        set({
          activeIdeaId: ideaId,
          activeRunId: agent_run_id,
          result: null,
          executionLog: [],
          sectionStates: {},
          status: "awaiting_clarification",
          error: null,
          clarificationQuestions: startResponse.clarification_questions ?? [],
          rerunCount: 0,
          isConverged: false,
        })
        return
      }

      if (startResponse.status === "cancelled") {
        set((current) => ({
          activeIdeaId: ideaId,
          activeRunId: agent_run_id,
          result: null,
          executionLog: getStableExecutionLog(
            current.executionLog,
            startResponse.execution_log ?? []
          ),
          sectionStates: {},
          status: "cancelled",
          error: startResponse.critique?.message ?? null,
          rerunCount: 0,
          isConverged: false,
          clarificationQuestions: [],
        }))
        return
      }

      if (RESULT_READY_STATUSES.has(startResponse.status as RunStatus) && startResponse.result) {
        const data = startResponse.result

        set({
          activeIdeaId: ideaId,
          activeRunId: agent_run_id,
          result: data,
          executionLog: data.execution_log ?? [],
          sectionStates: data.section_states ?? {},
          status: startResponse.status as RunStatus,
          error: startResponse.critique?.message ?? null,
          rerunCount: data.critique?.needs_rerun ? data.critique.rerun_tools.length : 0,
          isConverged: !data.critique?.needs_rerun,
          clarificationQuestions: [],
        })
        return
      }

      if (startResponse.status === "failed") {
        set({
          activeIdeaId: ideaId,
          activeRunId: agent_run_id,
          result: null,
          executionLog: [],
          sectionStates: {},
          status: "failed",
          error:
            startResponse.error ??
            startResponse.critique?.error ??
            "Analysis failed. Please try again.",
          rerunCount: 0,
          isConverged: false,
          clarificationQuestions: [],
        })
        return
      }

      set((current) => ({
        activeRunId: agent_run_id,
        executionLog: getStableExecutionLog(
          current.executionLog,
          startResponse.execution_log
        ),
      }))

      for (let attempt = 0; attempt < MAX_ANALYSIS_POLL_ATTEMPTS; attempt += 1) {
        const poll = await agentService.getAnalysisStatus(agent_run_id)
        const currentState = useRunStore.getState()

        if (
          currentState.activeRunId === agent_run_id &&
          currentState.status === "cancelled"
        ) {
          return
        }

        // Handle awaiting_clarification during polling
        if (poll.status === "awaiting_clarification") {
          set((current) => ({
            activeIdeaId: ideaId,
            activeRunId: agent_run_id,
            executionLog: getStableExecutionLog(
              current.executionLog,
              poll.execution_log
            ),
            status: "awaiting_clarification",
            error: null,
            clarificationQuestions: poll.clarification_questions ?? [],
          }))
          return // Stop polling
        }

        if (poll.status === "cancelled") {
          set((current) => ({
            activeIdeaId: ideaId,
            activeRunId: agent_run_id,
            executionLog: getStableExecutionLog(
              current.executionLog,
              poll.execution_log
            ),
            status: "cancelled",
            error: poll.critique?.message ?? null,
            clarificationQuestions: [],
          }))
          return
        }

        set((current) => ({
          activeIdeaId: ideaId,
          activeRunId: agent_run_id,
          executionLog: getStableExecutionLog(
            current.executionLog,
            poll.execution_log
          ),
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
            sectionStates: data.section_states ?? {},
            status: poll.status as RunStatus,
            error: poll.critique?.message ?? null,
            rerunCount: data.critique?.needs_rerun ? data.critique.rerun_tools.length : 0,
            isConverged: !data.critique?.needs_rerun,
            clarificationQuestions: [],
          })
          return
        }

        if (poll.status === "failed") {
          return
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }

      throw new Error(ANALYSIS_TIMEOUT_MESSAGE)
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
        clarificationQuestions: [],
      })
    }
  },

  submitClarification: async (runId, answers) => {
    const state = useRunStore.getState()
    const ideaId = state.activeIdeaId

    set({
      status: "running",
      executionLog: [],
      sectionStates: {},
      clarificationQuestions: [],
      error: null,
    })

    try {
      await agentService.submitClarification(runId, answers)

      // Resume polling — re-trigger startAnalysis which will poll the now-running task
      if (ideaId) {
        // Small delay to let the task start
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Poll for status directly since the run is already in progress
        for (let attempt = 0; attempt < MAX_ANALYSIS_POLL_ATTEMPTS; attempt += 1) {
          const poll = await agentService.getAnalysisStatus(runId)
          const currentState = useRunStore.getState()

          if (currentState.activeRunId === runId && currentState.status === "cancelled") {
            return
          }

          if (poll.status === "awaiting_clarification") {
            set((current) => ({
              activeIdeaId: ideaId,
              activeRunId: runId,
              executionLog: getStableExecutionLog(
                current.executionLog,
                poll.execution_log
              ),
              status: "awaiting_clarification",
              error: null,
              clarificationQuestions: poll.clarification_questions ?? [],
            }))
            return
          }

          if (poll.status === "cancelled") {
            set((current) => ({
              activeIdeaId: ideaId,
              activeRunId: runId,
              executionLog: getStableExecutionLog(
                current.executionLog,
                poll.execution_log
              ),
              status: "cancelled",
              error: poll.critique?.message ?? null,
              clarificationQuestions: [],
            }))
            return
          }

          set((current) => ({
            activeIdeaId: ideaId,
            activeRunId: runId,
            executionLog: getStableExecutionLog(
              current.executionLog,
              poll.execution_log
            ),
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
              activeRunId: runId,
              result: data,
              executionLog: data.execution_log ?? [],
              sectionStates: data.section_states ?? {},
              status: poll.status as RunStatus,
              error: poll.critique?.message ?? null,
              rerunCount: data.critique?.needs_rerun ? data.critique.rerun_tools.length : 0,
              isConverged: !data.critique?.needs_rerun,
              clarificationQuestions: [],
            })
            return
          }

          if (poll.status === "failed") {
            return
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
        }

        throw new Error(ANALYSIS_TIMEOUT_MESSAGE)
      }
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Failed to submit clarification. Please try again."

      set({
        status: "failed",
        error: message,
        clarificationQuestions: [],
      })
    }
  },

  stopAnalysis: async (action) => {
    const state = useRunStore.getState()
    if (!state.activeRunId || !state.activeIdeaId) {
      return null
    }

    const response = await agentService.stopAnalysis(state.activeRunId, action)

    if (response.status === "cancelled") {
      const cancellationEntry = buildCancellationEntry(action)
      set((current) => ({
        activeIdeaId: response.idea_id ?? current.activeIdeaId,
        activeRunId: response.agent_run_id ?? current.activeRunId,
        result: null,
        executionLog: getStableExecutionLog(current.executionLog, [
          ...current.executionLog,
          cancellationEntry,
        ]),
        status: "cancelled",
        error: "Analysis stopped by user.",
        rerunCount: 0,
        isConverged: false,
        clarificationQuestions: [],
      }))
    }

    return response
  },

  retrySection: async (runId, sectionKey) => {
    try {
      const startResponse = await agentService.retrySectionAnalysis(runId, sectionKey)

      if (startResponse.section_states) {
        set((current) => ({
          sectionStates: {
            ...current.sectionStates,
            ...startResponse.section_states,
          },
        }))
      }

      if (startResponse.status === "cooldown_active") {
        return
      }

      // Poll for section retry completion
      for (let attempt = 0; attempt < SECTION_RETRY_MAX_POLL_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, SECTION_RETRY_POLL_INTERVAL_MS))

        const poll = await agentService.getAnalysisStatus(runId)

        // Update section states from poll
        if (poll.section_states) {
          set((current) => ({
            sectionStates: {
              ...current.sectionStates,
              ...poll.section_states,
            },
          }))
        }

        // Update execution log
        set((current) => ({
          executionLog: getStableExecutionLog(
            current.executionLog,
            poll.execution_log,
          ),
        }))

        // Check if the section is no longer running
        const sectionState = poll.section_states?.[sectionKey]
        if (sectionState && sectionState.status !== "running") {
          // If retry succeeded and there's updated result data, refresh it
          if (poll.result) {
            set({
              result: poll.result,
              executionLog: poll.result.execution_log ?? [],
              sectionStates: poll.result.section_states ?? poll.section_states ?? {},
            })
          }
          return
        }
      }
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Section retry failed."
      console.error(`Section retry failed for ${sectionKey}:`, message)
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
      sectionStates: data.section_states ?? {},
      status: "completed",
      error: null,
      rerunCount: data.critique?.needs_rerun ? data.critique.rerun_tools.length : 0,
      isConverged: !data.critique?.needs_rerun,
      clarificationQuestions: [],
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
      sectionStates: {},
      status: "idle",
      error: null,
      rerunCount: 0,
      isConverged: false,
      clarificationQuestions: [],
    }),
}))
