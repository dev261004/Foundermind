// /lib/pollingManager.ts

import { fetchIdeaStatus, fetchIdeaResult } from "./api/ideaApi"
import { useIdeaStore } from "@/store/useIdeaStore"
import { useRunStore } from "@/store/useRunStore"
import { RunStateMachine } from "@/lib/stateMachine/runStateMachine"
import { AgentStage } from "@/types/agent"
import { RunStage } from "@/lib/stateMachine/runStateMachine"
import { Stage } from "@/store/useIdeaStore"
import { AgentAnalysisResponse } from "@/types/analysis"

type PollingState = "idle" | "running" | "stopped"

interface PollingConfig {
  intervalMs?: number
  timeoutMs?: number
  maxBackoffMs?: number
  maxReruns?: number
}

class PollingManager {
  private intervalMs: number
  private timeoutMs: number
  private maxBackoffMs: number

  private timer: NodeJS.Timeout | null = null
  private controller: AbortController | null = null

  private startTime = 0
  private state: PollingState = "idle"
  private currentBackoff: number

  private machine: RunStateMachine
private mapMachineStateToUIStage(state: RunStage): Stage {
  if (state === "idle") return null
  if (state === "failed") return "failed"

  return state
}
  constructor(config?: PollingConfig) {
    this.intervalMs = config?.intervalMs ?? 3000
    this.timeoutMs = config?.timeoutMs ?? 180000
    this.maxBackoffMs = config?.maxBackoffMs ?? 15000
    this.currentBackoff = this.intervalMs

    this.machine = new RunStateMachine({
      maxReruns: config?.maxReruns ?? 3,
    })
  }

  public start(ideaId: string) {
    this.stop()

    this.state = "running"
    this.startTime = Date.now()
    this.currentBackoff = this.intervalMs

    this.machine.dispatch({ type: "START" })
    useIdeaStore.getState().setStage("planning")

    this.poll(ideaId)
  }

  public stop() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.controller) {
      this.controller.abort()
      this.controller = null
    }

    this.state = "stopped"
  }

  private scheduleNext(ideaId: string) {
    this.timer = setTimeout(() => {
      this.poll(ideaId)
    }, this.currentBackoff)
  }

  private async poll(ideaId: string) {
    if (this.state !== "running") return

    const elapsed = Date.now() - this.startTime

    if (elapsed > this.timeoutMs) {
      this.fail()
      return
    }

    this.controller = new AbortController()

    try {
      const status = await fetchIdeaStatus(
        ideaId,
        this.controller.signal
      )

      this.handleStage(status.stage)

      if (status.status === "failed") {
        this.fail()
        return
      }

      if (status.status === "completed") {
        await this.complete(ideaId)
        return
      }

      this.applyBackoff(elapsed)
      this.scheduleNext(ideaId)

    } catch (error: any) {
      if (error.code === "ERR_CANCELED") return

      this.applyBackoff(elapsed)
      this.scheduleNext(ideaId)
    }
  }

  private handleStage(stage: AgentStage) {
    const { setStage } = useIdeaStore.getState()

    switch (stage) {
      case "planning":
        this.machine.dispatch({ type: "START" })
        break

      case "executing":
        this.machine.dispatch({ type: "TO_EXECUTING" })
        break

      case "critic":
        this.machine.dispatch({ type: "TO_CRITIC" })
        break

      case "rerun":
        const newState = this.machine.dispatch({
          type: "RERUN_REQUIRED",
        })

        if (newState === "rerun") {
          useRunStore.getState().incrementRerun()
        } else if (newState === "failed") {
          this.fail()
          return
        }
        break

      case "final":
        this.machine.dispatch({ type: "COMPLETE" })
        break
    }

    setStage(this.mapMachineStateToUIStage(this.machine.state))
  }

  private async complete(ideaId: string) {
    try {
      this.controller = new AbortController()

      const result = await fetchIdeaResult(
        ideaId,
        this.controller.signal
      )

      useRunStore.getState().setFullResult(
        ideaId,
        result as unknown as AgentAnalysisResponse
      )
      useIdeaStore.getState().setStatus("completed")

      this.stop()

    } catch (error: any) {
      if (error.code === "ERR_CANCELED") return
      this.scheduleNext(ideaId)
    }
  }

  private fail() {
    this.machine.dispatch({ type: "FAIL" })
    useIdeaStore.getState().setStatus("failed")
   const uiStage = this.mapMachineStateToUIStage(this.machine.state)
useIdeaStore.getState().setStage(uiStage)
    this.stop()
  }

  private applyBackoff(elapsed: number) {
    if (elapsed > 60000) {
      this.currentBackoff = Math.min(
        this.currentBackoff * 1.5,
        this.maxBackoffMs
      )
    }
  }
}

export const pollingManager = new PollingManager()
