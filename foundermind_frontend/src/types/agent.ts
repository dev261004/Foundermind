// /types/agent.ts

export type AgentStage =
  | "planning"
  | "executing"
  | "critic"
  | "rerun"
  | "final"

export interface StageStatusResponse {
  stage: AgentStage
  status: "running" | "completed" | "failed"
}

export interface ToolExecutionMetrics {
  tool: string
  duration_ms: number
  status: "success" | "failed"
  timestamp?: string
}

export interface AgentRunSummary {
  idea_id: string
  idea_type: string
  rerun_count: number
  is_converged: boolean
  total_duration_ms: number
}