// /lib/stateMachine/runStateMachine.ts

export type RunStage =
  | "idle"
  | "planning"
  | "executing"
  | "critic"
  | "rerun"
  | "final"
  | "failed"

export type RunEvent =
  | { type: "START" }
  | { type: "TO_EXECUTING" }
  | { type: "TO_CRITIC" }
  | { type: "RERUN_REQUIRED" }
  | { type: "COMPLETE" }
  | { type: "FAIL" }
  | { type: "RESET" }

interface MachineOptions {
  maxReruns?: number
}

export class RunStateMachine {
  private currentState: RunStage = "idle"
  private history: RunStage[] = []
  private rerunCount = 0
  private maxReruns: number

  constructor(options?: MachineOptions) {
    this.maxReruns = options?.maxReruns ?? 3
  }

  get state() {
    return this.currentState
  }

  get transitions() {
    return this.history
  }

  private transition(next: RunStage) {
    this.history.push(this.currentState)
    this.currentState = next
  }

  dispatch(event: RunEvent): RunStage {
    switch (this.currentState) {
      case "idle":
        if (event.type === "START") {
          this.transition("planning")
        }
        break

      case "planning":
        if (event.type === "TO_EXECUTING") {
          this.transition("executing")
        } else if (event.type === "FAIL") {
          this.transition("failed")
        }
        break

      case "executing":
        if (event.type === "TO_CRITIC") {
          this.transition("critic")
        } else if (event.type === "FAIL") {
          this.transition("failed")
        }
        break

      case "critic":
        if (event.type === "RERUN_REQUIRED") {
          if (this.rerunCount >= this.maxReruns) {
            this.transition("failed")
          } else {
            this.rerunCount++
            this.transition("rerun")
          }
        } else if (event.type === "COMPLETE") {
          this.transition("final")
        } else if (event.type === "FAIL") {
          this.transition("failed")
        }
        break

      case "rerun":
        if (event.type === "TO_EXECUTING") {
          this.transition("executing")
        } else if (event.type === "FAIL") {
          this.transition("failed")
        }
        break

      case "final":
      case "failed":
        if (event.type === "RESET") {
          this.currentState = "idle"
          this.history = []
          this.rerunCount = 0
        }
        break
    }

    return this.currentState
  }
}