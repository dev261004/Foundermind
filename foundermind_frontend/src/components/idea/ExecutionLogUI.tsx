"use client"

import React, { useEffect, useState } from "react"
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Circle,
  CircleDashed,
  Clock,
  Loader2,
  PauseCircle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react"
import type { StopAnalysisAction } from "@/app/services/agentService"
import { AgentExecutionLogEntry } from "@/types/analysis"

interface ExecutionLogUIProps {
  executionLog: AgentExecutionLogEntry[]
  runStatus:
    | "running"
    | "completed"
    | "error"
    | "awaiting_clarification"
    | "partial"
    | "quota_exhausted"
    | "idle"
    | "failed"
    | "cancelled"
  errorMessage?: string | null
  onRetry: () => void
  onStopAnalysis?: (action: StopAnalysisAction) => Promise<void>
  ideaTitle: string
  ideaType: string
}

type TimelineStatus = "running" | "completed" | "error" | "cancelled"

const STOP_OPTIONS: Array<{
  action: StopAnalysisAction
  title: string
  description: string
}> = [
  {
    action: "edit",
    title: "Edit description and rerun",
    description: "Stop this run, reopen the submit form, and let you revise the current title and description.",
  },
  {
    action: "new_idea",
    title: "I have a new idea",
    description: "Stop this run and go back to a clean submit form without deleting the current idea history.",
  },
  {
    action: "terminate",
    title: "Terminate completely",
    description: "Permanently delete the idea, its runs, and the saved analysis from the database.",
  },
]

function getNormalizedStatus(runStatus: ExecutionLogUIProps["runStatus"]): TimelineStatus {
  if (runStatus === "running" || runStatus === "idle") {
    return "running"
  }

  if (runStatus === "failed" || runStatus === "error") {
    return "error"
  }

  if (runStatus === "cancelled") {
    return "cancelled"
  }

  return "completed"
}

export function ExecutionLogUI({
  executionLog,
  runStatus,
  errorMessage,
  onRetry,
  onStopAnalysis,
  ideaTitle,
  ideaType,
}: ExecutionLogUIProps) {
  const normalizedStatus = getNormalizedStatus(runStatus)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [retryCooldown, setRetryCooldown] = useState(0)
  const [hasRetried, setHasRetried] = useState(false)
  const [isStopModalOpen, setIsStopModalOpen] = useState(false)
  const [confirmTerminate, setConfirmTerminate] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)
  const [pendingStopAction, setPendingStopAction] = useState<StopAnalysisAction | null>(null)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (normalizedStatus === "running") {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [normalizedStatus])

  useEffect(() => {
    if (normalizedStatus === "error" && hasRetried) {
      setRetryCooldown(60)
    }
  }, [normalizedStatus, hasRetried])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (retryCooldown > 0) {
      interval = setInterval(() => {
        setRetryCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [retryCooldown])

  const handleRetryClick = () => {
    setHasRetried(true)
    setElapsedSeconds(0)
    onRetry()
  }

  const handleOpenStopModal = () => {
    setStopError(null)
    setConfirmTerminate(false)
    setIsStopModalOpen(true)
  }

  const handleStopAction = async (action: StopAnalysisAction) => {
    if (!onStopAnalysis) {
      return
    }

    if (action === "terminate" && !confirmTerminate) {
      setConfirmTerminate(true)
      return
    }

    try {
      setPendingStopAction(action)
      setStopError(null)
      await onStopAnalysis(action)
      setIsStopModalOpen(false)
      setConfirmTerminate(false)
    } catch (error) {
      setStopError(
        (error as { message?: string })?.message ??
          "Unable to stop the analysis right now. Please try again."
      )
    } finally {
      setPendingStopAction(null)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return `${minutes}:${remainder.toString().padStart(2, "0")}`
  }

  const timelineEvents = executionLog.map((entry, index) => {
    let title = "Agent Event"
    if (entry.type === "quality_check") title = "Quality Check"
    else if (entry.type === "idea_refinement") title = "Idea Refinement"
    else if (entry.type === "idea_classification") title = "Idea Classification"
    else if (entry.type === "self_healing_cycle") title = `Self-healing Cycle ${entry.iteration ?? ""}`.trim()
    else if (entry.type === "convergence") title = "Convergence Decision"
    else if (entry.type === "user_cancelled") title = "Analysis Stopped"
    else if (entry.agent) title = entry.agent.replace(/_/g, " ").replace(/\b\w/g, (value) => value.toUpperCase())
    else if (entry.tool) title = entry.tool.replace(/_/g, " ").replace(/\b\w/g, (value) => value.toUpperCase())

    let description = entry.message || "Executing task..."

    if (entry.type === "idea_classification") {
      description = `Classified as ${entry.idea_type ?? "general"} using ${entry.classification_source ?? "unknown"} with confidence ${((entry.classification_confidence ?? 0) * 100).toFixed(0)}%.`
    } else if (entry.type === "quality_check") {
      const score = entry.quality_score ?? 0
      const missing = entry.missing_signals ?? []
      description =
        entry.status === "awaiting_clarification"
          ? `Quality score ${score}/4 — below threshold. Missing: ${missing.join(", ") || "none"}. Requesting user clarification.`
          : `Quality score ${score}/4 — sufficient for analysis.`
    } else if (entry.type === "idea_refinement") {
      description = `Description refined from ${entry.original_length ?? 0} to ${entry.refined_length ?? 0} characters.`
    } else if (entry.type === "self_healing_cycle") {
      description = `Critic requested another pass using ${entry.rerun_tools?.map((tool) => tool.replace(/_/g, " ")).join(", ") || "no tools"}.`
    } else if (entry.type === "convergence") {
      description = entry.reason ?? "The orchestrator decided no further iterations were needed."
    } else if (entry.type === "user_cancelled") {
      description = entry.message ?? "Analysis stopped by user."
    } else if (entry.agent && entry.error) {
      description = `${entry.agent.replace(/_/g, " ")} failed: ${entry.error}`
    } else if (entry.tool) {
      if (entry.status === "skipped") {
        description = entry.message ?? `Skipping ${entry.tool.replace(/_/g, " ")} because an existing checkpoint was reused.`
      } else if (entry.error) {
        description = `Failed while executing ${entry.tool.replace(/_/g, " ")}: ${entry.error}`
      } else {
        description = entry.message ?? `Successfully executed ${entry.tool.replace(/_/g, " ")}.`
      }
    }

    const finishedStatuses = new Set(["completed", "success", "failed", "skipped", "cancelled", "awaiting_clarification"])
    const isCompleted =
      normalizedStatus === "completed" ||
      normalizedStatus === "cancelled" ||
      index < executionLog.length - 1 ||
      finishedStatuses.has(entry.status ?? "")

    return {
      id: index,
      title,
      description,
      isCompleted,
      score: entry.average_score ?? entry.quality_score,
    }
  })

  const latestCancelledAction = [...executionLog]
    .reverse()
    .find((entry) => entry.type === "user_cancelled")
    ?.action

  const statusHeading =
    normalizedStatus === "error"
      ? "Analysis failed"
      : normalizedStatus === "cancelled"
        ? "Analysis stopped"
        : "Running startup analysis..."

  const statusBody =
    normalizedStatus === "error"
      ? errorMessage || "An unexpected error or timeout occurred while gathering data. Review the logs below before retrying."
      : normalizedStatus === "cancelled"
        ? "This run was intentionally stopped. You can edit the description, start a different idea, or review the saved timeline below."
        : "Our AI agents are actively researching the market, analyzing competitors, and evaluating your idea. Watch the live progress below."

  const logIdeaType = executionLog.find(e => e.type === "idea_classification" && e.idea_type)?.idea_type;
  const resolvedIdeaType = (ideaType && ideaType.toLowerCase() !== "pending" && ideaType !== "Unknown") 
    ? ideaType 
    : logIdeaType;

  return (
    <div className="relative w-full pb-12 font-sans text-zinc-300 selection:bg-indigo-500/30">
      <div className="pointer-events-none sticky inset-x-0 top-4 z-50 mb-12 flex justify-center sm:top-6">
        <header className="pointer-events-auto relative flex h-14 w-[calc(100%-32px)] max-w-[1180px] items-center justify-between overflow-hidden rounded-full border border-white/[0.08] bg-[#1c1c1f]/80 px-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-emerald-500/10" />

          <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2 pl-2 pr-4 sm:gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/20 sm:h-8 sm:w-8">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 sm:h-4 sm:w-4" />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex-shrink-0 text-sm font-bold tracking-tight text-white">Foundermind</span>
              <span className="hidden flex-shrink-0 font-light text-zinc-600 sm:block">/</span>
              <span className="hidden truncate text-sm font-medium text-zinc-300 sm:block" title={ideaTitle}>
                {ideaTitle}
              </span>
            </div>
          </div>

          <div className="relative z-10 hidden flex-shrink-0 items-center justify-center md:flex">
            {normalizedStatus === "completed" && (
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span className="whitespace-nowrap text-[11px] font-medium text-emerald-400">Analysis Complete</span>
              </div>
            )}
            {normalizedStatus === "error" && (
              <div className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="whitespace-nowrap text-[11px] font-medium text-red-400">Analysis Failed</span>
              </div>
            )}
            {normalizedStatus === "cancelled" && (
              <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5">
                <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
                <span className="whitespace-nowrap text-[11px] font-medium text-amber-300">Analysis Stopped</span>
              </div>
            )}
            {normalizedStatus === "running" && (
              <div className="flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="whitespace-nowrap text-[11px] font-medium text-emerald-400">Analysis running...</span>
              </div>
            )}
          </div>

          <div className="relative z-10 flex flex-1 flex-shrink-0 items-center justify-end gap-3 pr-1">
            <div className="mr-1 hidden flex-col items-end lg:flex">
              <span className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-white">Idea Type</span>
              {resolvedIdeaType ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                  <span className="max-w-[120px] truncate text-xs font-medium leading-none text-zinc-300">
                    {resolvedIdeaType.charAt(0).toUpperCase() + resolvedIdeaType.slice(1)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 opacity-70">
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-indigo-400" />
                  <span className="text-[10px] font-mono leading-none text-zinc-400">Generating...</span>
                </div>
              )}
            </div>

            {normalizedStatus === "running" && onStopAnalysis && (
              <button
                type="button"
                onClick={handleOpenStopModal}
                className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold whitespace-nowrap text-zinc-200 transition-colors hover:bg-white/10"
              >
                <PauseCircle className="h-4 w-4" />
                Stop analysis
              </button>
            )}

            <a
              href="/dashboard/ideas"
              className="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold whitespace-nowrap text-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-colors hover:bg-zinc-200"
            >
              Idea History
            </a>
          </div>
        </header>
      </div>

      <div className="relative z-10 mx-auto w-[calc(100%-32px)] max-w-[1180px]">
        {normalizedStatus !== "completed" && (
          <div className="mb-12">
            <h1 className="flex items-center gap-4 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
              {normalizedStatus === "error" && <AlertCircle className="h-8 w-8 text-red-500" />}
              {normalizedStatus === "cancelled" && <PauseCircle className="h-8 w-8 text-amber-400" />}
              {normalizedStatus === "running" && <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />}
              {statusHeading}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">{statusBody}</p>
            {normalizedStatus === "error" && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetryClick}
                  disabled={retryCooldown > 0}
                  className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {retryCooldown > 0 ? <Clock className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                  {retryCooldown > 0 ? `Retry in ${retryCooldown}s` : "Retry Analysis"}
                </button>
              </div>
            )}
            {normalizedStatus === "cancelled" && latestCancelledAction === "new_idea" && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetryClick}
                  className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-600"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry analysis from saved progress
                </button>
              </div>
            )}
          </div>
        )}

        <details
          className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0e]/90 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          open
        >
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-indigo-500/[0.02] to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 top-0 z-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

          <summary className="relative z-10 flex cursor-pointer select-none items-center justify-between border-b border-white/[0.05] bg-white/[0.01] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tracking-tight text-zinc-200">Execution Logs</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  {timelineEvents.length} steps
                </span>
                <div className="flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-mono font-medium tracking-wide text-indigo-300">
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {normalizedStatus === "completed" && <span className="text-[10px] font-mono tracking-widest text-emerald-500/80">● COMPLETED</span>}
              {normalizedStatus === "error" && <span className="text-[10px] font-mono tracking-widest text-red-500">● FAILED</span>}
              {normalizedStatus === "cancelled" && <span className="text-[10px] font-mono tracking-widest text-amber-400">● CANCELLED</span>}
              {normalizedStatus === "running" && (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-emerald-500">LIVE RUNNING</span>
                </div>
              )}
              <ChevronDown className="ml-2 h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
            </div>
          </summary>

          <div className="relative z-10 max-h-[500px] overflow-y-auto p-6 no-scrollbar sm:p-8">
            <div className="relative ml-3.5 space-y-8 border-l border-zinc-800/60 sm:space-y-10">
              {timelineEvents.length === 0 && (
                <div className="relative pl-8 text-[13px] font-mono text-zinc-500">
                  Waiting for the backend to persist the first execution event.
                </div>
              )}

              {timelineEvents.map((event, index) => {
                const isCompleted = event.isCompleted
                const isLastStarted = !isCompleted && (index === 0 || timelineEvents[index - 1]?.isCompleted)
                const isPending = !isCompleted && !isLastStarted

                return (
                  <div key={event.id} className="group relative pl-8">
                    <span className="absolute left-[-13px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-[4px] border-[#0c0c0e] bg-[#0c0c0e] shadow-[0_0_0_2px_#0c0c0e]">
                      {isCompleted ? (
                        <CheckCircle className="h-full w-full text-zinc-600" />
                      ) : isLastStarted ? (
                        <CircleDashed className="h-full w-full animate-[spin_3s_linear_infinite] text-indigo-500" />
                      ) : (
                        <Circle className="h-full w-full text-zinc-800" />
                      )}
                    </span>

                    <div className="mt-[-4px] flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className={isPending ? "opacity-50" : "opacity-100"}>
                        <div className="mb-1.5 flex items-center gap-3">
                          <h4 className={`text-sm font-medium ${isCompleted ? "text-zinc-300" : isLastStarted ? "text-indigo-400" : "text-zinc-500"}`}>
                            {event.title}
                          </h4>
                          {isLastStarted && (
                            <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-indigo-400">
                              Running
                            </span>
                          )}
                          {event.score !== undefined && (
                            <span className="rounded border border-zinc-700/50 bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-zinc-400">
                              Score: {event.score}
                            </span>
                          )}
                        </div>
                        <p className={`mt-1 text-[13px] font-mono leading-relaxed ${isLastStarted ? "text-zinc-400" : "text-zinc-500"}`}>
                          {event.description}
                        </p>
                      </div>
                      <div className="mt-0 flex items-center gap-2 opacity-40">
                        <span className="text-[10px] font-mono text-zinc-500">
                          step_{String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {normalizedStatus === "error" && (
                <div className="relative pl-8 pt-2">
                  <span className="absolute left-[-13px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-[4px] border-[#0c0c0e] bg-[#0c0c0e] shadow-[0_0_0_2px_#0c0c0e]">
                    <AlertCircle className="h-full w-full text-red-500" />
                  </span>
                  <div className="mt-[-4px] flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="relative w-full overflow-hidden rounded-xl border border-red-500/10 bg-red-500/5 p-4">
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent blur-xl" />
                      <div className="relative mb-1.5 flex items-center gap-2">
                        <h4 className="text-sm font-medium text-red-400">Execution Error</h4>
                        <span className="rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-red-400">
                          Failed
                        </span>
                      </div>
                      <p className="relative mt-1 text-[13px] font-mono leading-relaxed text-red-400/80">
                        {errorMessage || "Process terminated unexpectedly."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </details>
      </div>

      {isStopModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => {
              if (!pendingStopAction) {
                setIsStopModalOpen(false)
                setConfirmTerminate(false)
                setStopError(null)
              }
            }}
          />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#101115] p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  <PauseCircle className="h-3.5 w-3.5" />
                  Stop Analysis
                </span>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                  What would you like to do with this run?
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
                  We’ll stop the active pipeline cooperatively, keep the UI aligned with that choice, and then follow the branch you select below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!pendingStopAction) {
                    setIsStopModalOpen(false)
                    setConfirmTerminate(false)
                    setStopError(null)
                  }
                }}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                disabled={Boolean(pendingStopAction)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {STOP_OPTIONS.map((option) => {
                const isTerminate = option.action === "terminate"
                const isPending = pendingStopAction === option.action
                const label =
                  isTerminate && confirmTerminate
                    ? "Confirm terminate completely"
                    : option.title

                return (
                  <button
                    key={option.action}
                    type="button"
                    onClick={() => void handleStopAction(option.action)}
                    disabled={Boolean(pendingStopAction)}
                    className={`w-full rounded-2xl border p-5 text-left transition-all ${
                      isTerminate
                        ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40 hover:bg-red-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-indigo-500/30 hover:bg-indigo-500/[0.05]"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className={`text-base font-semibold ${isTerminate ? "text-red-200" : "text-white"}`}>
                          {label}
                        </h4>
                        <p className={`mt-2 text-sm leading-relaxed ${isTerminate ? "text-red-200/75" : "text-zinc-400"}`}>
                          {option.description}
                        </p>
                        {isTerminate && confirmTerminate && (
                          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                            This permanently deletes the idea and all related analysis data.
                          </p>
                        )}
                      </div>
                      {isPending ? (
                        <Loader2 className="mt-1 h-5 w-5 animate-spin text-white" />
                      ) : (
                        <PauseCircle className={`mt-1 h-5 w-5 ${isTerminate ? "text-red-300" : "text-indigo-300"}`} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {stopError && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {stopError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
